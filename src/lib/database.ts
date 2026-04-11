/**
 * Falcon ERP — Smart Database Adapter
 * 
 * Automatically routes to:
 *   - SQLite (via Tauri) when running as desktop app
 *   - Supabase when running in browser
 * 
 * Usage (replaces `import { supabase } from '@/lib/supabase'`):
 *   import { database, isOfflineMode } from '@/lib/database'
 *   
 *   // Works identically to supabase:
 *   const { data, error } = await database.from('products').select('*').eq('status', 'active')
 */

import { db, isTauri } from './db'

// Lazy import supabase only if we're in browser mode
let _supabase: any = null

async function getSupabase() {
  if (!_supabase) {
    const mod = await import('./supabase')
    _supabase = mod.supabase
  }
  return _supabase
}

/** Check current mode */
export function isOfflineMode(): boolean {
  return isTauri()
}

/** 
 * The unified database client.
 * In Tauri → local SQLite via db adapter
 * In browser → Supabase client
 */
export function getDatabase() {
  if (isTauri()) {
    return db
  }
  // In browser mode, return supabase directly (loaded synchronously from module cache)
  // Note: supabase module will throw if env vars missing (web-only)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { supabase } = require('./supabase')
    return supabase
  } catch {
    // Fallback: return db adapter (shouldn't happen in normal flow)
    return db
  }
}

/**
 * Auth adapter — routes to local or Supabase auth
 */
export const auth = {
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    if (isTauri()) {
      // Local auth — check against SQLite users table
      const { localAuth } = await import('./localAuth')
      return localAuth.signIn(email, password)
    }
    const supabase = await getSupabase()
    return supabase.auth.signInWithPassword({ email, password })
  },

  signOut: async () => {
    if (isTauri()) {
      const { localAuth } = await import('./localAuth')
      return localAuth.signOut()
    }
    const supabase = await getSupabase()
    return supabase.auth.signOut()
  },

  getSession: async () => {
    if (isTauri()) {
      const { localAuth } = await import('./localAuth')
      return localAuth.getSession()
    }
    const supabase = await getSupabase()
    return supabase.auth.getSession()
  },

  getUser: async () => {
    if (isTauri()) {
      const { localAuth } = await import('./localAuth')
      return localAuth.getUser()
    }
    const supabase = await getSupabase()
    return supabase.auth.getUser()
  },

  updateUser: async (updates: any) => {
    if (isTauri()) {
      const { localAuth } = await import('./localAuth')
      return localAuth.updateUser(updates)
    }
    const supabase = await getSupabase()
    return supabase.auth.updateUser(updates)
  },
}

// Re-export for convenience
export { db, isTauri }
