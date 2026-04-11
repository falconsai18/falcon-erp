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
      console.log('[supabase] Using runtime config')
      return { url: runtimeUrl, key: runtimeKey }
    }
  }

  const buildUrl = import.meta.env.VITE_SUPABASE_URL
  const buildKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (buildUrl && buildKey) {
    console.log('[supabase] Using build-time env vars')
    return { url: buildUrl, key: buildKey }
  }

  throw new Error('Missing Supabase credentials.')
}

// ─── Build the appropriate client ───────────────────────────────────

let supabaseInstance: SupabaseClient | null = null

function buildClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance

  // Use build-time defaults for initial load
  const url = import.meta.env.VITE_SUPABASE_URL || 'http://placeholder.supabase.co'
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

  supabaseInstance = createClient(url, key)

  if (IS_ELECTRON) {
    // Create a version of localAuth that is initialized with this instance's REAL auth
    localAuth._setInternalClient(supabaseInstance)

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
      onAuthStateChange: (callback: any) => {
        // Just bypass to let the app listen to auth changes
        return (supabaseInstance as any).auth.onAuthStateChange(callback)
      },
    }

    const channelShim = () => ({
      on: function() { return this },
      subscribe: function() { return this },
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
 * This should be awaited in main.tsx before rendering.
 */
export async function initSupabase() {
  if (!IS_ELECTRON) return

  try {
    const { url, key } = await resolveCredentials()
    
    // If we're already set up with these credentials, do nothing
    if (supabaseInstance && (supabaseInstance as any).supabaseUrl === url) {
      console.log('[supabase] Already configured with correct URL')
      return
    }

    console.log('[supabase] Re-initializing with URL:', url)

    // Re-create the inner client with correct credentials
    const newClient = createClient(url, key)
    
    // Update the instance itself while maintaining the shim wrappers
    const target = supabase as any
    
    // Patch root methods to use the new client
    target.from = newClient.from.bind(newClient)
    target.rpc = newClient.rpc.bind(newClient)
    target.storage = newClient.storage
    ;(target as any).supabaseUrl = url
    ;(target as any).supabaseKey = key

    // Re-initialize localAuth with the NEW real client to break recursion
    localAuth._setInternalClient(newClient)

    console.log('[supabase] ✅ Runtime initialization complete')
  } catch (err) {
    console.error('[supabase] ❌ Runtime initialization failed:', err)
  }
}
