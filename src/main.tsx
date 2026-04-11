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
 */
function AppWrapper() {
  const [ready, setReady] = useState(!IS_ELECTRON)

  useEffect(() => {
    if (!IS_ELECTRON) return

    async function init() {
      console.log('[main] Initializing Electron environment...')
      
      // 1. Explicitly load config from Electron's main process
      const success = await initElectronEnv()
      console.log('[main] Electron config status:', success ? 'LOADED' : 'FAILED')
      
      // 2. Activate Supabase with the loaded config
      await initSupabase()
      
      console.log('[main] Electron initialization complete')
      setReady(true)
    }

    init().catch((err) => {
      console.error('[main] Failed to initialize Electron env:', err)
      setReady(true)
    })
  }, [])

  if (!ready) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: 'system-ui', gap: '12px', fontSize: '14px',
        background: '#0f172a', color: 'white'
      }}>
        <div style={{
          width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#3b82f6', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
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
