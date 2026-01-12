/**
 * Linera Endpoint Configuration
 * 
 * This module handles the configuration of Linera network endpoints.
 * Instead of relying on a single port 8081 local service, we support:
 * 
 * 1. Public Faucet - For wallet creation and token distribution
 * 2. Validators - For chain synchronization (gRPC)
 * 3. Custom Node Service - If user runs their own linera service
 * 
 * The app auto-discovers available endpoints and uses the best option.
 */

// ==================== ENDPOINT TYPES ====================

export type EndpointType = 'faucet' | 'node-service' | 'validator';

export interface LineraEndpoint {
  type: EndpointType;
  url: string;
  name: string;
  isAvailable: boolean;
  latency?: number; // ms
}

export interface NetworkConfig {
  name: string;
  faucetUrl: string;
  validators: string[];
  explorerUrl?: string;
}

// ==================== KNOWN NETWORKS ====================

export const NETWORKS: Record<string, NetworkConfig> = {
  'testnet-conway': {
    name: 'Linera Conway Testnet',
    faucetUrl: 'https://faucet.testnet-conway.linera.net',
    validators: [
      'grpcs://validator-1.testnet-conway.linera.net:443',
      'grpcs://validator-3.testnet-conway.linera.net:443',
      'grpcs://validator-4.testnet-conway.linera.net:443',
      'grpcs://linera.nodes.guru:443',
      'grpcs://linera.everstake.one:443',
      'grpcs://linera-testnet.stakefi.network:443',
    ],
    explorerUrl: 'https://explorer.testnet-conway.linera.net',
  },
  'local': {
    name: 'Local Development',
    faucetUrl: 'http://localhost:8079',
    validators: [],
  }
};

// ==================== ENDPOINT CONFIGURATION ====================

export interface EndpointConfig {
  // Primary application endpoint (for GraphQL queries)
  graphqlUrl: string | null;
  
  // Faucet endpoint (for wallet/chain creation)
  faucetUrl: string;
  
  // Chain and application IDs
  chainId: string;
  appId: string;
  
  // Network being used
  network: string;
  
  // Current mode
  mode: 'live' | 'connecting';
}

// Default configuration from environment
const ENV_CONFIG = {
  chainId: import.meta.env.VITE_LINERA_CHAIN_ID || '',
  appId: import.meta.env.VITE_LINERA_APP_ID || '',
  graphqlUrl: import.meta.env.VITE_LINERA_GRAPHQL_URL || null,
  faucetUrl: import.meta.env.VITE_LINERA_FAUCET_URL || NETWORKS['testnet-conway'].faucetUrl,
  network: import.meta.env.VITE_LINERA_NETWORK || 'testnet-conway',
  nodeServicePort: import.meta.env.VITE_LINERA_PORT || '8080',
  useLinera: import.meta.env.VITE_USE_LINERA === 'true',
};

// ==================== ENDPOINT MANAGER ====================

class EndpointManager {
  private config: EndpointConfig;
  private endpoints: LineraEndpoint[] = [];
  private initialized = false;

  constructor() {
    this.config = {
      graphqlUrl: ENV_CONFIG.graphqlUrl,
      faucetUrl: ENV_CONFIG.faucetUrl,
      chainId: ENV_CONFIG.chainId,
      appId: ENV_CONFIG.appId,
      network: ENV_CONFIG.network,
      mode: 'connecting',
    };
  }

  /**
   * Initialize and discover available endpoints
   */
  async initialize(): Promise<EndpointConfig> {
    if (this.initialized) return this.config;

    console.log('🔍 Discovering Linera endpoints...');

    // 1. Check if faucet is available
    const faucetAvailable = await this.checkFaucet();
    console.log(`📡 Faucet: ${faucetAvailable ? '✅ Available' : '❌ Not available'}`);

    // 2. With WASM client, we connect directly via faucet - no GraphQL endpoint needed
    // If faucet is available and we have an App ID, we can run in live mode
    if (faucetAvailable && ENV_CONFIG.appId) {
      this.config.mode = 'live';
      console.log('🎯 WASM Client Mode: Using faucet to connect to Linera');
    } else if (faucetAvailable) {
      // Faucet available but no App ID configured
      console.warn('⚠️ Faucet available but VITE_LINERA_APP_ID not set - staying in connecting mode');
    } else {
      // No faucet available
      console.warn('⚠️ Faucet not available - staying in connecting mode');
    }

    // 3. Optionally check for legacy node service (for backwards compatibility)
    const nodeServiceUrl = await this.findNodeService();
    if (nodeServiceUrl) {
      this.config.graphqlUrl = nodeServiceUrl;
      console.log(`🌐 Node Service: ✅ ${nodeServiceUrl} (optional)`);
    }

    this.initialized = true;
    this.logConfig();
    return this.config;
  }

  /**
   * Check if the faucet is reachable
   */
  private async checkFaucet(): Promise<boolean> {
    try {
      const response = await fetch(this.config.faucetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ version { version } }' }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Try to find an available node service
   * NOTE: When using WASM client, we don't need local node service
   */
  private async findNodeService(): Promise<string | null> {
    const urlsToTry: string[] = [];

    // 1. Environment-specified URL (highest priority)
    if (ENV_CONFIG.graphqlUrl) {
      urlsToTry.push(ENV_CONFIG.graphqlUrl);
    }

    // Skip localhost ports - we're using WASM client which connects directly to validators
    // The old localhost:8080/8081/8082 approach is deprecated
    // const localPorts = ['8080', '8081', '8082', '9080'];

    // 3. Try each URL
    for (const url of urlsToTry) {
      const isAvailable = await this.checkNodeService(url);
      if (isAvailable) {
        return url;
      }
    }

    return null;
  }

  /**
   * Check if a node service is available
   */
  private async checkNodeService(baseUrl: string): Promise<boolean> {
    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ chains { list } }' }),
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.data?.chains?.list !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Build the application GraphQL URL
   */
  getApplicationUrl(chainId?: string, appId?: string): string | null {
    if (!this.config.graphqlUrl) return null;
    
    const chain = chainId || this.config.chainId;
    const app = appId || this.config.appId;
    
    if (!chain || !app) return null;
    
    // If URL already contains /chains/, return as-is
    if (this.config.graphqlUrl.includes('/chains/')) {
      return this.config.graphqlUrl;
    }
    
    return `${this.config.graphqlUrl}/chains/${chain}/applications/${app}`;
  }

  /**
   * Get the WebSocket URL for subscriptions
   */
  getWebSocketUrl(): string | null {
    if (!this.config.graphqlUrl) return null;
    
    const url = new URL(this.config.graphqlUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    return url.toString();
  }

  /**
   * Get current configuration
   */
  getConfig(): EndpointConfig {
    return { ...this.config };
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(updates: Partial<EndpointConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logConfig();
  }

  /**
   * Check if we're in live mode (connected to blockchain)
   */
  isLiveMode(): boolean {
    return this.config.mode === 'live';
  }

  /**
   * Check if we're still connecting
   */
  isConnecting(): boolean {
    return this.config.mode === 'connecting';
  }

  /**
   * Log current configuration
   */
  private logConfig(): void {
    console.log('🔗 Linera Endpoint Configuration:', {
      mode: this.config.mode,
      network: this.config.network,
      graphqlUrl: this.config.graphqlUrl || 'None (WASM mode)',
      faucetUrl: this.config.faucetUrl,
      chainId: this.config.chainId ? `${this.config.chainId.substring(0, 16)}...` : 'Not set',
      appId: this.config.appId ? `${this.config.appId.substring(0, 16)}...` : 'Not set',
    });
  }
}

// ==================== SINGLETON INSTANCE ====================

export const endpointManager = new EndpointManager();

// ==================== HELPER FUNCTIONS ====================

/**
 * Initialize endpoints and return configuration
 */
export async function initializeEndpoints(): Promise<EndpointConfig> {
  return endpointManager.initialize();
}

/**
 * Get the current endpoint configuration
 */
export function getEndpointConfig(): EndpointConfig {
  return endpointManager.getConfig();
}

/**
 * Get the application GraphQL URL
 */
export function getApplicationUrl(chainId?: string, appId?: string): string | null {
  return endpointManager.getApplicationUrl(chainId, appId);
}

/**
 * Check if we're in live mode
 */
export function isLiveMode(): boolean {
  return endpointManager.isLiveMode();
}

/**
 * Check if we're still connecting
 */
export function isConnecting(): boolean {
  return endpointManager.isConnecting();
}

/**
 * Get network info
 */
export function getNetworkInfo(): NetworkConfig {
  const config = endpointManager.getConfig();
  return NETWORKS[config.network] || NETWORKS['testnet-conway'];
}

export default endpointManager;
