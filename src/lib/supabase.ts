/**
 * Falcon ERP — Unified Database Client
 *
 * This file is the SINGLE source of truth for database access.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { localAuth } from './localAuth'

// ─── Environment Detection ─────────────────────────────────────────

export const IS_ELECTRON = typeof window !== 'undefined' &&
  !!(window as any).electron

export const IS_BROWSER = !IS_ELECTRON

// ─── Resolve Supabase credentials ───────────────────────────────────

async function resolveCredentials(): Promise<{ url: string; key: string }> {
  // Wait up to 2 seconds for Electron config to be injected if in Electron mode
  if (IS_ELECTRON && !(window as any).__ELECTRON_CONFIG__) {
    console.log('[supabase] Waiting for Electron config...')
    for (let i = 0; i < 20; i++) {
        if ((window as any).__ELECTRON_CONFIG__) break
        await new Promise(r => setTimeout(r, 100))
    }
  }

  if (typeof window !== 'undefined' && (window as any).__ELECTRON_CONFIG__) {
    const runtimeUrl = (window as any).__ELECTRON_CONFIG__.VITE_SUPABASE_URL
    const runtimeKey = (window as any).__ELECTRON_CONFIG__.VITE_SUPABASE_ANON_KEY
    if (runtimeUrl && runtimeKey) {
      return { url: runtimeUrl, key: runtimeKey }
    }
  }

  const buildUrl = import.meta.env.VITE_SUPABASE_URL
  const buildKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (buildUrl && buildKey) {
    return { url: buildUrl, key: buildKey }
  }

  throw new Error('Missing Supabase credentials.')
}

// ─── Build the appropriate client ───────────────────────────────────

// The "Real" Supabase client that actually talks to the network
let rawClient: SupabaseClient | null = null

// The "Exported" client that the app uses (with shims in Electron)
let exportedClient: any = null

function buildClient(): SupabaseClient {
  if (exportedClient) return exportedClient

  const url = import.meta.env.VITE_SUPABASE_URL || 'http://placeholder.supabase.co'
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

  // 1. Create the RAW instance
  rawClient = createClient(url, key)
  
  // 2. Wrap it so we can shim methods without mutating the raw instance
  exportedClient = {
    ...rawClient, // Copy static props
    from: rawClient.from.bind(rawClient),
    rpc: rawClient.rpc.bind(rawClient),
    storage: rawClient.storage,
    supabaseUrl: url,
    supabaseKey: key,
  }

  if (IS_ELECTRON) {
    console.log('[supabase] Electron mode: Applying Auth/Channel shims')
    
    // Initialize localAuth with the CLEAN rawClient
    localAuth._setInternalClient(rawClient)

    const authShim = {
      signInWithPassword: (creds: any) => localAuth.signIn(creds.email, creds.password),
      signOut: () => localAuth.signOut(),
      getSession: () => localAuth.getSession(),
      getUser: () => localAuth.getUser(),
      updateUser: (updates: any) => localAuth.updateUser(updates),
      onAuthStateChange: (callback: any) => rawClient!.auth.onAuthStateChange(callback),
    }

    const channelShim = () => ({
      on: function() { return this },
      subscribe: function() { return this },
      unsubscribe: async () => {},
    })

    // Apply shims ONLY to the exported wrapper
    exportedClient.auth = authShim
    exportedClient.channel = channelShim
  } else {
    // In browser, just use the raw client directly but maintain the reference
    exportedClient = rawClient
  }

  return exportedClient as SupabaseClient
}

export const supabase = buildClient()

/**
 * Initialize Supabase in Electron mode with runtime credentials.
 */
export async function initSupabase() {
  if (!IS_ELECTRON) return

  try {
    const { url, key } = await resolveCredentials()
    
    if (exportedClient && (exportedClient as any).supabaseUrl === url) {
      return
    }

    console.log('[supabase] Re-initializing with runtime config')

    // 1. Re-create the RAW instance
    rawClient = createClient(url, key)
    
    // 2. Update the singleton wrapper
    const target = exportedClient as any
    target.from = rawClient.from.bind(rawClient)
    target.rpc = rawClient.rpc.bind(rawClient)
    target.storage = rawClient.storage
    target.supabaseUrl = url
    target.supabaseKey = key

    // 3. Update localAuth with the NEW CLEAN rawClient
    localAuth._setInternalClient(rawClient)

    console.log('[supabase] ✅ Runtime client initialized')
  } catch (err) {
    console.error('[supabase] ❌ Failed to initialize runtime client:', err)
  }
}
