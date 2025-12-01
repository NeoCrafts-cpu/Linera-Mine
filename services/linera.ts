// Linera GraphQL client for connecting React frontend to Linera blockchain
// This module provides typed GraphQL queries and mutations for your Linera application

const GRAPHQL_URL = import.meta.env.VITE_LINERA_GRAPHQL_URL || 'http://localhost:8080';
const CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID || '';
const APP_ID = import.meta.env.VITE_LINERA_APP_ID || '';
const PORT = import.meta.env.VITE_LINERA_PORT || '8080';

// Build the base URL for the Linera service
const getBaseUrl = () => {
  // If GRAPHQL_URL already contains the full path, use it directly
  if (GRAPHQL_URL.includes('/chains/')) {
    return GRAPHQL_URL;
  }
  // Otherwise, construct the URL
  return `http://localhost:${PORT}`;
};

// Build the application-specific URL
const getAppUrl = () => {
  if (GRAPHQL_URL.includes('/chains/')) {
    return GRAPHQL_URL;
  }
  if (CHAIN_ID && APP_ID) {
    return `${getBaseUrl()}/chains/${CHAIN_ID}/applications/${APP_ID}`;
  }
  return GRAPHQL_URL;
};

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; locations?: any; path?: any }>;
}

/**
 * Execute a GraphQL query or mutation against the Linera node service
 */
export async function graphqlRequest<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const url = getAppUrl();
  try {
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

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    if (!result.data) {
      throw new Error('No data returned from GraphQL query');
    }

    return result.data;
  } catch (error) {
    console.error('Linera GraphQL request failed:', error);
    throw error;
  }
}

/**
 * Query available chains for the current wallet
 */
export async function getChains(): Promise<any> {
  const query = `
    query {
      chains {
        list
      }
    }
  `;
  return graphqlRequest(query);
}

/**
 * Query chain information
 */
export async function getChainInfo(chainId: string): Promise<any> {
  const query = `
    query($chainId: ChainId!) {
      chain(chainId: $chainId) {
        chainId
        tipState {
          blockHash
          nextBlockHeight
        }
      }
    }
  `;
  return graphqlRequest(query, { chainId });
}

/**
 * Query applications deployed on a chain
 */
export async function getApplications(chainId: string): Promise<any> {
  const query = `
    query($chainId: ChainId!) {
      applications(chainId: $chainId) {
        id
        description
        link
      }
    }
  `;
  return graphqlRequest(query, { chainId });
}

/**
 * Example: Query a specific application's state
 * Replace with your actual application schema once deployed
 */
export async function queryApplicationState(
  chainId: string,
  applicationId: string,
  applicationQuery: string,
  variables?: Record<string, any>
): Promise<any> {
  // Application-specific queries go to:
  // http://localhost:<port>/chains/<chain-id>/applications/<application-id>
  const appUrl = `${getBaseUrl()}/chains/${chainId}/applications/${applicationId}`;
  
  const response = await fetch(appUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: applicationQuery, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

/**
 * Health check for Linera node service
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(getBaseUrl());
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if Linera connection is available
 */
export async function checkLineraConnection(): Promise<boolean> {
  try {
    const chains = await getChains();
    return !!chains;
  } catch {
    return false;
  }
}

/**
 * Get the wallet address from environment or chain default owner
 */
export async function getLineraWalletAddress(): Promise<string | null> {
  try {
    // First try to get from environment variable
    const envOwner = import.meta.env.VITE_LINERA_WALLET_OWNER;
    if (envOwner) {
      return envOwner;
    }
    
    // Fallback to querying chain info
    const chainId = import.meta.env.VITE_LINERA_CHAIN_ID;
    if (!chainId) return null;
    
    const info = await getChainInfo(chainId);
    return info?.description?.owner || null;
  } catch {
    return null;
  }
}

/**
 * Get the configured chain ID
 */
export function getChainId(): string | null {
  return import.meta.env.VITE_LINERA_CHAIN_ID || null;
}

export default {
  graphqlRequest,
  getChains,
  getChainInfo,
  getApplications,
  queryApplicationState,
  healthCheck,
  checkLineraConnection,
  getLineraWalletAddress,
  getChainId,
};
