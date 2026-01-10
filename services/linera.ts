// Linera GraphQL client for connecting React frontend to Linera blockchain
// This module provides typed GraphQL queries and mutations for your Linera application

const GRAPHQL_URL = import.meta.env.VITE_LINERA_GRAPHQL_URL || 'http://localhost:8081';
const CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID || '';
const APP_ID = import.meta.env.VITE_LINERA_APP_ID || '';
const PORT = import.meta.env.VITE_LINERA_PORT || '8081';

// Detect if we're in production (Render/Vercel) or local development
const isProduction = GRAPHQL_URL.startsWith('https://') || 
                     (typeof window !== 'undefined' && window.location.protocol === 'https:');

// Build the base URL for the Linera service
const getBaseUrl = () => {
  // If GRAPHQL_URL already contains the full path, extract base
  if (GRAPHQL_URL.includes('/chains/')) {
    return GRAPHQL_URL.split('/chains/')[0];
  }
  // If it's a full URL (production), use it
  if (GRAPHQL_URL.startsWith('http')) {
    return GRAPHQL_URL;
  }
  // Otherwise, construct localhost URL
  return `http://localhost:${PORT}`;
};

// Build the application-specific URL
const getAppUrl = () => {
  // If GRAPHQL_URL already contains the full path, use it directly
  if (GRAPHQL_URL.includes('/chains/')) {
    return GRAPHQL_URL;
  }
  // Construct the full app URL
  if (CHAIN_ID && APP_ID) {
    const base = getBaseUrl();
    return `${base}/chains/${CHAIN_ID}/applications/${APP_ID}`;
  }
  return GRAPHQL_URL;
};

// Get the node service URL (without application path)
const getNodeServiceUrl = () => {
  // In production, use the configured URL
  if (isProduction) {
    return getBaseUrl();
  }
  return `http://localhost:${PORT}`;
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
 * This queries the node service, not the application
 */
export async function getChains(): Promise<any> {
  const query = `
    query {
      chains {
        list
      }
    }
  `;
  // Use node service URL, not app URL
  const url = getNodeServiceUrl();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }
    return result.data;
  } catch (error) {
    console.error('Failed to get chains:', error);
    throw error;
  }
}

/**
 * Query chain information
 * This queries the node service, not the application
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
  // Use node service URL, not app URL
  const url = getNodeServiceUrl();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { chainId } }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }
    return result.data;
  } catch (error) {
    console.error('Failed to get chain info:', error);
    throw error;
  }
}

/**
 * Query applications deployed on a chain
 * This queries the node service, not the application
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
  // Use node service URL, not app URL
  const url = getNodeServiceUrl();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { chainId } }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }
    return result.data;
  } catch (error) {
    console.error('Failed to get applications:', error);
    throw error;
  }
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
 * Tests by querying the application's stats endpoint
 */
export async function checkLineraConnection(): Promise<boolean> {
  try {
    // First check if the node service is running
    const nodeUrl = getNodeServiceUrl();
    const nodeResponse = await fetch(nodeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ __typename }' }),
    });
    
    if (!nodeResponse.ok) {
      console.log('❌ Node service not responding');
      return false;
    }
    
    // Then check if the application is accessible
    const url = getAppUrl();
    console.log('🔍 Checking Linera connection at:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ stats { totalJobs } }' }),
    });
    
    if (!response.ok) {
      console.log('❌ Application not responding, status:', response.status);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Linera connection result:', result);
    
    // Check if we got valid data (stats query exists in our contract)
    return result.data !== undefined;
  } catch (error) {
    console.error('❌ Linera connection check failed:', error);
    return false;
  }
}

/**
 * Get the wallet address from environment
 */
export async function getLineraWalletAddress(): Promise<string | null> {
  // Get from environment variable (set during deployment)
  const envOwner = import.meta.env.VITE_LINERA_WALLET_OWNER;
  if (envOwner) {
    return envOwner;
  }
  
  // Fallback - return null if not configured
  return null;
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
