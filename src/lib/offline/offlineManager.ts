import { getLocalDB, setLastSync, getLastSync } from './localDatabase';
import { supabase } from '../supabase';

// Tables that support offline sync (prioritized)
const SYNC_PRIORITY = [
  'salesOrders',
  'inventory',
  'production',
  'workOrders',
  'customers',
  'products',
  'rawMaterials',
  'batches',
  'qualityChecks',
  'purchaseOrders',
  'invoices',
  'suppliers'
];

interface SyncPullOptions {
  tables?: string[];
  since?: number;
  onProgress?: (table: string, count: number) => void;
}

// Pull data from server to local DB
export async function syncPullFromServer(options: SyncPullOptions = {}): Promise<{
  success: boolean;
  synced: Record<string, number>;
  errors: string[];
}> {
  const { tables = SYNC_PRIORITY, since, onProgress } = options;
  const synced: Record<string, number> = {};
  const errors: string[] = [];
  
  for (const table of tables) {
    try {
      const lastSyncTime = since || await getLastSync(table) || 0;
      const syncedCount = await syncTableFromServer(table, lastSyncTime, onProgress);
      synced[table] = syncedCount;
      await setLastSync(table, Date.now());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${table}: ${errorMsg}`);
    }
  }
  
  return {
    success: errors.length === 0,
    synced,
    errors
  };
}

// Sync a specific table from server
async function syncTableFromServer(
  table: string,
  since: number,
  onProgress?: (table: string, count: number) => void
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .gt('updated_at', new Date(since).toISOString())
    .order('updated_at', { ascending: true });
  
  if (error) throw error;
  if (!data || data.length === 0) return 0;
  
  const localDB = await import('./localDatabase');
  await localDB.setAllLocal(table, data);
  
  onProgress?.(table, data.length);
  return data.length;
}

// Sync all data (initial sync)
export async function performInitialSync(onProgress?: (progress: {
  table: string;
  completed: number;
  total: number;
}) => void): Promise<boolean> {
  try {
    for (let i = 0; i < SYNC_PRIORITY.length; i++) {
      const table = SYNC_PRIORITY[i];
      onProgress?.({
        table,
        completed: i,
        total: SYNC_PRIORITY.length
      });
      
      // Fetch all records (no time filter for initial sync)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1000); // Reasonable limit
      
      if (error) {
        console.error(`[InitialSync] Failed to sync ${table}:`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        const localDB = await import('./localDatabase');
        await localDB.setAllLocal(table, data);
      }
      
      await setLastSync(table, Date.now());
    }
    
    return true;
  } catch (error) {
    console.error('[InitialSync] Error:', error);
    return false;
  }
}

// Check if initial sync is needed
export async function isInitialSyncNeeded(): Promise<boolean> {
  const localDB = await import('./localDatabase');
  const stats = await localDB.getLocalDBStats();
  return stats.totalRecords === 0;
}

// Force refresh specific table
export async function refreshTable(table: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1000);
    
    if (error) throw error;
    
    const localDB = await import('./localDatabase');
    await localDB.clearLocalTable(table);
    
    if (data && data.length > 0) {
      await localDB.setAllLocal(table, data);
    }
    
    await setLastSync(table, Date.now());
    
    return {
      success: true,
      count: data?.length || 0
    };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}