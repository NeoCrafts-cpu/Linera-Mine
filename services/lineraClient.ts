/**
 * @deprecated This file is deprecated and should be deleted.
 * The app now uses the WASM adapter from './linera/index' instead.
 * This file is excluded from TypeScript compilation via tsconfig.json.
 * 
 * TODO: Delete this file when able to modify filesystem.
 */

/**
 * Linera GraphQL Client
 * 
 * This follows the official Linera protocol pattern for connecting to applications.
 * Based on: https://github.com/linera-io/linera-protocol/tree/main/examples/fungible/web-frontend
 * 
 * Key endpoints:
 * - HTTP: http://{host}:{port}/chains/{chainId}/applications/{appId}
 * - WebSocket: ws://{host}:{port}/ws
 * - Node Service: http://{host}:{port}/
 * 
 * This client integrates with the endpoint manager for flexible configuration.
 * It can work with:
 * - Local development node services
 * - Remote deployed node services
 * - Any Linera node service URL
 */

import { endpointManager, getEndpointConfig, type EndpointConfig } from './endpointConfig';

export interface LineraClientConfig {
  // Base URL for node service (e.g., http://localhost:8080 or https://node.example.com)
  nodeServiceUrl?: string;
  chainId: string;
  appId: string;
}

// For backward compatibility
export interface LegacyLineraClientConfig {
  host: string;
  port: string | number;
  chainId: string;
  appId: string;
  useHttps?: boolean;
}

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface NotificationEvent {
  reason: 'NewBlock' | 'NewIncomingBundle' | 'NewRound';
  chainId: string;
  height?: number;
  hash?: string;
}

/**
 * Linera GraphQL Client
 * Provides methods for querying applications and the node service
 */
export class LineraClient {
  private config: LineraClientConfig;
  private nodeServiceUrl: string;

  constructor(config?: Partial<LineraClientConfig> | Partial<LegacyLineraClientConfig>) {
    // Get endpoint configuration
    const endpointConfig = getEndpointConfig();
    
    // Handle legacy config format (host + port)
    if (config && 'host' in config) {
      const legacyConfig = config as LegacyLineraClientConfig;
      const protocol = legacyConfig.useHttps ? 'https' : 'http';
      this.nodeServiceUrl = `${protocol}://${legacyConfig.host}:${legacyConfig.port}`;
      this.config = {
        nodeServiceUrl: this.nodeServiceUrl,
        chainId: legacyConfig.chainId || endpointConfig.chainId,
        appId: legacyConfig.appId || endpointConfig.appId,
      };
    } else {
      // Modern config format or use endpoint manager
      const modernConfig = config as Partial<LineraClientConfig> | undefined;
      this.nodeServiceUrl = modernConfig?.nodeServiceUrl || endpointConfig.graphqlUrl || '';
      this.config = {
        nodeServiceUrl: this.nodeServiceUrl,
        chainId: modernConfig?.chainId || endpointConfig.chainId,
        appId: modernConfig?.appId || endpointConfig.appId,
      };
    }
  }

  // ==================== URL BUILDERS ====================

  /**
   * Get the base URL for the node service
   * Pattern: http://localhost:8080/ or https://node.example.com/
   */
  getNodeServiceUrl(): string {
    return this.nodeServiceUrl;
  }

  /**
   * Get the application GraphQL endpoint
   * Pattern: http://localhost:8080/chains/{chainId}/applications/{appId}
   */
  getApplicationUrl(chainId?: string, appId?: string): string {
    const chain = chainId || this.config.chainId;
    const app = appId || this.config.appId;
    
    // If the URL already contains the full path, return as-is
    if (this.nodeServiceUrl.includes('/chains/')) {
      return this.nodeServiceUrl;
    }
    
    return `${this.nodeServiceUrl}/chains/${chain}/applications/${app}`;
  }

  /**
   * Get the WebSocket URL for subscriptions
   * Pattern: ws://localhost:8080/ws or wss://node.example.com/ws
   */
  getWebSocketUrl(): string {
    if (!this.nodeServiceUrl) return '';
    
    try {
      const url = new URL(this.nodeServiceUrl);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = '/ws';
      return url.toString();
    } catch {
      // Fallback for relative URLs or invalid URLs
      const isHttps = this.nodeServiceUrl.startsWith('https');
      const wsProtocol = isHttps ? 'wss' : 'ws';
      return this.nodeServiceUrl.replace(/^https?/, wsProtocol) + '/ws';
    }
  }

  /**
   * Check if the client has a valid node service URL
   */
  hasNodeService(): boolean {
    return !!this.nodeServiceUrl && this.nodeServiceUrl.length > 0;
  }

  // ==================== GRAPHQL QUERIES ====================

  /**
   * Execute a GraphQL query against the node service
   */
  async queryNodeService<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<GraphQLResponse<T>> {
    const url = this.getNodeServiceUrl();
    return this.executeQuery<T>(url, query, variables);
  }

  /**
   * Execute a GraphQL query against an application
   */
  async queryApplication<T = any>(
    query: string,
    variables?: Record<string, any>,
    chainId?: string,
    appId?: string
  ): Promise<GraphQLResponse<T>> {
    const url = this.getApplicationUrl(chainId, appId);
    return this.executeQuery<T>(url, query, variables);
  }

  /**
   * Execute a GraphQL mutation against an application
   */
  async mutateApplication<T = any>(
    mutation: string,
    variables?: Record<string, any>,
    chainId?: string,
    appId?: string
  ): Promise<GraphQLResponse<T>> {
    const url = this.getApplicationUrl(chainId, appId);
    return this.executeQuery<T>(url, mutation, variables);
  }

  /**
   * Internal method to execute GraphQL queries
   */
  private async executeQuery<T>(
    url: string,
    query: string,
    variables?: Record<string, any>
  ): Promise<GraphQLResponse<T>> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // ==================== NODE SERVICE QUERIES ====================

  /**
   * Get all chains in the wallet
   */
  async getChains(): Promise<{ list: string[]; default: string | null }> {
    const query = `
      query {
        chains {
          list
          default
        }
      }
    `;
    const result = await this.queryNodeService<{ chains: { list: string[]; default: string | null } }>(query);
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
    return result.data!.chains;
  }

  /**
   * Get all applications on a chain
   */
  async getApplications(chainId?: string): Promise<Array<{ id: string; link: string; description: any }>> {
    const chain = chainId || this.config.chainId;
    const query = `
      query GetApplications($chainId: ChainId!) {
        applications(chainId: $chainId) {
          id
          link
          description
        }
      }
    `;
    const result = await this.queryNodeService<{ applications: Array<{ id: string; link: string; description: any }> }>(
      query,
      { chainId: chain }
    );
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
    return result.data!.applications;
  }

  /**
   * Get chain state
   */
  async getChainState(chainId?: string): Promise<any> {
    const chain = chainId || this.config.chainId;
    const query = `
      query GetChain($chainId: ChainId!) {
        chain(chainId: $chainId) {
          chainId
          executionState {
            system {
              balance
            }
          }
        }
      }
    `;
    const result = await this.queryNodeService<{ chain: any }>(query, { chainId: chain });
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
    return result.data!.chain;
  }

  // ==================== WEBSOCKET SUBSCRIPTIONS ====================

  /**
   * Subscribe to chain notifications
   * Returns a cleanup function to close the connection
   */
  subscribeToNotifications(
    chainId: string,
    onNotification: (notification: NotificationEvent) => void,
    onError?: (error: Error) => void
  ): () => void {
    const wsUrl = this.getWebSocketUrl();
    
    // Create WebSocket connection with graphql-transport-ws protocol
    const ws = new WebSocket(wsUrl, 'graphql-transport-ws');
    
    ws.onopen = () => {
      // Initialize connection
      ws.send(JSON.stringify({ type: 'connection_init' }));
      
      // Subscribe to notifications after connection ack
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: '1',
          type: 'subscribe',
          payload: {
            query: `
              subscription Notifications($chainId: ChainId!) {
                notifications(chainId: $chainId) {
                  reason
                  chainId
                }
              }
            `,
            variables: { chainId }
          }
        }));
      }, 100);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'next' && data.payload?.data?.notifications) {
          onNotification(data.payload.data.notifications);
        }
      } catch (e) {
        console.error('Failed to parse notification:', e);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      onError?.(new Error('WebSocket connection error'));
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Return cleanup function
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ id: '1', type: 'complete' }));
        ws.close();
      }
    };
  }

  // ==================== CONNECTION CHECK ====================

  /**
   * Check if the node service is reachable
   */
  async isConnected(): Promise<boolean> {
    try {
      const result = await this.queryNodeService<{ chains: { list: string[] } }>(`
        query { chains { list } }
      `);
      return !result.errors && result.data?.chains?.list !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Check if an application is accessible
   */
  async isApplicationAccessible(chainId?: string, appId?: string): Promise<boolean> {
    try {
      const result = await this.queryApplication<any>(`
        query { __typename }
      `, undefined, chainId, appId);
      return !result.errors;
    } catch {
      return false;
    }
  }

  // ==================== GETTERS ====================

  getConfig(): LineraClientConfig {
    return { ...this.config };
  }

  getChainId(): string {
    return this.config.chainId;
  }

  getAppId(): string {
    return this.config.appId;
  }
}

// ==================== SINGLETON INSTANCE ====================

let defaultClient: LineraClient | null = null;

/**
 * Get or create the default Linera client
 */
export function getLineraClient(config?: Partial<LineraClientConfig>): LineraClient {
  if (!defaultClient || config) {
    defaultClient = new LineraClient(config);
  }
  return defaultClient;
}

/**
 * Reset the default client (useful for testing or reconfiguration)
 */
export function resetLineraClient(): void {
  defaultClient = null;
}

// ==================== EXPORTS ====================

export default LineraClient;
