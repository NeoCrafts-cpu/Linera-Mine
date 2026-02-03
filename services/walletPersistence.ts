/**
 * Wallet Persistence Service
 * 
 * Frontend service for interacting with the wallet persistence backend.
 * Enables persistent wallet storage across sessions with encrypted signer keys.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface WalletData {
  chainId: string;
  address: string;
  signerKey?: string;
}

interface UserInfo {
  id: number;
  email?: string;
  chainId: string;
  address: string;
  createdAt: string;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  token?: string;
  user?: UserInfo;
}

// Store session token
let sessionToken: string | null = null;

/**
 * Set the session token for authenticated requests
 */
export function setSessionToken(token: string | null): void {
  sessionToken = token;
  if (token) {
    localStorage.setItem('linera_session_token', token);
  } else {
    localStorage.removeItem('linera_session_token');
  }
}

/**
 * Get the current session token
 */
export function getSessionToken(): string | null {
  if (!sessionToken) {
    sessionToken = localStorage.getItem('linera_session_token');
  }
  return sessionToken;
}

/**
 * Make an authenticated request to the backend
 */
async function authFetch(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  const token = getSessionToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

/**
 * Connect wallet - creates or retrieves user by chain ID
 */
export async function connectWallet(wallet: WalletData): Promise<AuthResponse> {
  try {
    const response = await authFetch('/api/auth/wallet', {
      method: 'POST',
      body: JSON.stringify({
        chainId: wallet.chainId,
        address: wallet.address,
        signerKey: wallet.signerKey,
      }),
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      setSessionToken(data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Wallet connection failed:', error);
    return { success: false, error: 'Failed to connect to backend' };
  }
}

/**
 * Register with email for wallet recovery
 */
export async function registerWithEmail(
  email: string, 
  password: string, 
  wallet: WalletData
): Promise<AuthResponse> {
  try {
    const response = await authFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        chainId: wallet.chainId,
        address: wallet.address,
        signerKey: wallet.signerKey,
      }),
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      setSessionToken(data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Registration failed:', error);
    return { success: false, error: 'Failed to register' };
  }
}

/**
 * Login with email to recover wallet
 */
export async function loginWithEmail(
  email: string, 
  password: string
): Promise<AuthResponse & { wallet?: { chainId: string; address: string } }> {
  try {
    const response = await authFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      setSessionToken(data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error: 'Failed to login' };
  }
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<UserInfo | null> {
  try {
    const response = await authFetch('/api/auth/me');
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Logout - clear session
 */
export async function logout(): Promise<void> {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    setSessionToken(null);
  }
}

/**
 * Recover wallet signer key (requires auth and password)
 */
export async function recoverWallet(
  password: string
): Promise<{ success: boolean; signerKey?: string; error?: string }> {
  try {
    const response = await authFetch(`/api/wallet/recover?password=${encodeURIComponent(password)}`);
    return await response.json();
  } catch (error) {
    console.error('Wallet recovery failed:', error);
    return { success: false, error: 'Failed to recover wallet' };
  }
}

/**
 * Update wallet address
 */
export async function updateWalletAddress(address: string): Promise<AuthResponse> {
  try {
    const response = await authFetch('/api/wallet', {
      method: 'PUT',
      body: JSON.stringify({ address }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to update wallet:', error);
    return { success: false, error: 'Failed to update wallet' };
  }
}

/**
 * Export wallet info (chain ID and address only, not signer key)
 */
export async function exportWallet(): Promise<{
  success: boolean;
  chainId?: string;
  address?: string;
  error?: string;
}> {
  try {
    const response = await authFetch('/api/wallet/export');
    return await response.json();
  } catch (error) {
    console.error('Failed to export wallet:', error);
    return { success: false, error: 'Failed to export wallet' };
  }
}

/**
 * Check if backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  connectWallet,
  registerWithEmail,
  loginWithEmail,
  getCurrentUser,
  logout,
  recoverWallet,
  updateWalletAddress,
  exportWallet,
  checkBackendHealth,
  setSessionToken,
  getSessionToken,
};
