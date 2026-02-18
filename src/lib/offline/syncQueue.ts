import { addToSyncQueue, getSyncQueue, removeFromSyncQueue, updateSyncQueueItem, setLocal, getLocalById } from './localDatabase';
import { supabase } from '../supabase';
import { haptics } from './haptics';

type SyncAction = 'create' | 'update' | 'delete';

interface SyncOptions {
  onProgress?: (progress: { completed: number; total: number }) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

// Queue a mutation for later sync
export async function queueMutation(
  table: string,
  action: SyncAction,
  data: any
): Promise<string> {
  const queueId = await addToSyncQueue(table, action, data);
  
  // If online, try to sync immediately in background
  if (navigator.onLine) {
    syncQueueInBackground();
  }
  
  return queueId;
}

// Perform optimistic update locally
export async function performOptimisticUpdate<T>(
  table: string,
  action: SyncAction,
  data: T & { id: string }
): Promise<void> {
  const localDB = await import('./localDatabase');
  
  switch (action) {
    case 'create':
    case 'update':
      await localDB.setLocal(table, data.id, data);
      break;
    case 'delete':
      await localDB.deleteLocal(table, data.id);
      break;
  }
}

// Sync all queued mutations
export async function syncQueue(options: SyncOptions = {}): Promise<void> {
  const { onProgress, onError, onComplete } = options;
  
  if (!navigator.onLine) {
    console.log('[SyncQueue] Device is offline, skipping sync');
    return;
  }
  
  const queue = await getSyncQueue();
  
  if (queue.length === 0) {
    onComplete?.();
    return;
  }
  
  let completed = 0;
  const total = queue.length;
  
  for (const item of queue) {
    try {
      await syncItem(item);
      await removeFromSyncQueue(item.id);
      completed++;
      onProgress?.({ completed, total });
      haptics.light();
    } catch (error) {
      console.error(`[SyncQueue] Failed to sync item ${item.id}:`, error);
      
      // Increment retry count
      await updateSyncQueueItem(item.id, {
        retryCount: (item.retryCount || 0) + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // If retried too many times, keep in queue for manual resolution
      if (item.retryCount >= 3) {
        onError?.(error instanceof Error ? error : new Error('Sync failed'));
      }
    }
  }
  
  onComplete?.();
  
  if (completed === total) {
    haptics.success();
  }
}

// Sync a single queue item
async function syncItem(item: any): Promise<void> {
  const { table, action, data } = item;
  
  switch (action) {
    case 'create':
      const { error: createError } = await supabase
        .from(table)
        .insert(data);
      if (createError) throw createError;
      break;
      
    case 'update':
      const { error: updateError } = await supabase
        .from(table)
        .update(data)
        .eq('id', data.id);
      if (updateError) throw updateError;
      break;
      
    case 'delete':
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', data.id);
      if (deleteError) throw deleteError;
      break;
  }
}

// Background sync (don't block UI)
let syncInProgress = false;

export async function syncQueueInBackground(): Promise<void> {
  if (syncInProgress) return;
  
  syncInProgress = true;
  try {
    await syncQueue();
  } finally {
    syncInProgress = false;
  }
}

// Manual sync trigger
export async function triggerManualSync(): Promise<{
  success: boolean;
  synced: number;
  failed: number;
}> {
  const queue = await getSyncQueue();
  
  if (queue.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }
  
  let synced = 0;
  let failed = 0;
  
  for (const item of queue) {
    try {
      await syncItem(item);
      await removeFromSyncQueue(item.id);
      synced++;
    } catch (error) {
      failed++;
      await updateSyncQueueItem(item.id, {
        retryCount: (item.retryCount || 0) + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return { success: failed === 0, synced, failed };
}

// Get sync status
export async function getSyncStatus(): Promise<{
  pending: number;
  isSyncing: boolean;
}> {
  const localDB = await import('./localDatabase');
  const pending = await localDB.getSyncQueueCount();
  return {
    pending,
    isSyncing: syncInProgress
  };
}

// Clear failed items from queue
export async function clearFailedSyncItems(): Promise<number> {
  const queue = await getSyncQueue();
  const failedItems = queue.filter(item => item.retryCount >= 3);
  
  for (const item of failedItems) {
    await removeFromSyncQueue(item.id);
  }
  
  return failedItems.length;
}

// Retry specific item
export async function retrySyncItem(queueId: string): Promise<boolean> {
  const queue = await getSyncQueue();
  const item = queue.find(q => q.id === queueId);
  
  if (!item) return false;
  
  try {
    await syncItem(item);
    await removeFromSyncQueue(queueId);
    return true;
  } catch (error) {
    await updateSyncQueueItem(queueId, {
      retryCount: (item.retryCount || 0) + 1,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}