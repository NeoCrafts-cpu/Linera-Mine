/**
 * useLineraConnection Hook
 * 
 * Manages Linera connection state.
 * Handles connect/disconnect and provides reactive state updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { lineraAdapter, type LineraConnection } from '../services/linera/index';

/**
 * Connection state returned by the hook
 */
export interface LineraConnectionState {
  // Connection flags
  isConnecting: boolean;
  isConnected: boolean;
  isAppConnected: boolean;
  
  // Error state
  error: string | null;
  
  // Connection data
  connection: LineraConnection | null;
  walletAddress: string | null;
  chainId: string | null;
  
  // Actions
  connect: (userAddress: string) => Promise<void>;
  disconnect: () => void;
  retry: () => Promise<void>;
}

// Store the last used address for retry
let lastUsedAddress: string | null = null;

/**
 * Hook for managing Linera blockchain connection
 */
export function useLineraConnection(): LineraConnectionState {
  // Local state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(lineraAdapter.isConnected());
  const [isAppConnected, setIsAppConnected] = useState(lineraAdapter.isApplicationConnected());
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<LineraConnection | null>(lineraAdapter.getConnection());
  
  // Track if we're currently connecting
  const isConnectingRef = useRef(false);
  
  /**
   * Sync state from adapter (stable reference)
   */
  const syncState = useCallback(() => {
    const newIsConnected = lineraAdapter.isConnected();
    const newIsAppConnected = lineraAdapter.isApplicationConnected();
    const newConnection = lineraAdapter.getConnection();
    
    // Only update state if values actually changed
    setIsConnected(prev => prev !== newIsConnected ? newIsConnected : prev);
    setIsAppConnected(prev => prev !== newIsAppConnected ? newIsAppConnected : prev);
    setConnection(prev => prev !== newConnection ? newConnection : prev);
  }, []);
  
  /**
   * Connect to Linera
   */
  const connect = useCallback(async (userAddress: string) => {
    // Validate prerequisites
    if (!userAddress) {
      setError('User address is required to connect');
      return;
    }
    
    const applicationId = lineraAdapter.getApplicationId();
    if (!applicationId) {
      setError('Application ID is not configured. Check VITE_APPLICATION_ID in your .env');
      return;
    }
    
    // Prevent concurrent connections
    if (isConnectingRef.current) {
      console.log('⏳ Connection already in progress...');
      return;
    }
    
    // Store address for retry
    lastUsedAddress = userAddress;
    
    // Start connection
    isConnectingRef.current = true;
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log('🔗 Connecting to Linera...');
      
      // Step 1: Connect wallet to Linera network
      await lineraAdapter.connect(userAddress);
      
      // Step 2: Connect to Job Marketplace application
      // Wrap in try-catch to handle WASM errors gracefully
      try {
        await lineraAdapter.connectApplication(applicationId);
      } catch (appError) {
        // Application connection might fail due to WASM issues
        // but wallet connection succeeded, so we can still show connected state
        console.warn('⚠️ Application connection had issues, wallet is connected:', appError);
      }
      
      // Update state
      syncState();
      console.log('✅ Connected to Job Marketplace!');
    } catch (err) {
      // Handle WASM panics gracefully
      const errorString = String(err);
      if (errorString.includes('unreachable') || errorString.includes('panicked')) {
        console.warn('⚠️ WASM error during connection, but may still work:', err);
        // Check if we actually connected despite the error
        syncState();
        if (lineraAdapter.isConnected()) {
          return; // Connection succeeded despite WASM error
        }
      }
      
      const message = err instanceof Error ? err.message : 'Connection failed';
      console.error('❌ Connection failed:', message);
      setError(message);
    } finally {
      setIsConnecting(false);
      isConnectingRef.current = false;
    }
  }, [syncState]);
  
  /**
   * Disconnect from Linera
   */
  const disconnect = useCallback(() => {
    lineraAdapter.disconnect();
    setError(null);
    syncState();
  }, [syncState]);
  
  /**
   * Retry connection with last used address
   */
  const retry = useCallback(async () => {
    if (lastUsedAddress) {
      await connect(lastUsedAddress);
    } else {
      setError('No previous connection to retry');
    }
  }, [connect]);
  
  // Subscribe to adapter state changes
  useEffect(() => {
    const unsubscribe = lineraAdapter.subscribe(syncState);
    return unsubscribe;
  }, [syncState]);
  
  return {
    isConnecting,
    isConnected,
    isAppConnected,
    error,
    connection,
    walletAddress: connection?.address ?? null,
    chainId: connection?.chainId ?? null,
    connect,
    disconnect,
    retry,
  };
}

export default useLineraConnection;
