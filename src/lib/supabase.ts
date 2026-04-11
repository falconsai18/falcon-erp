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

let supabaseInstance: SupabaseClient | null = null

function buildClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance

  const url = import.meta.env.VITE_SUPABASE_URL || 'http://placeholder.supabase.co'
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

  supabaseInstance = createClient(url, key)

  if (IS_ELECTRON) {
    console.log('[supabase] Electron mode: Applying Auth/Channel shims')
    
    // Create a version of localAuth that is initialized with this instance's REAL auth
    // to avoid infinite recursion.
    const internalAuth = (supabaseInstance as any).auth
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
        // Just bypass or use internal
        return internalAuth.onAuthStateChange(callback)
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
  } else {
     console.log('[supabase] Browser mode: Using standard Supabase client')
  }

  return supabaseInstance
}

export const supabase = buildClient()

/**
 * Initialize Supabase in Electron mode with runtime credentials.
 */
export async function initSupabase() {
  if (!IS_ELECTRON) return

  try {
    const { url, key } = await resolveCredentials()
    
    if (supabaseInstance && (supabaseInstance as any).supabaseUrl === url) {
      return
    }

    // Re-create the inner client
    const newClient = createClient(url, key)
    
    // Re-initialize localAuth with the NEW real client
    localAuth._setInternalClient(newClient)

    // Patch the exported 'supabase' proxy
    const target = supabase as any
    
    // Copy methods from newClient to target, but KEEP the auth shim
    target.from = newClient.from.bind(newClient)
    target.rpc = newClient.rpc.bind(newClient)
    target.storage = newClient.storage
    ;(target as any).supabaseUrl = url
    ;(target as any).supabaseKey = key

    console.log('[supabase] ✅ Runtime client initialized')
  } catch (err) {
    console.error('[supabase] ❌ Failed to initialize runtime client:', err)
  }
}
