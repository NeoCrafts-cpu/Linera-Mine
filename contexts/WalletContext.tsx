import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Owner, WalletAuth } from '../types';
import { connectWallet, disconnectWallet, getWalletAuth, isAuthenticated as checkIsAuthenticated } from '../services/api';

interface WalletContextType {
  auth: WalletAuth | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  userAddress: Owner | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [auth, setAuth] = useState<WalletAuth | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing connection on mount
  useEffect(() => {
    const existingAuth = getWalletAuth();
    if (existingAuth) {
      setAuth(existingAuth);
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const walletAuth = await connectWallet();
      setAuth(walletAuth);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectWallet();
    setAuth(null);
    setError(null);
  }, []);

  const value: WalletContextType = {
    auth,
    isConnected: auth?.isAuthenticated ?? false,
    isConnecting,
    error,
    connect,
    disconnect,
    userAddress: auth?.address ?? null,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

export default WalletContext;
