import { UploadManager } from './upload-manager';

export interface InitUploadResponse {
  mediaId: number;
  sessionId: string;
  partSize: number;
  totalParts: number;
  expiresAt: string;
}

export interface UploadPartResponse {
  partNumber: number;
  partSize: number;
  progress: number;
}

export interface UploadStatusResponse {
  mediaId: number;
  sessionId: string;
  totalSize: number;
  totalParts: number;
  receivedParts: number[];
  completedParts: number[];
  missingParts: number[];
  uploadedBytes: number;
  progress: number;
  parts: Array<{
    partNumber: number;
    partSize: number;
    received: boolean;
  }>;
}

export interface CompleteUploadResponse {
  id: number;
  url: string;
  hlsUrl?: string;
  type: 'VIDEO' | 'IMAGE' | 'FILE';
  status: string;
  thumbnailUrl?: string | null;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MAX_CONCURRENT_PARTS = 3;
const MAX_FINALIZE_ROUNDS = 3;

function exponentialBackoff(attempt: number): number {
  return RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 1000;
}

export class ChunkedUploader {
  private uploadManager = UploadManager.getInstance();
  private activeUploads = new Map<string, AbortController>();

  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<CompleteUploadResponse> {
    const session = this.uploadManager.createSession(file);

    try {
      // Initialize upload session on server
      const initResponse = await this.initializeUpload(file);
      this.uploadManager.updateSession(session.localUploadId, {
        mediaId: initResponse.mediaId,
        sessionId: initResponse.sessionId,
        partSize: initResponse.partSize,
        totalParts: initResponse.totalParts,
        status: 'UPLOADING',
      });

      // Upload all parts
      const fileBuffer = await file.arrayBuffer();
      await this.uploadParts(
        file,
        fileBuffer,
        session.localUploadId,
        initResponse.sessionId,
        initResponse.partSize,
        onProgress,
      );

      // Pre-COMPLETE server status barrier: only proceed to finalize once the
      // server authoritatively confirms every expected part is complete.
      await this.recoverMissingParts(
        session.localUploadId,
        initResponse.sessionId,
        fileBuffer,
        initResponse.partSize,
      );

      // Finalize upload
      this.uploadManager.updateSession(session.localUploadId, {
        status: 'PROCESSING',
        progress: 100,
      });

      const completeResponse = await this.completeUpload(
        initResponse.sessionId,
        fileBuffer,
        session.localUploadId,
        initResponse.partSize,
      );

      this.uploadManager.updateSession(session.localUploadId, {
        status: 'PLAYABLE',
      });

      return completeResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.uploadManager.updateSession(session.localUploadId, {
        status: 'FAILED',
        error: errorMessage,
      });
      throw error;
    }
  }

  private async initializeUpload(file: File): Promise<InitUploadResponse> {
    const response = await fetch('/api/proxy/media/uploads/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        totalSize: file.size,
        purpose: 'post',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize upload: ${response.statusText}`);
    }

    const data = (await response.json()) as { data: InitUploadResponse };
    return data.data;
  }

  private async uploadParts(
    file: File,
    fileBuffer: ArrayBuffer,
    localUploadId: string,
    sessionId: string,
    partSize: number,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    const totalBytes = fileBuffer.byteLength;
    const totalParts = Math.ceil(totalBytes / partSize);
    const uploadedParts = new Set<number>();
    const partProgress: Record<number, number> = {};

    const abortController = new AbortController();
    this.activeUploads.set(localUploadId, abortController);

    const reportProgress = () => {
      let activeBytes = 0;
      for (const loaded of Object.values(partProgress)) {
        activeBytes += loaded;
      }
      const progress = totalBytes > 0 ? Math.round((activeBytes / totalBytes) * 100) : 0;
      const finalProgress = Math.min(progress, 100);
      this.uploadManager.updateSession(localUploadId, {
        uploadedParts,
        uploadedBytes: activeBytes,
        progress: finalProgress,
      });
      if (onProgress) {
        onProgress(finalProgress);
      }
    };

    try {
      const parts = Array.from({ length: totalParts }, (_, i) => i + 1);
      let nextIndex = 0;

      const worker = async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= parts.length) return;

          const partNumber = parts[index];
          if (!partNumber) continue;
          
          const startIdx = (partNumber - 1) * partSize;
          const endIdx = Math.min(startIdx + partSize, totalBytes);
          const partBuffer = fileBuffer.slice(startIdx, endIdx);

          partProgress[partNumber] = 0;

          const partBytes = await this.uploadPartWithRetry(
            sessionId,
            partNumber,
            partBuffer,
            localUploadId,
            (loaded) => {
              partProgress[partNumber] = loaded;
              reportProgress();
            },
            abortController,
          );

          partProgress[partNumber] = partBytes;
          uploadedParts.add(partNumber);
          reportProgress();
        }
      };

      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT_PARTS, parts.length) },
        () => worker()
      );

      await Promise.all(workers);

      // Verify all parts actually completed
      if (uploadedParts.size !== totalParts) {
        throw new Error(`Upload incomplete: ${uploadedParts.size}/${totalParts} parts finished.`);
      }

      console.log('UPLOAD_ALL_PARTS_FINISHED', {
        sessionId,
        expectedParts: totalParts,
        successfulParts: uploadedParts.size,
        uploadedBytes: totalBytes,
        totalBytes,
      });
    } finally {
      this.activeUploads.delete(localUploadId);
    }
  }

  private async uploadPartWithRetry(
    sessionId: string,
    partNumber: number,
    buffer: ArrayBuffer,
    localUploadId: string,
    onPartProgress?: (loaded: number) => void,
    abortController?: AbortController,
  ): Promise<number> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      let handleAbort: (() => void) | null = null;
      try {
        if (abortController?.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const xhr = new XMLHttpRequest();
        handleAbort = () => {
          xhr.abort();
        };

        if (abortController?.signal) {
          abortController.signal.addEventListener('abort', handleAbort);
        }

        const promise = new Promise<number>((resolve, reject) => {
          xhr.open('POST', `/api/proxy/media/uploads/${sessionId}/part/${partNumber}`);
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');

          if (xhr.upload && onPartProgress) {
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                onPartProgress(event.loaded);
              }
            };
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(buffer.byteLength);
            } else {
              reject(new Error(`Part upload failed: ${xhr.statusText || xhr.status}`));
            }
          };

          xhr.onerror = () => {
            reject(new Error('Network error during part upload'));
          };

          xhr.send(buffer);
        });

        const partBytes = await promise;
        if (abortController?.signal && handleAbort) {
          abortController.signal.removeEventListener('abort', handleAbort);
        }
        return partBytes;
      } catch (error) {
        if (abortController?.signal && handleAbort) {
          abortController.signal.removeEventListener('abort', handleAbort);
        }
        lastError = error instanceof Error ? error : new Error(String(error));

        if (abortController?.signal.aborted) {
          throw lastError;
        }

        if (attempt < MAX_RETRIES) {
          if (onPartProgress) {
            onPartProgress(0);
          }
          const delay = exponentialBackoff(attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          this.uploadManager.updateSession(localUploadId, {
            retryCount: attempt,
          });
        }
      }
    }

    throw lastError || new Error(`Failed to upload part ${partNumber}`);
  }

  /**
   * Defense-in-depth pre-COMPLETE barrier. Queries the authoritative server
   * status; if any part is missing, re-uploads ONLY those parts (never the
   * already-complete ones), then re-checks. Bounded by MAX_FINALIZE_ROUNDS.
   */
  private async recoverMissingParts(
    localUploadId: string,
    sessionId: string,
    fileBuffer: ArrayBuffer,
    partSize: number,
  ): Promise<void> {
    for (let round = 1; round <= MAX_FINALIZE_ROUNDS; round++) {
      const status = await this.getUploadStatus(sessionId);
      if (status.missingParts.length === 0) {
        return;
      }

      console.log('UPLOAD_RECOVERING_MISSING_PARTS', {
        sessionId,
        round,
        missingParts: status.missingParts,
      });

      await this.uploadSpecificParts(
        sessionId,
        fileBuffer,
        partSize,
        status.missingParts,
        localUploadId,
      );
    }

    const finalStatus = await this.getUploadStatus(sessionId);
    if (finalStatus.missingParts.length > 0) {
      throw new Error(
        `Upload incomplete on server: missing parts ${finalStatus.missingParts.join(', ')}`,
      );
    }
  }

  /** Uploads only the given part numbers (sequential, retried). */
  private async uploadSpecificParts(
    sessionId: string,
    fileBuffer: ArrayBuffer,
    partSize: number,
    partNumbers: number[],
    localUploadId: string,
  ): Promise<void> {
    const abortController = new AbortController();
    this.activeUploads.set(localUploadId, abortController);
    try {
      for (const partNumber of partNumbers) {
        const startIdx = (partNumber - 1) * partSize;
        const endIdx = Math.min(startIdx + partSize, fileBuffer.byteLength);
        const partBuffer = fileBuffer.slice(startIdx, endIdx);
        await this.uploadPartWithRetry(
          sessionId,
          partNumber,
          partBuffer,
          localUploadId,
          undefined,
          abortController,
        );
      }
    } finally {
      this.activeUploads.delete(localUploadId);
    }
  }

  private async completeUpload(
    sessionId: string,
    fileBuffer: ArrayBuffer,
    localUploadId: string,
    partSize: number,
  ): Promise<CompleteUploadResponse> {
    for (let attempt = 1; attempt <= MAX_FINALIZE_ROUNDS; attempt++) {
      const response = await fetch(`/api/proxy/media/uploads/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = (await response.json()) as { data: CompleteUploadResponse };
        return data.data;
      }

      let missingParts: number[] = [];
      try {
        const body = (await response.json()) as {
          error?: { code?: string; details?: { missingParts?: number[] }; missingParts?: number[] };
        };
        const err = body?.error;
        if (err?.code === 'UPLOAD_INCOMPLETE') {
          const list = err?.details?.missingParts ?? err?.missingParts;
          if (Array.isArray(list)) {
            missingParts = list;
          }
        }
      } catch {
        // non-JSON error body — treat as terminal
      }

      // Server reports the upload incomplete: upload only the missing parts
      // and retry COMPLETE. A 409 with a parseable missing-parts list is the
      // recoverable path; anything else is terminal.
      if (response.status === 409 && missingParts.length > 0) {
        console.log('UPLOAD_COMPLETE_INCOMPLETE_RECOVERING', {
          sessionId,
          attempt,
          missingParts,
        });
        await this.uploadSpecificParts(
          sessionId,
          fileBuffer,
          partSize,
          missingParts,
          localUploadId,
        );
        continue;
      }

      throw new Error(`Failed to complete upload: ${response.statusText || response.status}`);
    }

    throw new Error('Failed to complete upload after retries');
  }

  async getUploadStatus(sessionId: string): Promise<UploadStatusResponse> {
    const response = await fetch(`/api/proxy/media/uploads/${sessionId}/status`);

    if (!response.ok) {
      throw new Error(`Failed to get upload status: ${response.statusText}`);
    }

    const data = (await response.json()) as { data: UploadStatusResponse };
    return data.data;
  }

  cancelUpload(localUploadId: string): void {
    const abortController = this.activeUploads.get(localUploadId);
    if (abortController) {
      abortController.abort();
      this.activeUploads.delete(localUploadId);
    }
  }
}
