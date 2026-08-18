/**
 * Tracks the lifetime of local blob: preview URLs independent of React
 * re-renders. Revocation happens ONLY when a caller explicitly calls
 * revoke()/revokeAll() — never as a side effect of anything else changing.
 *
 * This exists because the original composer bug was an effect keyed on
 * `draft.media`, whose cleanup revoked every blob URL in the PREVIOUS
 * render's media list on every status transition (LOCAL -> UPLOADING ->
 * READY), killing previews the UI was still displaying. A tracker with an
 * explicit, narrow API makes that class of bug impossible to reintroduce
 * by accident — there is no dependency array to get wrong.
 */
export interface PreviewUrlTracker {
  create(file: File): string;
  revoke(url: string): void;
  revokeAll(): void;
  isActive(url: string): boolean;
  size(): number;
}

export function createPreviewUrlTracker(
  createObjectURL: (file: File) => string = (file) => URL.createObjectURL(file),
  revokeObjectURL: (url: string) => void = (url) => URL.revokeObjectURL(url),
): PreviewUrlTracker {
  const active = new Set<string>();

  return {
    create(file: File): string {
      const url = createObjectURL(file);
      active.add(url);
      return url;
    },
    revoke(url: string): void {
      if (active.has(url)) {
        revokeObjectURL(url);
        active.delete(url);
      }
    },
    revokeAll(): void {
      active.forEach((url) => revokeObjectURL(url));
      active.clear();
    },
    isActive(url: string): boolean {
      return active.has(url);
    },
    size(): number {
      return active.size;
    },
  };
}
