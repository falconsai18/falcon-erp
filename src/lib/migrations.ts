/**
 * Falcon ERP — Database Migrations (DISABLED)
 *
 * Previously ran SQLite schema migrations on app startup.
 * Since SQLite was removed, this is now a no-op.
 *
 * To re-enable: restore better-sqlite3 and the original migration SQL.
 */

export async function runMigrations(): Promise<void> {
  console.log('[Migrations] Skipped — SQLite not available (online-only mode)')
  return Promise.resolve()
}
