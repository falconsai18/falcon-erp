import { useState, useEffect, useCallback, useRef } from 'react';
import { syncQueueInBackground, getSyncStatus, triggerManualSync } from '../lib/offline/syncQueue';
import { useOffline } from './useOffline';

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  error: string | null;
}

export function useSync() {
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    error: null
  });

  const { isOnline } = useOffline();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update sync status
  const updateStatus = useCallback(async () => {
    try {
      const status = await getSyncStatus();
      setState(prev => ({
        ...prev,
        pendingCount: status.pending,
        isSyncing: status.isSyncing
      }));
    } catch (error) {
      console.error('[useSync] Failed to get status:', error);
    }
  }, []);

  // Trigger manual sync
  const sync = useCallback(async (): Promise<boolean> => {
    if (!isOnline) {
      setState(prev => ({ ...prev, error: 'Cannot sync while offline' }));
      return false;
    }

    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const result = await triggerManualSync();
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        pendingCount: result.failed,
        lastSyncTime: new Date(),
        error: result.failed > 0 ? `${result.failed} items failed to sync` : null
      }));

      return result.success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      }));
      return false;
    }
  }, [isOnline]);

  // Background sync when coming online
  useEffect(() => {
    if (isOnline && state.pendingCount > 0) {
      syncQueueInBackground().then(() => {
        updateStatus();
      });
    }
  }, [isOnline, state.pendingCount, updateStatus]);

  // Periodic status updates
  useEffect(() => {
    updateStatus();

    syncIntervalRef.current = setInterval(() => {
      updateStatus();
    }, 5000); // Update every 5 seconds

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [updateStatus]);

  return {
    ...state,
    sync,
    refresh: updateStatus
  };
}

// Hook for optimistic updates
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>
) {
  const [data, setData] = useState<T>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimisticUpdate = useCallback(async (
    optimisticData: T,
    actualUpdate: () => Promise<T>
  ): Promise<boolean> => {
    const previousData = data;
    
    // Optimistically update UI
    setData(optimisticData);
    setIsUpdating(true);
    setError(null);

    try {
      const result = await actualUpdate();
      setData(result);
      setIsUpdating(false);
      return true;
    } catch (err) {
      // Rollback on error
      setData(previousData);
      setError(err instanceof Error ? err.message : 'Update failed');
      setIsUpdating(false);
      return false;
    }
  }, [data]);

  return {
    data,
    isUpdating,
    error,
    optimisticUpdate,
    setData
  };
}

// Hook for sync progress
export function useSyncProgress() {
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    percentage: 0
  });

  const updateProgress = useCallback((completed: number, total: number) => {
    setProgress({
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({ completed: 0, total: 0, percentage: 0 });
  }, []);

  return {
    progress,
    updateProgress,
    resetProgress
  };
}