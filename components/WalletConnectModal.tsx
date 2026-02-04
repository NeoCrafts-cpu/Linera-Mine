/**
 * Wallet Connect Modal
 * 
 * A modal for connecting MetaMask wallet - similar to Linera-Dominion.
 * Supports both new connections and restoring existing sessions.
 */

import React, { useState, useEffect } from 'react';
import { useWeb3Wallet, isMetaMaskInstalled } from '../hooks/useWeb3Wallet';
import * as backendApi from '../services/backendApi';

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
  const hasMetaMask = isMetaMaskInstalled();

  // Reset error when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
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

  if (!isOpen) return null;

  const displayError = error || walletError;
  const isLoading = isConnecting || isAuthenticating;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-mc-ui-bg border-4 border-mc-ui-border-dark p-6 max-w-md w-full mx-4 animate-mc-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🦊</div>
          <h2 className="text-xl font-bold text-mc-text-light mb-2">
            Connect MetaMask
          </h2>
          <p className="text-mc-text-dark text-sm">
            Connect your MetaMask wallet to access Linera Mine.
            Your progress will be saved and synced across devices!
          </p>
        </div>

        {/* MetaMask not installed */}
        {!hasMetaMask && (
          <div className="mb-4 p-3 bg-mc-redstone/10 border-2 border-mc-redstone/30">
            <p className="text-mc-redstone font-medium mb-2 text-sm">⚠️ MetaMask Not Detected</p>
            <p className="text-mc-text-dark text-xs">
              MetaMask browser extension is required to use Linera Mine.
            </p>
          </div>
        )}

        {/* Error message */}
        {displayError && (
          <div className="mb-4 p-3 bg-mc-redstone/10 border-2 border-mc-redstone/30">
            <p className="text-mc-redstone text-sm">{displayError}</p>
          </div>
        )}

        {/* Already connected address */}
        {address && (
          <div className="mb-4 p-3 bg-mc-emerald/10 border-2 border-mc-emerald/30">
            <p className="text-mc-emerald text-sm">
              ✅ Connected: {`${address.slice(0, 6)}...${address.slice(-4)}`}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            className="flex-1 mc-btn py-3 px-4 bg-mc-stone hover:bg-mc-stone-dark text-mc-text-light border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-ui-border-dark border-r-mc-ui-border-dark text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          
          <button
            className={`flex-1 mc-btn py-3 px-4 text-sm border-4 ${
              isLoading
                ? 'bg-mc-stone cursor-not-allowed text-mc-text-dark'
                : hasMetaMask
                  ? 'bg-mc-diamond hover:bg-mc-diamond-dark text-mc-ui-bg-dark border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-diamond-dark border-r-mc-diamond-dark'
                  : 'bg-mc-gold hover:bg-mc-gold-dark text-mc-ui-bg-dark border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-gold-dark border-r-mc-gold-dark'
            }`}
            onClick={handleConnect}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                {isAuthenticating ? 'Authenticating...' : 'Connecting...'}
              </span>
            ) : hasMetaMask ? (
              'Connect'
            ) : (
              'Install MetaMask'
            )}
          </button>
        </div>

        {/* Info text */}
        <p className="text-mc-text-dark text-xs text-center mt-4">
          {hasMetaMask 
            ? 'You will be asked to sign a message. This is free and does not cost any gas.'
            : 'After installing MetaMask, refresh this page and click Connect.'
          }
        </p>
      </div>
    </div>
  );
};

export default WalletConnectModal;
