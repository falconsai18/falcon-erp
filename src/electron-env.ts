/**
 * Electron Environment Variables Handler
 *
 * This file MUST be imported early in your main.tsx (before supabase.ts)
 * to load configuration from Electron's main process.
 *
 * Priority: config.json (runtime) > .env (build-time Vite) > throw
 *
 * Usage in main.tsx:
 *   import './electron-env'    // auto-loads if in Electron
 *   import { initSupabase } from '@/lib/supabase'
 *   await initSupabase()       // activates Supabase in Electron mode
 *
 * How it works:
 *   - In Electron: fetches config via IPC from main process
 *   - In Browser: no-op, Vite handles .env automatically
 *   - Config is stored on window.__ELECTRON_CONFIG__ for supabase.ts to read
 */

// Check if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' &&
    ((window as any).electron !== undefined ||
     (window as any).api !== undefined);
};

// Get Electron API instance
const getElectronAPI = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).electron || (window as any).api || null;
};

/**
 * Load configuration from Electron's main process.
 * Main process checks: config.json → process.env → defaults
 * This function stores config on window.__ELECTRON_CONFIG__
 * for supabase.ts and other modules to consume.
 */
export async function initElectronEnv() {
  const electron = getElectronAPI();

  if (!electron) {
    console.log('[electron-env] Not running in Electron, skipping env init');
    return false;
  }

  try {
    // Load all config from main process (config.json fallback chain)
    const config = await electron.invoke('config-get');

    // Store on window for other modules to read
    (window as any).__ELECTRON_CONFIG__ = config;

    console.log('[electron-env] Configuration loaded from Electron main process');
    console.log('[electron-env] Supabase URL:', config.VITE_SUPABASE_URL ? 'SET' : 'MISSING');
    console.log('[electron-env] Supabase Key:', config.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');

    return true;
  } catch (err) {
    console.error('[electron-env] Failed to load config from Electron:', err);
    return false;
  }
}

/**
 * Get a single config value.
 * Useful for non-Supabase env vars like VITE_SELLER_STATE.
 */
export const getConfig = async (key: string): Promise<string> => {
  const electron = getElectronAPI();
  if (!electron) {
    // Not in Electron, return from Vite env
    return (import.meta.env as any)[key] || '';
  }
  try {
    return await electron.invoke('env-get', key);
  } catch {
    return (import.meta.env as any)[key] || '';
  }
};

// Auto-initialize if in Electron (non-blocking)
if (isElectron()) {
  initElectronEnv().catch(console.error);
}
