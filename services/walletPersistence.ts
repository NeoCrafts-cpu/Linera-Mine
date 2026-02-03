/**
 * Wallet Persistence Service
 * 
 * Re-exports auth functions from backendApi for backward compatibility.
 * The backendApi now handles wallet persistence, jobs, agents, and user management.
 */

import {
  connectWallet as backendConnectWallet,
  registerWithEmail,
  loginWithEmail,
  getCurrentUser,
  logout,
  updateWallet,
  type AuthUser,
  type AuthResponse,
} from './backendApi';

// Named exports
export {
  registerWithEmail,
  loginWithEmail,
  getCurrentUser,
  logout,
  updateWallet,
  type AuthUser,
  type AuthResponse,
};

/**
 * Connect wallet to backend (with optional signer key)
 */
export async function connectWallet(data: { chainId: string; address: string; signerKey?: string }): Promise<AuthResponse> {
  return backendConnectWallet(data.chainId, data.address);
}

/**
 * Sync wallet alias
 */
export const syncWallet = connectWallet;

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

// Default export for backward compatibility
const walletPersistence = {
  connectWallet,
  syncWallet,
  registerWithEmail,
  loginWithEmail,
  getCurrentUser,
  logout,
  updateWallet,
  isAuthenticated,
};

export default walletPersistence;
