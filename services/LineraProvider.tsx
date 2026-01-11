/**
 * Linera GraphQL Provider
 * 
 * Based on the official Linera examples pattern:
 * - https://github.com/linera-io/linera-protocol/tree/main/examples/fungible/web-frontend
 * - https://github.com/linera-io/linera-protocol/tree/main/examples/social/web-frontend
 * - https://github.com/linera-io/linera-protocol/tree/main/examples/non-fungible/web-frontend
 * 
 * Key patterns from Linera examples:
 * 1. Use Apollo Client with split links (HTTP for queries/mutations, WebSocket for subscriptions)
 * 2. Application endpoint: http://localhost:{port}/chains/{chainId}/applications/{appId}
 * 3. WebSocket endpoint: ws://localhost:{port}/ws
 * 4. Pass chainId, applicationId, port as props to provider
 */

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { LineraClient, LineraClientConfig, GraphQLResponse, NotificationEvent } from './lineraClient';

// ==================== CONTEXT TYPES ====================

interface LineraContextValue {
  client: LineraClient;
  chainId: string;
  appId: string;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  
  // Query methods
  query: <T = any>(queryString: string, variables?: Record<string, any>) => Promise<T>;
  mutate: <T = any>(mutation: string, variables?: Record<string, any>) => Promise<T>;
  
  // Subscription
  subscribe: (onNotification: (notification: NotificationEvent) => void) => () => void;
  
  // Connection management
  checkConnection: () => Promise<boolean>;
  reconnect: () => Promise<void>;
}

const LineraContext = createContext<LineraContextValue | null>(null);

// ==================== PROVIDER PROPS ====================

interface LineraProviderProps {
  children: ReactNode;
  chainId?: string;
  applicationId?: string;
  port?: string | number;
  host?: string;
  useHttps?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

// ==================== PROVIDER COMPONENT ====================

/**
 * LineraProvider - Provides Linera GraphQL client context to children
 * 
 * Usage (following official Linera pattern):
 * ```tsx
 * <LineraProvider chainId={chainId} applicationId={appId} port={8080}>
 *   <App />
 * </LineraProvider>
 * ```
 */
export function LineraProvider({ 
  children,
  chainId,
  applicationId,
  port = '8080',
  host = 'localhost',
  useHttps = false,
  onConnectionChange
}: LineraProviderProps) {
  const [client] = useState(() => new LineraClient({
    chainId: chainId || '',
    appId: applicationId || '',
    port: String(port),
    host,
    useHttps
  }));
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check connection on mount
  useEffect(() => {
    const checkInitialConnection = async () => {
      setIsLoading(true);
      try {
        const connected = await client.isConnected();
        setIsConnected(connected);
        setError(null);
        onConnectionChange?.(connected);
      } catch (err) {
        setIsConnected(false);
        setError(err instanceof Error ? err : new Error('Connection failed'));
        onConnectionChange?.(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkInitialConnection();
  }, [client, onConnectionChange]);

  // Query method
  const query = useCallback(async <T = any>(queryString: string, variables?: Record<string, any>): Promise<T> => {
    const response = await client.queryApplication<T>(queryString, variables);
    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].message);
    }
    return response.data as T;
  }, [client]);

  // Mutate method
  const mutate = useCallback(async <T = any>(mutation: string, variables?: Record<string, any>): Promise<T> => {
    const response = await client.mutateApplication<T>(mutation, variables);
    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].message);
    }
    return response.data as T;
  }, [client]);

  // Subscribe method
  const subscribe = useCallback((onNotification: (notification: NotificationEvent) => void) => {
    return client.subscribeToNotifications(
      chainId || client.getChainId(),
      onNotification,
      (err) => setError(err)
    );
  }, [client, chainId]);

  // Check connection
  const checkConnection = useCallback(async () => {
    const connected = await client.isConnected();
    setIsConnected(connected);
    onConnectionChange?.(connected);
    return connected;
  }, [client, onConnectionChange]);

  // Reconnect
  const reconnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await checkConnection();
    setIsLoading(false);
  }, [checkConnection]);

  const contextValue: LineraContextValue = {
    client,
    chainId: chainId || client.getChainId(),
    appId: applicationId || client.getAppId(),
    isConnected,
    isLoading,
    error,
    query,
    mutate,
    subscribe,
    checkConnection,
    reconnect
  };

  return (
    <LineraContext.Provider value={contextValue}>
      {children}
    </LineraContext.Provider>
  );
}

// ==================== HOOKS ====================

/**
 * useLinera - Access the Linera client context
 * 
 * Usage:
 * ```tsx
 * const { query, mutate, isConnected } = useLinera();
 * ```
 */
export function useLinera(): LineraContextValue {
  const context = useContext(LineraContext);
  if (!context) {
    throw new Error('useLinera must be used within a LineraProvider');
  }
  return context;
}

/**
 * useLineraQuery - Execute a GraphQL query with state management
 * 
 * Based on Apollo's useQuery pattern used in Linera examples.
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error, refetch } = useLineraQuery<JobsData>(`
 *   query { jobs { id title payment } }
 * `);
 * ```
 */
export function useLineraQuery<T = any>(
  queryString: string,
  options?: {
    variables?: Record<string, any>;
    skip?: boolean;
    onCompleted?: (data: T) => void;
    onError?: (error: Error) => void;
    fetchPolicy?: 'cache-first' | 'network-only';
  }
) {
  const { query, isConnected } = useLinera();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (options?.skip || !isConnected) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await query<T>(queryString, options?.variables);
      setData(result);
      options?.onCompleted?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Query failed');
      setError(error);
      options?.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [query, queryString, options?.variables, options?.skip, isConnected]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

/**
 * useLazyLineraQuery - Execute a GraphQL query on demand
 * 
 * Based on Apollo's useLazyQuery pattern used in Linera NFT example.
 * 
 * Usage:
 * ```tsx
 * const [getJobs, { data, loading, error }] = useLazyLineraQuery<JobsData>(`
 *   query GetJobs($status: String) { jobs(status: $status) { id title } }
 * `);
 * 
 * // Call when needed
 * getJobs({ variables: { status: 'open' } });
 * ```
 */
export function useLazyLineraQuery<T = any>(queryString: string) {
  const { query } = useLinera();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [called, setCalled] = useState(false);

  const execute = useCallback(async (options?: {
    variables?: Record<string, any>;
    onCompleted?: (data: T) => void;
    onError?: (error: Error) => void;
  }) => {
    setCalled(true);
    setLoading(true);
    setError(null);
    
    try {
      const result = await query<T>(queryString, options?.variables);
      setData(result);
      options?.onCompleted?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Query failed');
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [query, queryString]);

  return [execute, { data, loading, error, called }] as const;
}

/**
 * useLoneraMutation - Execute a GraphQL mutation
 * 
 * Based on Apollo's useMutation pattern used in Linera examples.
 * 
 * Usage:
 * ```tsx
 * const [postJob, { data, loading, error }] = useLineraMutation(`
 *   mutation PostJob($title: String!, $payment: String!) {
 *     postJob(title: $title, payment: $payment)
 *   }
 * `);
 * 
 * // Call the mutation
 * await postJob({ variables: { title: 'My Job', payment: '100' } });
 * ```
 */
export function useLineraMutation<T = any>(mutationString: string) {
  const { mutate } = useLinera();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (options?: {
    variables?: Record<string, any>;
    onCompleted?: (data: T) => void;
    onError?: (error: Error) => void;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await mutate<T>(mutationString, options?.variables);
      setData(result);
      options?.onCompleted?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Mutation failed');
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mutate, mutationString]);

  return [execute, { data, loading, error }] as const;
}

/**
 * useLineraSubscription - Subscribe to chain notifications
 * 
 * Based on Apollo's useSubscription pattern used in Linera Social example.
 * 
 * Usage:
 * ```tsx
 * useLineraSubscription({
 *   onData: (notification) => {
 *     console.log('New notification:', notification);
 *     refetchJobs(); // Refetch data when chain updates
 *   }
 * });
 * ```
 */
export function useLineraSubscription(options: {
  onData: (notification: NotificationEvent) => void;
  onError?: (error: Error) => void;
  skip?: boolean;
}) {
  const { subscribe, chainId, isConnected } = useLinera();

  useEffect(() => {
    if (options.skip || !isConnected || !chainId) return;

    const unsubscribe = subscribe((notification) => {
      options.onData(notification);
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe, chainId, isConnected, options.skip, options.onData]);
}

// ==================== EXPORTS ====================

export default LineraProvider;
