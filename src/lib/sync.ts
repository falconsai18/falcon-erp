/**
 * Falcon ERP — Sync Engine (DISABLED)
 *
 * Previously handled Supabase ↔ SQLite sync.
 * Since SQLite was removed, this is now a no-op.
 *
 * The app works directly with Supabase (online only).
 *
 * To re-enable sync:
 * 1. Re-add better-sqlite3 to package.json
 * 2. Restore src/lib/db.ts
 * 3. Restore this file's original implementation
 */

/**
 * Perform a full initial sync (Cloud → Local)
 * Currently disabled — returns immediately.
 */
export async function performInitialSync(_onProgress?: (msg: string) => Promise<void>): Promise<void> {
  console.warn('[Sync] performInitialSync called but sync is disabled (SQLite removed)')
  return Promise.resolve()
}

/**
 * Perform an incremental sync
 * Currently disabled — returns immediately.
 */
export async function performIncrementalSync(_onProgress?: (msg: string) => Promise<void>): Promise<void> {
  console.warn('[Sync] performIncrementalSync called but sync is disabled (SQLite removed)')
  return Promise.resolve()
}
