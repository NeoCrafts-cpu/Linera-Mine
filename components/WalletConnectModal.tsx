/**
 * Wallet Connect Modal
 * 
 * A modal for connecting wallets - supports both MetaMask and Dynamic SDK.
 * Dynamic provides social logins and embedded wallets for better UX.
 */

import React, { useState, useEffect } from 'react';
import { useWeb3Wallet, isMetaMaskInstalled } from '../hooks/useWeb3Wallet';
import * as backendApi from '../services/backendApi';
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';

// Check if Dynamic is enabled via environment variable
const DYNAMIC_ENABLED = !!import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (address: string) => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const {
    address,
    isConnecting,
    error: walletError,
    connectAndSign,
    checkStoredSession,
  } = useWeb3Wallet();

  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [connectMethod, setConnectMethod] = useState<'metamask' | 'dynamic' | null>(null);
  const hasMetaMask = isMetaMaskInstalled();

  // Get Dynamic context if enabled
  const dynamicContext = DYNAMIC_ENABLED ? useDynamicContext() : null;
  const dynamicAddress = dynamicContext?.primaryWallet?.address;

  // Reset error when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setConnectMethod(null);
    }
  }, [isOpen]);

  // Check for existing session on mount
  useEffect(() => {
    if (isOpen) {
      const storedSession = checkStoredSession();
      if (storedSession) {
        // Auto-authenticate with backend
        handleBackendAuth(storedSession.address);
      }
    }
  }, [isOpen, checkStoredSession]);

  // Handle Dynamic wallet connection
  useEffect(() => {
    if (isOpen && dynamicAddress && connectMethod === 'dynamic') {
      handleBackendAuth(dynamicAddress);
    }
  }, [dynamicAddress, isOpen, connectMethod]);

  const handleBackendAuth = async (walletAddress: string) => {
    setIsAuthenticating(true);
    setError(null);

    try {
      // Use wallet address as chainId for simplicity
      const response = await backendApi.connectWallet(walletAddress, walletAddress);
      
      if (response.success) {
        console.log('✅ Backend authenticated!');
        onConnected(walletAddress);
        onClose();
      } else {
        throw new Error(response.error || 'Authentication failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to authenticate';
      setError(message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleConnect = async () => {
    if (!hasMetaMask) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setError(null);
    setConnectMethod('metamask');
    
    try {
      const result = await connectAndSign();
      
      if (result) {
        // Authenticate with backend
        await handleBackendAuth(result.address);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
    }
  };

  const handleDynamicConnect = () => {
    setConnectMethod('dynamic');
    if (dynamicContext?.setShowAuthFlow) {
      dynamicContext.setShowAuthFlow(true);
    }
  };

  if (!isOpen) return null;

  const displayError = error || walletError;
  const isLoading = isConnecting || isAuthenticating;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-mc-ui-bg-dark border-4 border-mc-stone p-6 max-w-md w-full mx-4 animate-mc-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⛓️</div>
          <h2 className="text-xl font-bold text-mc-text-light mb-2" style={{textShadow: '2px 2px #1B1B2F'}}>
            Connect Wallet
          </h2>
          <p className="text-mc-text-dark text-sm">
            Connect your wallet to access Linera Mine.
            Your progress will be saved and synced across devices!
          </p>
        </div>

        {/* Error message */}
        {displayError && (
          <div className="mb-4 p-3 bg-mc-redstone/20 border-2 border-mc-redstone">
            <p className="text-mc-redstone text-sm">{displayError}</p>
          </div>
        )}

        {/* Already connected address */}
        {(address || dynamicAddress) && (
          <div className="mb-4 p-3 bg-mc-emerald/20 border-2 border-mc-emerald">
            <p className="text-mc-emerald text-sm">
              ✅ Connected: {`${(address || dynamicAddress || '').slice(0, 6)}...${(address || dynamicAddress || '').slice(-4)}`}
            </p>
          </div>
        )}

        {/* Wallet Options */}
        <div className="space-y-3 mb-4">
          {/* Dynamic Wallet Option (if enabled) */}
          {DYNAMIC_ENABLED && (
            <div className="p-4 bg-mc-obsidian border-2 border-mc-diamond rounded-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">✨</span>
                <div>
                  <h3 className="text-mc-text-light text-sm font-bold">Dynamic Wallet</h3>
                  <p className="text-mc-text-dark text-xs">Social login, email, or any wallet</p>
                </div>
              </div>
              <button
                className="w-full mc-btn py-3 px-4 bg-mc-diamond hover:bg-mc-diamond-dark text-mc-ui-bg-dark border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-diamond-dark border-r-mc-diamond-dark text-sm font-bold"
                onClick={handleDynamicConnect}
                disabled={isLoading}
              >
                {isLoading && connectMethod === 'dynamic' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Connecting...
                  </span>
                ) : (
                  '🔐 Connect with Dynamic'
                )}
              </button>
              <p className="text-mc-text-dark text-[10px] mt-2 text-center">
                Google, Discord, Twitter, Email, or 300+ wallets
              </p>
            </div>
          )}

          {/* Divider (if Dynamic is enabled) */}
          {DYNAMIC_ENABLED && (
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-mc-ui-border-dark"></div>
              <span className="text-mc-text-dark text-xs">or</span>
              <div className="flex-1 h-px bg-mc-ui-border-dark"></div>
            </div>
          )}

          {/* MetaMask Option */}
          <div className="p-4 bg-mc-obsidian border-2 border-mc-gold rounded-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🦊</span>
              <div>
                <h3 className="text-mc-text-light text-sm font-bold">MetaMask</h3>
                <p className="text-mc-text-dark text-xs">Connect with browser extension</p>
              </div>
            </div>
            
            {!hasMetaMask && (
              <div className="mb-3 p-2 bg-mc-redstone/20 border border-mc-redstone rounded-sm">
                <p className="text-mc-redstone text-xs">⚠️ MetaMask not detected</p>
              </div>
            )}
            
            <button
              className={`w-full mc-btn py-3 px-4 text-sm border-4 ${
                isLoading && connectMethod === 'metamask'
                  ? 'bg-mc-stone cursor-not-allowed text-mc-text-dark'
                  : hasMetaMask
                    ? 'bg-mc-gold hover:bg-mc-gold-dark text-mc-ui-bg-dark border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-gold-dark border-r-mc-gold-dark'
                    : 'bg-mc-stone hover:bg-mc-stone-dark text-mc-text-light border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-ui-border-dark border-r-mc-ui-border-dark'
              }`}
              onClick={handleConnect}
              disabled={isLoading && connectMethod === 'metamask'}
            >
              {isLoading && connectMethod === 'metamask' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  {isAuthenticating ? 'Authenticating...' : 'Connecting...'}
                </span>
              ) : hasMetaMask ? (
                '🦊 Connect MetaMask'
              ) : (
                '📥 Install MetaMask'
              )}
            </button>
          </div>
        </div>

        {/* Cancel button */}
        <button
          className="w-full mc-btn py-3 px-4 bg-mc-stone hover:bg-mc-stone-dark text-mc-text-light border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-ui-border-dark border-r-mc-ui-border-dark text-sm"
          onClick={onClose}
        >
          Cancel
        </button>

        {/* Info text */}
        <p className="text-mc-text-dark text-xs text-center mt-4">
          {DYNAMIC_ENABLED 
            ? 'Choose your preferred login method. All options are secure and free.'
            : 'You will be asked to sign a message. This is free and does not cost any gas.'
          }
        </p>
      </div>
    </div>
  );
};

export default WalletConnectModal;
