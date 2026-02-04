/**
 * Web3 Wallet Hook
 * 
 * Connects to MetaMask or other Web3 wallets and signs a message
 * to derive a deterministic seed for the Linera private key.
 * 
 * Based on Linera-Dominion's approach for persistent accounts.
 */

import { useCallback, useState, useEffect } from 'react';

// Web3 Wallet State
export interface Web3WalletState {
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  signature: string | null;
  seed: string | null; // We'll use hex string for simpler storage
}

// The message to sign - this creates a deterministic signature for each wallet
const SIGN_MESSAGE = `Welcome to Linera Mine!

Sign this message to securely log in to your account.

This signature will be used to verify your identity.
No gas fees. No blockchain transaction.

Domain: Linera Mine
Network: Linera Testnet`;

// Simple hash function (for seed derivation)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Convert to hex and pad
  const hex = Math.abs(hash).toString(16).padStart(16, '0');
  // Create a longer hash by combining multiple rounds
  let result = hex;
  for (let i = 0; i < 3; i++) {
    let subHash = 0;
    for (let j = 0; j < str.length; j++) {
      const char = str.charCodeAt(j);
      subHash = ((subHash << (5 + i)) - subHash) + char + i;
      subHash = subHash & subHash;
    }
    result += Math.abs(subHash).toString(16).padStart(16, '0');
  }
  return '0x' + result;
}

// Check if MetaMask is installed
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
}

export function useWeb3Wallet() {
  const [state, setState] = useState<Web3WalletState>({
    address: null,
    isConnecting: false,
    error: null,
    signature: null,
    seed: null,
  });

  // Try to restore from localStorage on mount
  useEffect(() => {
    const storedAddress = localStorage.getItem('linera_mine_web3_address');
    const storedSeed = localStorage.getItem('linera_mine_web3_seed');
    const storedSignature = localStorage.getItem('linera_mine_web3_signature');
    
    if (storedAddress && storedSeed) {
      console.log('📂 Found stored Web3 session:', storedAddress);
      setState({
        address: storedAddress,
        isConnecting: false,
        error: null,
        signature: storedSignature,
        seed: storedSeed,
      });
    }
  }, []);

  /**
   * Connect to Web3 wallet (MetaMask) and sign message to get seed
   */
  const connectAndSign = useCallback(async (): Promise<{ address: string; seed: string } | null> => {
    if (state.isConnecting) return null;

    setState(s => ({ ...s, isConnecting: true, error: null }));

    try {
      // Check if ethereum provider exists
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No Web3 wallet detected. Please install MetaMask!');
      }

      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      const address = accounts[0].toLowerCase();
      console.log('🦊 Connected to Web3 wallet:', address);

      // Check if we have a stored signature for this address
      const storedSig = localStorage.getItem(`linera_mine_sig_${address}`);
      const storedSeed = localStorage.getItem(`linera_mine_seed_${address}`);
      
      let signature: string;
      let seed: string;

      if (storedSig && storedSeed) {
        // Reuse stored signature and seed
        console.log('📝 Found stored signature, reusing...');
        signature = storedSig;
        seed = storedSeed;
      } else {
        // Sign message to get deterministic signature
        console.log('✍️ Requesting signature...');
        
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [SIGN_MESSAGE, address],
        }) as string;
        
        console.log('✅ Message signed!');

        // Derive seed from signature
        seed = simpleHash(signature);

        // Store for future sessions
        localStorage.setItem(`linera_mine_sig_${address}`, signature);
        localStorage.setItem(`linera_mine_seed_${address}`, seed);
        console.log('💾 Signature stored for future sessions');
      }

      // Store current session
      localStorage.setItem('linera_mine_web3_address', address);
      localStorage.setItem('linera_mine_web3_seed', seed);
      localStorage.setItem('linera_mine_web3_signature', signature);

      setState({
        address,
        isConnecting: false,
        error: null,
        signature,
        seed,
      });

      return { address, seed };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect wallet';
      console.error('❌ Web3 wallet connection failed:', message);
      setState(s => ({ ...s, isConnecting: false, error: message }));
      return null;
    }
  }, [state.isConnecting]);

  /**
   * Check if we have a stored session for any address
   */
  const checkStoredSession = useCallback((): { address: string; seed: string } | null => {
    if (typeof window === 'undefined') return null;

    const storedAddress = localStorage.getItem('linera_mine_web3_address');
    const storedSeed = localStorage.getItem('linera_mine_web3_seed');
    
    if (storedAddress && storedSeed) {
      console.log('📂 Found stored session for:', storedAddress);
      return { address: storedAddress, seed: storedSeed };
    }
    
    return null;
  }, []);

  /**
   * Disconnect and clear stored session
   */
  const disconnect = useCallback(() => {
    const address = state.address;
    
    // Clear session storage
    localStorage.removeItem('linera_mine_web3_address');
    localStorage.removeItem('linera_mine_web3_seed');
    localStorage.removeItem('linera_mine_web3_signature');
    localStorage.removeItem('linera_mine_auth_token');
    
    // Keep the signature for future reconnects (user can clear manually)
    // This allows quick reconnection without re-signing
    
    setState({
      address: null,
      isConnecting: false,
      error: null,
      signature: null,
      seed: null,
    });
    
    console.log('🔌 Web3 wallet disconnected');
  }, [state.address]);

  /**
   * Get shortened address for display
   */
  const shortAddress = state.address
    ? `${state.address.slice(0, 6)}...${state.address.slice(-4)}`
    : null;

  return {
    ...state,
    shortAddress,
    isMetaMaskInstalled: isMetaMaskInstalled(),
    connectAndSign,
    checkStoredSession,
    disconnect,
  };
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export default useWeb3Wallet;
