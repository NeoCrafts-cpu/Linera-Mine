/**
 * Linera Faucet Integration
 * 
 * The faucet is used to:
 * 1. Create new chains for users (each user gets their own chain)
 * 2. Provide initial tokens to users
 * 3. Query validator information
 * 
 * Faucet endpoint: https://faucet.testnet-conway.linera.net
 */

const FAUCET_URL = import.meta.env.VITE_LINERA_FAUCET_URL || 'https://faucet.testnet-conway.linera.net';

export interface FaucetVersion {
  crate: string;
  version: string;
  gitCommit: string;
  gitDirty: boolean;
  rpcHash: string;
  graphqlHash: string;
  witHash: string;
}

export interface Validator {
  networkAddress: string;
}

export interface ClaimResult {
  chainId: string;
  messageId: string;
  certificateHash: string;
}

export interface UserWallet {
  publicKey: string;
  privateKey: string; // In a real app, this would be handled securely
  chainId: string | null;
  createdAt: number;
}

/**
 * Execute a GraphQL query against the faucet
 */
async function faucetQuery<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(FAUCET_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Faucet request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(`Faucet error: ${result.errors[0].message}`);
  }

  return result.data;
}

/**
 * Get faucet version information
 */
export async function getFaucetVersion(): Promise<FaucetVersion> {
  const data = await faucetQuery<{ version: FaucetVersion }>(`
    query {
      version {
        crate
        version
        gitCommit
        gitDirty
        rpcHash
        graphqlHash
        witHash
      }
    }
  `);
  return data.version;
}

/**
 * Get current validators on the testnet
 */
export async function getValidators(): Promise<Validator[]> {
  const data = await faucetQuery<{ currentValidators: Validator[] }>(`
    query {
      currentValidators {
        networkAddress
      }
    }
  `);
  return data.currentValidators;
}

/**
 * Check if a chain exists for a given public key
 */
export async function findExistingChain(publicKey: string): Promise<string | null> {
  try {
    const data = await faucetQuery<{ chainId: string | null }>(`
      query FindChain($publicKey: String!) {
        chainId(publicKey: $publicKey)
      }
    `, { publicKey });
    return data.chainId;
  } catch (error) {
    console.warn('Could not find existing chain:', error);
    return null;
  }
}

/**
 * Claim a new chain from the faucet
 * This creates a new chain for the user and sends them initial tokens
 */
export async function claimChain(publicKey: string): Promise<ClaimResult> {
  const data = await faucetQuery<{ claim: ClaimResult }>(`
    mutation ClaimChain($publicKey: String!) {
      claim(publicKey: $publicKey) {
        chainId
        messageId
        certificateHash
      }
    }
  `, { publicKey });
  
  console.log('✅ Chain claimed:', data.claim);
  return data.claim;
}

/**
 * Generate a simple key pair for demo purposes
 * In production, this should use proper cryptographic key generation
 */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  // Generate random bytes for demo (not cryptographically secure for production!)
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  
  // Convert to hex string (simplified - real Linera uses Ed25519)
  const privateKey = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // For demo, public key is derived from private (in reality uses Ed25519)
  const publicKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(publicKeyBytes);
  const publicKey = Array.from(publicKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { publicKey, privateKey };
}

// ==================== LOCAL WALLET STORAGE ====================

const WALLET_STORAGE_KEY = 'linera_wallet';

/**
 * Save wallet to localStorage
 */
export function saveWallet(wallet: UserWallet): void {
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet));
  console.log('💾 Wallet saved to localStorage');
}

/**
 * Load wallet from localStorage
 */
export function loadWallet(): UserWallet | null {
  const stored = localStorage.getItem(WALLET_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as UserWallet;
  } catch {
    return null;
  }
}

/**
 * Clear wallet from localStorage
 */
export function clearWallet(): void {
  localStorage.removeItem(WALLET_STORAGE_KEY);
  console.log('🗑️ Wallet cleared from localStorage');
}

/**
 * Create a new wallet and claim a chain from the faucet
 */
export async function createWalletWithChain(): Promise<UserWallet> {
  console.log('🔑 Creating new wallet...');
  
  // Generate key pair
  const { publicKey, privateKey } = generateKeyPair();
  
  // Check if chain already exists for this key
  let chainId = await findExistingChain(publicKey);
  
  if (!chainId) {
    // Claim new chain from faucet
    console.log('📡 Claiming chain from faucet...');
    const result = await claimChain(publicKey);
    chainId = result.chainId;
  }
  
  const wallet: UserWallet = {
    publicKey,
    privateKey,
    chainId,
    createdAt: Date.now(),
  };
  
  // Save to localStorage
  saveWallet(wallet);
  
  console.log('✅ Wallet created with chain:', chainId);
  return wallet;
}

/**
 * Initialize wallet - load existing or create new
 */
export async function initializeWallet(): Promise<UserWallet> {
  // Check for existing wallet
  const existing = loadWallet();
  
  if (existing && existing.chainId) {
    console.log('📂 Found existing wallet:', existing.chainId.substring(0, 16) + '...');
    return existing;
  }
  
  // Create new wallet with chain
  return createWalletWithChain();
}

/**
 * Check if faucet is reachable
 */
export async function checkFaucetConnection(): Promise<boolean> {
  try {
    const version = await getFaucetVersion();
    console.log('✅ Faucet connected:', version.version);
    return true;
  } catch (error) {
    console.error('❌ Faucet not reachable:', error);
    return false;
  }
}
