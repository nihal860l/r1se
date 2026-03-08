import { useState, useEffect, useCallback } from 'react';

/**
 * Tracks browser online/offline state and fires a custom event on reconnect.
 * Components can listen for 'app-online' to trigger sync.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      window.dispatchEvent(new CustomEvent('app-online'));
    };
    const goOffline = () => {
      setIsOnline(false);
      window.dispatchEvent(new CustomEvent('app-offline'));
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return { isOnline };
}
