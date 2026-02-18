import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface FalconDBSchema extends DBSchema {
  syncQueue: {
    key: string;
    value: {
      id: string;
      table: string;
      action: 'create' | 'update' | 'delete';
      data: any;
      timestamp: number;
      retryCount: number;
      error?: string;
    };
    indexes: { 'by-timestamp': number };
  };
  salesOrders: {
    key: string;
    value: any;
  };
  inventory: {
    key: string;
    value: any;
  };
  production: {
    key: string;
    value: any;
  };
  customers: {
    key: string;
    value: any;
  };
  products: {
    key: string;
    value: any;
  };
  rawMaterials: {
    key: string;
    value: any;
  };
  batches: {
    key: string;
    value: any;
  };
  workOrders: {
    key: string;
    value: any;
  };
  qualityChecks: {
    key: string;
    value: any;
  };
  purchaseOrders: {
    key: string;
    value: any;
  };
  invoices: {
    key: string;
    value: any;
  };
  suppliers: {
    key: string;
    value: any;
  };
  users: {
    key: string;
    value: any;
  };
  settings: {
    key: string;
    value: any;
  };
  lastSync: {
    key: string;
    value: {
      table: string;
      timestamp: number;
    };
  };
}

const DB_NAME = 'falcon-erp-db';
const DB_VERSION = 1;

let db: IDBPDatabase<FalconDBSchema> | null = null;

export async function initLocalDatabase(): Promise<IDBPDatabase<FalconDBSchema>> {
  if (db) return db;

  db = await openDB<FalconDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Sync queue for offline mutations
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        queueStore.createIndex('by-timestamp', 'timestamp');
      }

      // Entity stores
      const stores = [
        'salesOrders',
        'inventory',
        'production',
        'customers',
        'products',
        'rawMaterials',
        'batches',
        'workOrders',
        'qualityChecks',
        'purchaseOrders',
        'invoices',
        'suppliers',
        'users',
        'settings'
      ];

      stores.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName as TableName)) {
          db.createObjectStore(storeName as TableName, { keyPath: 'id' });
        }
      });

      // Last sync timestamps
      if (!db.objectStoreNames.contains('lastSync')) {
        db.createObjectStore('lastSync', { keyPath: 'table' });
      }
    }
  });

  return db;
}

export async function getLocalDB(): Promise<IDBPDatabase<FalconDBSchema>> {
  if (!db) {
    return initLocalDatabase();
  }
  return db;
}

// Generic CRUD operations for any table
type TableName = 'syncQueue' | 'salesOrders' | 'inventory' | 'production' | 'customers' | 'products' | 'rawMaterials' | 'batches' | 'workOrders' | 'qualityChecks' | 'purchaseOrders' | 'invoices' | 'suppliers' | 'users' | 'settings' | 'lastSync';

export async function getAllLocal<T>(table: string): Promise<T[]> {
  const database = await getLocalDB();
  return database.getAll(table as TableName) as Promise<T[]>;
}

export async function getLocalById<T>(table: string, id: string): Promise<T | undefined> {
  const database = await getLocalDB();
  return database.get(table as TableName, id) as Promise<T | undefined>;
}

export async function setLocal<T>(table: string, id: string, data: T): Promise<void> {
  const database = await getLocalDB();
  await database.put(table as TableName, { ...data, id });
}

export async function deleteLocal(table: string, id: string): Promise<void> {
  const database = await getLocalDB();
  await database.delete(table as TableName, id);
}

export async function clearLocalTable(table: string): Promise<void> {
  const database = await getLocalDB();
  await database.clear(table as TableName);
}

// Batch operations for sync
export async function setAllLocal<T>(table: string, items: T[]): Promise<void> {
  const database = await getLocalDB();
  const tx = database.transaction(table as TableName, 'readwrite');
  const store = tx.objectStore(table as TableName);
  
  await Promise.all(items.map(item => store.put(item)));
  await tx.done;
}

// Sync queue operations
export async function addToSyncQueue(
  table: string,
  action: 'create' | 'update' | 'delete',
  data: any
): Promise<string> {
  const database = await getLocalDB();
  const id = `${table}-${action}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await database.add('syncQueue', {
    id,
    table,
    action,
    data,
    timestamp: Date.now(),
    retryCount: 0
  });
  
  return id;
}

export async function getSyncQueue(): Promise<any[]> {
  const database = await getLocalDB();
  return database.getAllFromIndex('syncQueue', 'by-timestamp');
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const database = await getLocalDB();
  await database.delete('syncQueue', id);
}

export async function updateSyncQueueItem(id: string, updates: Partial<any>): Promise<void> {
  const database = await getLocalDB();
  const item = await database.get('syncQueue', id);
  if (item) {
    await database.put('syncQueue', { ...item, ...updates });
  }
}

export async function clearSyncQueue(): Promise<void> {
  const database = await getLocalDB();
  await database.clear('syncQueue');
}

export async function getSyncQueueCount(): Promise<number> {
  const database = await getLocalDB();
  return database.count('syncQueue');
}

// Last sync tracking
export async function setLastSync(table: string, timestamp: number): Promise<void> {
  const database = await getLocalDB();
  await database.put('lastSync', { table, timestamp });
}

export async function getLastSync(table: string): Promise<number | undefined> {
  const database = await getLocalDB();
  const record = await database.get('lastSync', table);
  return record?.timestamp;
}

// Clear all local data (logout/reset)
export async function clearAllLocalData(): Promise<void> {
  const database = await getLocalDB();
  const tables = [
    'salesOrders',
    'inventory',
    'production',
    'customers',
    'products',
    'rawMaterials',
    'batches',
    'workOrders',
    'qualityChecks',
    'purchaseOrders',
    'invoices',
    'suppliers',
    'users',
    'settings',
    'syncQueue',
    'lastSync'
  ];
  
  await Promise.all(tables.map(table => database.clear(table as any)));
}

// Get database stats
export async function getLocalDBStats(): Promise<{
  totalRecords: number;
  syncQueueCount: number;
  tables: Record<string, number>;
}> {
  const database = await getLocalDB();
  const tables = [
    'salesOrders',
    'inventory',
    'production',
    'customers',
    'products',
    'rawMaterials',
    'batches',
    'workOrders',
    'qualityChecks',
    'purchaseOrders',
    'invoices',
    'suppliers',
    'users',
    'settings'
  ];
  
  const stats: Record<string, number> = {};
  let totalRecords = 0;
  
  for (const table of tables) {
    const count = await database.count(table as any);
    stats[table] = count;
    totalRecords += count;
  }
  
  const syncQueueCount = await database.count('syncQueue');
  
  return {
    totalRecords,
    syncQueueCount,
    tables: stats
  };
}