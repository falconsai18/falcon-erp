/**
 * Falcon ERP — Authentication Adapter
 *
 * In Electron mode: authenticates against Supabase directly.
 * Session is persisted in localStorage for offline-aware apps.
 */

import { supabase } from './supabase'

const SESSION_KEY = 'falcon-local-session'

interface LocalSession {
  user: {
    id: string
    email: string
  }
  expires_at: string
}

export const localAuth = {
  /**
   * Sign in with email and password against Supabase
   */
  signIn: async (email: string, password: string) => {
    try {
      // Use the shared singleton supabase instance
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        return { data: { user: null, session: null }, error }
      }

      // Persist session in localStorage
      if (data.user && data.session) {
        const session: LocalSession = {
          user: { id: data.user.id, email: data.user.email || email },
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        console.log('[Auth] Signed in successfully, session persisted')
      }

      return { data, error: null }
    } catch (e: any) {
      return {
        data: { user: null, session: null },
        error: { message: e.message || 'Login failed' }
      }
    }
  },

  /**
   * Sign out — clear local session
   */
  signOut: async () => {
    localStorage.removeItem(SESSION_KEY)
    
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore — localStorage is the source of truth
    }

    return { error: null }
  },

  /**
   * Get current session from localStorage
   */
  getSession: async () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) {
        return { data: { session: null }, error: null }
      }

      const session: LocalSession = JSON.parse(raw)

      if (new Date(session.expires_at) < new Date()) {
        localStorage.removeItem(SESSION_KEY)
        return { data: { session: null }, error: null }
      }

      return { data: { session }, error: null }
    } catch {
      return { data: { session: null }, error: null }
    }
  },

  /**
   * Get current user from session
   */
  getUser: async () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) {
        return { data: { user: null }, error: null }
      }

      const session: LocalSession = JSON.parse(raw)
      return { data: { user: session.user }, error: null }
    } catch {
      return { data: { user: null }, error: null }
    }
  },

  /**
   * Update user — delegates to Supabase
   */
  updateUser: async (updates: { password?: string; email?: string }) => {
    try {
      if (updates.password) {
        const { error } = await supabase.auth.updateUser({ password: updates.password })
        if (error) return { data: null, error }
      }
      if (updates.email) {
        const { error } = await supabase.auth.updateUser({ email: updates.email })
        if (error) return { data: null, error }
      }

      // Update localStorage session
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) {
        const session: LocalSession = JSON.parse(raw)
        if (updates.email) session.user.email = updates.email
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        return { data: { user: session.user }, error: null }
      }

      return { error: { message: 'Not authenticated' } }
    } catch (e: any) {
      return { data: null, error: { message: e.message } }
    }
  }
}
