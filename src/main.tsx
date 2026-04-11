import React, { Component, ReactNode, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import './styles/globals.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initElectronEnv } from './electron-env'
import { initSupabase, IS_ELECTRON } from './lib/supabase'

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
          <h2>Something went wrong.</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fee', padding: '10px' }}>
            {this.state.error?.toString()}
            <br />
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * AppWrapper handles Electron initialization before rendering.
 *
 * Flow in Electron:
 *   1. electron-env.ts module loads → auto-detects Electron → calls initElectronEnv()
 *      → sets window.__ELECTRON_CONFIG__ via IPC from main process
 *   2. supabase.ts module loads → IS_ELECTRON = true (window.electron exists from preload)
 *   3. AppWrapper useEffect → calls initSupabase() → reads __ELECTRON_CONFIG__ → creates real Supabase client
 *   4. App renders
 *
 * Flow in Browser (Vercel):
 *   1. electron-env.ts → not Electron → no-op
 *   2. supabase.ts → IS_ELECTRON = false → creates Supabase client from import.meta.env
 *   3. App renders immediately
 */
function AppWrapper() {
  // In browser mode, render immediately (Vite handles .env)
  // In Electron mode, wait for initSupabase() to complete
  const [ready, setReady] = useState(!IS_ELECTRON)

  useEffect(() => {
    if (!IS_ELECTRON) return

    async function init() {
      console.log('[main] Initializing Electron environment...')
      // electron-env.ts auto-ran initElectronEnv() at module load time
      // Just need to call initSupabase() to activate the Supabase client
      await initSupabase()
      console.log('[main] Electron initialization complete')
      setReady(true)
    }
    init().catch((err) => {
      console.error('[main] Failed to initialize Electron env:', err)
      // Still render — the app may have fallback behavior
      setReady(true)
    })
  }, [])

  if (!ready) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: 'system-ui', gap: '12px', fontSize: '14px'
      }}>
        <div style={{
          width: '20px', height: '20px', border: '2px solid #e5e7eb',
          borderTopColor: '#3b82f6', borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }} />
        Initializing Falcon ERP...
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </QueryClientProvider>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<AppWrapper />)
