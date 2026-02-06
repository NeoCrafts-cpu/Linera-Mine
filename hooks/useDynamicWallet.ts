/**
 * Dynamic Wallet Hook
 * 
 * Hook to interact with Dynamic wallet SDK.
 * Falls back to MetaMask if Dynamic is not configured.
 */

import { useCallback, useState, useEffect } from 'react';

// Check if Dynamic SDK is available
let useDynamicContext: any = null;
let useIsLoggedIn: any = null;
let useDynamicModals: any = null;

try {
  const dynamicSdk = require('@dynamic-labs/sdk-react-core');
  useDynamicContext = dynamicSdk.useDynamicContext;
  useIsLoggedIn = dynamicSdk.useIsLoggedIn;
  useDynamicModals = dynamicSdk.useDynamicModals;
} catch (e) {
  // Dynamic SDK not available
}

const DYNAMIC_ENABLED = !!import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;

export interface DynamicWalletState {
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  isLoggedIn: boolean;
}

export function useDynamicWallet() {
  const [state, setState] = useState<DynamicWalletState>({
    address: null,
    isConnecting: false,
    error: null,
    isLoggedIn: false,
  });

  // If Dynamic is not available, return early with disabled state
  if (!DYNAMIC_ENABLED || !useDynamicContext) {
    return {
      ...state,
      isEnabled: false,
      connect: () => Promise.resolve(null),
      disconnect: () => {},
      openConnectModal: () => {},
    };
  }

  // Use Dynamic SDK hooks
  const { primaryWallet, setShowAuthFlow, handleLogOut, user } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  // Update state when wallet changes
  useEffect(() => {
    if (primaryWallet?.address) {
      setState({
        address: primaryWallet.address,
        isConnecting: false,
        error: null,
        isLoggedIn: true,
      });

      // Store in localStorage for other components
      localStorage.setItem('linera_user_address', primaryWallet.address);
      localStorage.setItem('linera_client_address', primaryWallet.address);
    } else {
      setState({
        address: null,
        isConnecting: false,
        error: null,
        isLoggedIn: false,
      });
    }
  }, [primaryWallet?.address, isLoggedIn]);

  /**
   * Open the Dynamic connect modal
   */
  const openConnectModal = useCallback(() => {
    setShowAuthFlow(true);
  }, [setShowAuthFlow]);

  /**
   * Connect wallet (opens modal)
   */
  const connect = useCallback(async () => {
    setState(s => ({ ...s, isConnecting: true, error: null }));
    try {
      setShowAuthFlow(true);
      return null; // Address will be set via the useEffect above
    } catch (err: any) {
      setState(s => ({ ...s, isConnecting: false, error: err.message }));
      return null;
    }
  }, [setShowAuthFlow]);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    handleLogOut();
    localStorage.removeItem('linera_user_address');
    localStorage.removeItem('linera_client_address');
    localStorage.removeItem('linera_mine_auth_token');
    setState({
      address: null,
      isConnecting: false,
      error: null,
      isLoggedIn: false,
    });
  }, [handleLogOut]);

  return {
    ...state,
    isEnabled: true,
    user,
    connect,
    disconnect,
    openConnectModal,
  };
}

export default useDynamicWallet;
