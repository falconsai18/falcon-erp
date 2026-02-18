import { getLocalById, setLocal } from './localDatabase';

export interface ConflictItem {
  id: string;
  table: string;
  localVersion: any;
  serverVersion: any;
  field: string;
  localValue: any;
  serverValue: any;
}

export interface ConflictResolution {
  id: string;
  resolution: 'local' | 'server' | 'merged';
  mergedData?: any;
  localVersion?: any;
  serverVersion?: any;
}

// Detect conflicts between local and server versions
export async function detectConflicts(
  table: string,
  serverData: any[],
  localIds: string[]
): Promise<ConflictItem[]> {
  const conflicts: ConflictItem[] = [];
  
  for (const serverItem of serverData) {
    const localItem = await getLocalById(table, serverItem.id);
    
    if (localItem && localIds.includes(serverItem.id)) {
      // Both versions exist - check for conflicts
      const itemConflicts = compareVersions(table, localItem, serverItem);
      conflicts.push(...itemConflicts);
    }
  }
  
  return conflicts;
}

// Compare two versions of the same record
function compareVersions(
  table: string,
  local: any,
  server: any
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  const ignoreFields = ['created_at', 'updated_at', 'id', 'sync_status'];
  
  // Get all fields from both versions
  const allFields = new Set([
    ...Object.keys(local),
    ...Object.keys(server)
  ]);
  
  for (const field of allFields) {
    if (ignoreFields.includes(field)) continue;
    
    const localValue = local[field];
    const serverValue = server[field];
    
    // Check if values differ
    if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
      conflicts.push({
        id: local.id,
        table,
        localVersion: local,
        serverVersion: server,
        field,
        localValue,
        serverValue
      });
    }
  }
  
  return conflicts;
}

// Auto-resolve simple conflicts based on rules
export function autoResolveConflict(conflict: ConflictItem): ConflictResolution | null {
  const { field, localValue, serverValue } = conflict;
  
  // Rule 1: If one is null/undefined, keep the other
  if (localValue == null && serverValue != null) {
    return { id: conflict.id, resolution: 'server' };
  }
  if (serverValue == null && localValue != null) {
    return { id: conflict.id, resolution: 'local' };
  }
  
  // Rule 2: For numeric fields, take the higher value (usually more recent)
  if (typeof localValue === 'number' && typeof serverValue === 'number') {
    return { 
      id: conflict.id, 
      resolution: localValue > serverValue ? 'local' : 'server' 
    };
  }
  
  // Rule 3: For dates, take the more recent
  if (field.toLowerCase().includes('date') || field.toLowerCase().includes('at')) {
    const localDate = new Date(localValue);
    const serverDate = new Date(serverValue);
    if (!isNaN(localDate.getTime()) && !isNaN(serverDate.getTime())) {
      return { 
        id: conflict.id, 
        resolution: localDate > serverDate ? 'local' : 'server' 
      };
    }
  }
  
  // Rule 4: For status fields, prefer certain statuses
  if (field.toLowerCase().includes('status')) {
    const statusPriority = ['completed', 'approved', 'active', 'pending', 'draft'];
    const localIndex = statusPriority.findIndex(s => 
      String(localValue).toLowerCase().includes(s)
    );
    const serverIndex = statusPriority.findIndex(s => 
      String(serverValue).toLowerCase().includes(s)
    );
    
    if (localIndex !== -1 && serverIndex !== -1) {
      return { 
        id: conflict.id, 
        resolution: localIndex <= serverIndex ? 'local' : 'server' 
      };
    }
  }
  
  // Cannot auto-resolve - needs manual intervention
  return null;
}

// Merge two versions (prefer local for user-editable fields)
export function mergeVersions(local: any, server: any): any {
  const merged = { ...server };
  
  // Fields that should prefer local version (user input)
  const userEditableFields = [
    'notes',
    'description',
    'remarks',
    'comments',
    'custom_fields'
  ];
  
  for (const field of userEditableFields) {
    if (local[field] !== undefined && local[field] !== null) {
      merged[field] = local[field];
    }
  }
  
  // Always use latest timestamps
  merged.updated_at = new Date().toISOString();
  
  return merged;
}

// Apply conflict resolutions
export async function applyConflictResolutions(
  table: string,
  resolutions: ConflictResolution[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  for (const resolution of resolutions) {
    try {
      const localItem = await getLocalById(table, resolution.id);
      const serverItem = resolution.localVersion || resolution.serverVersion;
      
      let finalData: any;
      
      switch (resolution.resolution) {
        case 'local':
          finalData = localItem;
          break;
        case 'server':
          finalData = serverItem;
          break;
        case 'merged':
          finalData = resolution.mergedData || mergeVersions(localItem, serverItem);
          break;
      }
      
      if (finalData) {
        await setLocal(table, resolution.id, finalData);
        success++;
      }
    } catch (error) {
      console.error(`[ConflictResolver] Failed to apply resolution for ${resolution.id}:`, error);
      failed++;
    }
  }
  
  return { success, failed };
}

// Get conflict summary for UI
export function getConflictSummary(conflicts: ConflictItem[]): {
  total: number;
  byTable: Record<string, number>;
  byField: Record<string, number>;
  autoResolvable: number;
} {
  const byTable: Record<string, number> = {};
  const byField: Record<string, number> = {};
  let autoResolvable = 0;
  
  for (const conflict of conflicts) {
    byTable[conflict.table] = (byTable[conflict.table] || 0) + 1;
    byField[conflict.field] = (byField[conflict.field] || 0) + 1;
    
    if (autoResolveConflict(conflict)) {
      autoResolvable++;
    }
  }
  
  return {
    total: conflicts.length,
    byTable,
    byField,
    autoResolvable
  };
}