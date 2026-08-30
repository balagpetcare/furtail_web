export interface UploadSessionData {
  localUploadId: string;
  mediaId: number | null;
  sessionId: string | null;
  filename: string;
  mimeType: string;
  totalSize: number;
  uploadedBytes: number;
  partSize: number;
  totalParts: number;
  uploadedParts: Set<number>;
  status: 'PREPARING' | 'UPLOADING' | 'PROCESSING' | 'PLAYABLE' | 'READY' | 'FAILED';
  progress: number; // 0-100
  error?: string;
  retryCount: number;
  createdAt: number;
  lastActivityAt: number;
}

interface UploadManagerState {
  sessions: Map<string, UploadSessionData>;
  activeListeners: Set<() => void>;
}

const DB_NAME = 'FurtailUploads';
const DB_VERSION = 1;
const STORE_NAME = 'uploadSessions';

let uploadManagerState: UploadManagerState = {
  sessions: new Map(),
  activeListeners: new Set(),
};

// Initialize IndexedDB
async function initializeDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localUploadId' });
      }
    };
  });
}

async function loadSessionsFromDB(): Promise<void> {
  try {
    const db = await initializeDatabase();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const sessions = await new Promise<UploadSessionData[]>((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const items = request.result as any[];
        resolve(
          items.map((item) => ({
            ...item,
            uploadedParts: new Set(item.uploadedParts || []),
          })),
        );
      };
    });

    uploadManagerState.sessions.clear();
    sessions.forEach((session) => {
      uploadManagerState.sessions.set(session.localUploadId, session);
    });
  } catch (error) {
    console.warn('Failed to load upload sessions from IndexedDB:', error);
  }
}

async function saveSessionToDB(session: UploadSessionData): Promise<void> {
  try {
    const db = await initializeDatabase();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const sessionData = {
      ...session,
      uploadedParts: Array.from(session.uploadedParts),
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(sessionData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to save upload session to IndexedDB:', error);
  }
}

async function deleteSessionFromDB(localUploadId: string): Promise<void> {
  try {
    const db = await initializeDatabase();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(localUploadId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to delete upload session from IndexedDB:', error);
  }
}

export class UploadManager {
  private static instance: UploadManager | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): UploadManager {
    if (!UploadManager.instance) {
      UploadManager.instance = new UploadManager();
    }
    return UploadManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await loadSessionsFromDB();
    this.initialized = true;
  }

  createSession(file: File): UploadSessionData {
    const session: UploadSessionData = {
      localUploadId: crypto.randomUUID(),
      mediaId: null,
      sessionId: null,
      filename: file.name,
      mimeType: file.type,
      totalSize: file.size,
      uploadedBytes: 0,
      partSize: 0,
      totalParts: 0,
      uploadedParts: new Set(),
      status: 'PREPARING',
      progress: 0,
      retryCount: 0,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    uploadManagerState.sessions.set(session.localUploadId, session);
    saveSessionToDB(session).catch((err) => console.error('Failed to save session:', err));
    this.notifyListeners();

    return session;
  }

  getSession(localUploadId: string): UploadSessionData | undefined {
    return uploadManagerState.sessions.get(localUploadId);
  }

  getAllSessions(): UploadSessionData[] {
    return Array.from(uploadManagerState.sessions.values());
  }

  updateSession(localUploadId: string, updates: Partial<UploadSessionData>): void {
    const session = uploadManagerState.sessions.get(localUploadId);
    if (!session) return;

    // Only notify subscribers when something observable actually changed.
    // Otherwise repeated identical progress/status updates (e.g. progress
    // pinned at 100 while PROCESSING) would spam listeners with fresh
    // snapshots and cause useless re-renders.
    const meaningfulChange =
      (updates.status !== undefined && updates.status !== session.status) ||
      (updates.progress !== undefined && updates.progress !== session.progress) ||
      (updates.uploadedBytes !== undefined && updates.uploadedBytes !== session.uploadedBytes) ||
      (updates.error !== undefined && updates.error !== session.error) ||
      (updates.mediaId !== undefined && updates.mediaId !== session.mediaId) ||
      (updates.sessionId !== undefined && updates.sessionId !== session.sessionId) ||
      (updates.totalParts !== undefined && updates.totalParts !== session.totalParts) ||
      (updates.partSize !== undefined && updates.partSize !== session.partSize);

    Object.assign(session, {
      ...updates,
      lastActivityAt: Date.now(),
    });

    saveSessionToDB(session).catch((err) => console.error('Failed to update session:', err));

    if (meaningfulChange) {
      this.notifyListeners();
    }
  }

  removeSession(localUploadId: string): void {
    uploadManagerState.sessions.delete(localUploadId);
    deleteSessionFromDB(localUploadId).catch((err) => console.error('Failed to delete session:', err));
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    uploadManagerState.activeListeners.add(listener);
    return () => {
      uploadManagerState.activeListeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    uploadManagerState.activeListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in upload manager listener:', err);
      }
    });
  }

  clear(): void {
    uploadManagerState.sessions.clear();
    this.notifyListeners();
  }
}
