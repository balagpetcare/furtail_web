import { useEffect, useState, useCallback } from 'react';
import { UploadManager, type UploadSessionData } from '@/lib/upload-manager';

export function useUploadManager() {
  const [sessions, setSessions] = useState<UploadSessionData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const manager = UploadManager.getInstance();
    let isMounted = true;

    manager.initialize().then(() => {
      if (isMounted) {
        setSessions([...manager.getAllSessions()]);
        setIsInitialized(true);
      }
    });

    const unsubscribe = manager.subscribe(() => {
      if (isMounted) {
        setSessions([...manager.getAllSessions()]);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const getSession = useCallback((localUploadId: string) => {
    return UploadManager.getInstance().getSession(localUploadId);
  }, []);

  const removeSession = useCallback((localUploadId: string) => {
    UploadManager.getInstance().removeSession(localUploadId);
  }, []);

  return {
    sessions,
    isInitialized,
    getSession,
    removeSession,
  };
}
