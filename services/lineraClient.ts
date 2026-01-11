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
 */

// Configuration from environment
const LINERA_HOST = import.meta.env.VITE_LINERA_HOST || 'localhost';
const LINERA_PORT = import.meta.env.VITE_LINERA_PORT || '8080';
const LINERA_CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID || '';
const LINERA_APP_ID = import.meta.env.VITE_LINERA_APP_ID || '';
const USE_HTTPS = import.meta.env.VITE_LINERA_USE_HTTPS === 'true';

// Build base URLs
const HTTP_PROTOCOL = USE_HTTPS ? 'https' : 'http';
const WS_PROTOCOL = USE_HTTPS ? 'wss' : 'ws';

export interface LineraClientConfig {
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
  private httpProtocol: string;
  private wsProtocol: string;

  constructor(config?: Partial<LineraClientConfig>) {
    this.config = {
      host: config?.host || LINERA_HOST,
      port: config?.port || LINERA_PORT,
      chainId: config?.chainId || LINERA_CHAIN_ID,
      appId: config?.appId || LINERA_APP_ID,
      useHttps: config?.useHttps ?? USE_HTTPS,
    };
    this.httpProtocol = this.config.useHttps ? 'https' : 'http';
    this.wsProtocol = this.config.useHttps ? 'wss' : 'ws';
  }

  // ==================== URL BUILDERS ====================

  /**
   * Get the base URL for the node service
   * Pattern: http://localhost:8080/
   */
  getNodeServiceUrl(): string {
    return `${this.httpProtocol}://${this.config.host}:${this.config.port}`;
  }

  /**
   * Get the application GraphQL endpoint
   * Pattern: http://localhost:8080/chains/{chainId}/applications/{appId}
   */
  getApplicationUrl(chainId?: string, appId?: string): string {
    const chain = chainId || this.config.chainId;
    const app = appId || this.config.appId;
    return `${this.getNodeServiceUrl()}/chains/${chain}/applications/${app}`;
  }

  /**
   * Get the WebSocket URL for subscriptions
   * Pattern: ws://localhost:8080/ws
   */
  getWebSocketUrl(): string {
    return `${this.wsProtocol}://${this.config.host}:${this.config.port}/ws`;
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
