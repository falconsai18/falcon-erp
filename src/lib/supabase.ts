/**
 * Falcon ERP — Unified Database Client
 *
 * This file is the SINGLE source of truth for database access.
 *
 * - In BROWSER mode (Vercel): uses Supabase with build-time env vars
 * - In ELECTRON mode: uses Supabase with runtime config.json OR build-time env vars
 *
 * All 50+ files that `import { supabase } from '@/lib/supabase'`
 * continue to work without ANY changes.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { localAuth } from './localAuth'

// ─── Environment Detection ─────────────────────────────────────────

export const IS_ELECTRON = typeof window !== 'undefined' &&
  !!(window as any).electron

export const IS_BROWSER = !IS_ELECTRON

// ─── Resolve Supabase credentials ───────────────────────────────────

async function resolveCredentials(): Promise<{ url: string; key: string }> {
  if (typeof window !== 'undefined' && (window as any).__ELECTRON_CONFIG__) {
    const runtimeUrl = (window as any).__ELECTRON_CONFIG__.VITE_SUPABASE_URL
    const runtimeKey = (window as any).__ELECTRON_CONFIG__.VITE_SUPABASE_ANON_KEY
    if (runtimeUrl && runtimeKey) {
      console.log('[supabase] Using runtime config from config.json')
      return { url: runtimeUrl, key: runtimeKey }
    }
  }

  const buildUrl = import.meta.env.VITE_SUPABASE_URL
  const buildKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (buildUrl && buildKey) {
    console.log('[supabase] Using build-time env vars (Vite .env)')
    return { url: buildUrl, key: buildKey }
  }

  throw new Error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (dev) or config.json (Electron).')
}

// ─── Build the appropriate client ───────────────────────────────────

let supabaseInstance: SupabaseClient | null = null

function buildClient(): SupabaseClient {
  // Return existing instance if available (SINGLETON PATTERN)
  if (supabaseInstance) return supabaseInstance

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    // If missing env vars, we might be in Electron waiting for initSupabase
    // Create a placeholder client that won't work until re-init
    console.warn('[supabase] Warning: Initializing with placeholder credentials')
    supabaseInstance = createClient('http://placeholder.supabase.co', 'placeholder')
  } else {
    supabaseInstance = createClient(url, key)
    console.log('[supabase] ✅ Created client with URL:', url)
  }

  if (IS_ELECTRON) {
    // Add auth shim that matches Supabase auth API shape
    const authShim = {
      signInWithPassword: async (creds: { email: string; password: string }) => {
        return localAuth.signIn(creds.email, creds.password)
      },
      signOut: async () => {
        return localAuth.signOut()
      },
      getSession: async () => {
        return localAuth.getSession()
      },
      getUser: async () => {
        return localAuth.getUser()
      },
      updateUser: async (updates: any) => {
        return localAuth.updateUser(updates)
      },
      onAuthStateChange: (_callback: any) => {
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
    }

    const channelShim = () => ({
      on: () => channelShim(),
      subscribe: () => channelShim(),
      unsubscribe: async () => {},
    })

    // Override methods on the instance
    ;(supabaseInstance as any).auth = authShim
    ;(supabaseInstance as any).channel = channelShim
  }

  return supabaseInstance
}

export const supabase = buildClient()

/**
 * Initialize Supabase in Electron mode with runtime credentials.
 */
export async function initSupabase() {
  if (!IS_ELECTRON) return

  console.log('[supabase] Starting runtime initialization...')
  
  try {
    const { url, key } = await resolveCredentials()
    
    // If the instance already has the correct URL, skip re-init to maintain GoTrue state
    if (supabaseInstance && (supabaseInstance as any).supabaseUrl === url) {
      console.log('[supabase] Client already correctly configured, skipping re-init')
      return
    }

    // Re-create the instance if URL changed or first time
    supabaseInstance = createClient(url, key)
    
    // Explicitly re-apply shims
    const current = buildClient()
    ;(supabaseInstance as any).auth = (current as any).auth
    ;(supabaseInstance as any).channel = (current as any).channel

    // Patch the exported 'supabase' object's methods to point to the new instance
    const target = supabase as any
    const methods = ['from', 'rpc', 'storage', 'channel', 'removeChannel', 'auth']
    
    methods.forEach(method => {
      if (typeof (supabaseInstance as any)[method] === 'function') {
        target[method] = (supabaseInstance as any)[method].bind(supabaseInstance)
      } else {
        target[method] = (supabaseInstance as any)[method]
      }
    })

    console.log('[supabase] ✅ Successfully initialized/patched runtime client')
  } catch (err) {
    console.error('[supabase] ❌ Failed to initialize runtime client:', err)
  }
}
