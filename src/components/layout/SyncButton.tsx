import { useState } from 'react'
import { Cloud, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Sync Button — DISABLED (SQLite removed)
 * 
 * This component previously handled offline ↔ Supabase sync.
 * Since SQLite was removed, this is now a placeholder.
 * The app works directly with Supabase (online only).
 * 
 * To re-enable sync:
 * 1. Re-add better-sqlite3 to package.json
 * 2. Restore src/lib/db.ts, src/lib/sync.ts
 * 3. Restore this component's original implementation
 */
export function SyncButton() {
    const [status] = useState<string>('online')

    // Sync is disabled — app uses Supabase directly (online only)
    // Show a subtle indicator that sync is not available
    return (
        <div className="flex items-center gap-2" title="Sync requires local SQLite (currently disabled)">
            <div title="Online mode — Sync disabled" className="text-gray-400 dark:text-gray-500">
                <Cloud size={16} />
            </div>
        </div>
    )
}
