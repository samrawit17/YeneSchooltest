/**
 * React Hook for Network Status
 * 
 * Features:
 * - Detect online/offline status
 * - Get connection type
 * - Notify when connection is restored
 */

import { useState, useEffect, useCallback } from 'react';

interface NetworkInformation {
  type?: 'wifi' | '4g' | '3g' | 'slow_2g' | undefined;
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  addEventListener?: (type: string, cb: () => void) => void;
  removeEventListener?: (type: string, cb: () => void) => void;
}

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  connectionType?: 'wifi' | '4g' | '3g' | '2g' | 'slow-2g' | 'offline' | undefined;
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
}

type NetworkChangeCallback = (status: NetworkStatus) => void;

// ============================================
// HOOK
// ============================================

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        isOnline: true,
        wasOffline: !prev.isOnline,
        connectionType: prev.connectionType,
        effectiveType: prev.effectiveType
      }));
    };

    const handleOffline = () => {
      setStatus(prev => ({
        isOnline: false,
        wasOffline: true,
        connectionType: 'offline',
        effectiveType: undefined
      }));
    };

    // Get connection info if available
    const getConnectionInfo = (): Partial<NetworkStatus> => {
      if ('connection' in navigator) {
        const connection = (navigator as Navigator & { 
          connection?: NetworkInformation 
        }).connection;
        
        if (connection) {
          return {
            connectionType: connection.type as NetworkStatus['connectionType'],
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
          };
        }
      }
      return {};
    };

    // Set initial status
    setStatus(prev => ({
      ...prev,
      ...getConnectionInfo()
    }));

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    let connection: NetworkInformation | undefined;
    const handleConnectionChange = () => {
      setStatus(prev => ({
        ...prev,
        ...getConnectionInfo()
      }));
    };

    if ('connection' in navigator) {
      connection = (navigator as Navigator & { 
        connection?: NetworkInformation 
      }).connection;
      
      if (connection?.addEventListener) {
        connection.addEventListener('change', handleConnectionChange);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection?.removeEventListener) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return status;
}

// ============================================
// PROVIDER COMPONENT
// ============================================

interface NetworkStatusProviderProps {
  children: React.ReactNode;
  onNetworkChange?: NetworkChangeCallback;
}

export function NetworkStatusProvider({ 
  children, 
  onNetworkChange 
}: NetworkStatusProviderProps) {
  const status = useNetworkStatus();

  useEffect(() => {
    onNetworkChange?.(status);
  }, [status, onNetworkChange]);

  return <>{children}</>;
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook that returns a callback that should not be called when offline
 */
export function useOnlineCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  options?: {
    onOffline?: () => void;
    requireWifi?: boolean;
  }
): T {
  const { onOffline, requireWifi } = options || {};
  const status = useNetworkStatus();

  return useCallback((...args: unknown[]) => {
    if (!status.isOnline) {
      onOffline?.();
      return undefined as unknown as ReturnType<T>;
    }

    if (requireWifi && status.connectionType !== 'wifi') {
      onOffline?.();
      return undefined as unknown as ReturnType<T>;
    }

    return callback(...args);
  }, [callback, status.isOnline, status.connectionType, requireWifi, onOffline]) as unknown as T;
}

/**
 * Hook that shows a message when offline
 */
export function useOfflineIndicator() {
  const status = useNetworkStatus();
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    if (!status.isOnline) {
      setShowOfflineMessage(true);
    } else if (status.wasOffline) {
      // Show "back online" message briefly
      setShowOfflineMessage(true);
      const timer = setTimeout(() => setShowOfflineMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status.isOnline, status.wasOffline]);

  return {
    isOnline: status.isOnline,
    showOfflineMessage,
    connectionType: status.connectionType
  };
}

export default useNetworkStatus;
