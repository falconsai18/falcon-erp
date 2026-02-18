import { useState, useEffect, useCallback } from 'react';

interface OnlineStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType: string;
  downlink: number | null;
  effectiveType: string | null;
}

export function useOffline(): OnlineStatus {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    connectionType: 'unknown',
    downlink: null,
    effectiveType: null
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        isOffline: false
      }));
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isOffline: true
      }));
    };

    const handleConnectionChange = () => {
      const conn = (navigator as any).connection;
      if (conn) {
        setStatus(prev => ({
          ...prev,
          connectionType: conn.type || 'unknown',
          downlink: conn.downlink || null,
          effectiveType: conn.effectiveType || null
        }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', handleConnectionChange);
      handleConnectionChange();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return status;
}

// Hook for listening to online/offline changes with callbacks
export function useNetworkStatus(
  onOnline?: () => void,
  onOffline?: () => void
): OnlineStatus {
  const status = useOffline();

  useEffect(() => {
    if (status.isOnline && onOnline) {
      onOnline();
    }
    if (status.isOffline && onOffline) {
      onOffline();
    }
  }, [status.isOnline, status.isOffline, onOnline, onOffline]);

  return status;
}

// Hook for debounced online status (prevents flickering)
export function useDebouncedOnlineStatus(debounceMs: number = 1000): boolean {
  const [debouncedStatus, setDebouncedStatus] = useState(navigator.onLine);
  const { isOnline } = useOffline();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedStatus(isOnline);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [isOnline, debounceMs]);

  return debouncedStatus;
}