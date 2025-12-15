
import { AgentProfile, Job, JobStatus, Owner, Bid, JobFilter, AgentFilter, JobSortField, AgentSortField, SortDirection, MarketplaceStats, WalletAuth, AgentRating } from '../types';
import * as Linera from './linera';

// Toggle between mock data and Linera blockchain
// Set VITE_USE_LINERA=true in .env.local to enable Linera integration
const USE_LINERA = import.meta.env.VITE_USE_LINERA === 'true';
const CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID || '';
const APP_ID = import.meta.env.VITE_LINERA_APP_ID || '';
const LINERA_PORT = import.meta.env.VITE_LINERA_PORT || '8080';
const LINERA_GRAPHQL_URL = import.meta.env.VITE_LINERA_GRAPHQL_URL || `http://localhost:${LINERA_PORT}`;

console.log('🔗 Linera Integration:', {
  enabled: USE_LINERA,
  chainId: CHAIN_ID ? `${CHAIN_ID.substring(0, 16)}...` : 'Not set',
  appId: APP_ID ? `${APP_ID.substring(0, 16)}...` : 'Not set',
});

// Wallet authentication state
let currentWalletAuth: WalletAuth | null = null;

// ==================== WALLET AUTHENTICATION ====================

/**
 * Connect to Linera wallet and authenticate
 */
export async function connectWallet(): Promise<WalletAuth> {
  if (!USE_LINERA) {
    // Mock authentication for development
    const mockAuth: WalletAuth = {
      address: ('0x' + 'a'.repeat(64)) as Owner,
      chainId: 'mock-chain',
      isAuthenticated: true,
    };
    currentWalletAuth = mockAuth;
    return mockAuth;
  }

  try {
    const isAvailable = await Linera.checkLineraConnection();
    if (!isAvailable) {
      throw new Error('Linera service not available');
    }

    const address = await Linera.getLineraWalletAddress();
    const chainId = Linera.getChainId();

    if (!address || !chainId) {
      throw new Error('Failed to get wallet address or chain ID');
    }

    const auth: WalletAuth = {
      address: address as Owner,
      chainId,
      isAuthenticated: true,
    };

    currentWalletAuth = auth;
    console.log('✅ Wallet connected:', auth.address.substring(0, 16) + '...');
    return auth;
  } catch (error) {
    console.error('❌ Wallet connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect wallet
 */
export function disconnectWallet(): void {
  currentWalletAuth = null;
  console.log('🔌 Wallet disconnected');
}

/**
 * Get current wallet authentication state
 */
export function getWalletAuth(): WalletAuth | null {
  return currentWalletAuth;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return currentWalletAuth?.isAuthenticated ?? false;
}

/**
 * Get current user's address
 */
export function getCurrentUserAddress(): Owner | null {
  return currentWalletAuth?.address ?? null;
}

// MOCK DATA - This would be fetched from the Linera blockchain via GraphQL
const MOCK_OWNERS: Owner[] = [
  '0x' + 'a'.repeat(64) as Owner,
  '0x' + 'b'.repeat(64) as Owner,
  '0x' + 'c'.repeat(64) as Owner,
  '0x' + 'd'.repeat(64) as Owner,
  '0x' + 'e'.repeat(64) as Owner,
  '0x' + 'f'.repeat(64) as Owner,
];

let MOCK_AGENTS: AgentProfile[] = [
  { owner: MOCK_OWNERS[1], name: 'CodeBot 5000', serviceDescription: 'Expert in Rust smart contract auditing.', jobsCompleted: 42, totalRatingPoints: 205, totalRatings: 42, rating: 4.9, verified: true },
  { owner: MOCK_OWNERS[2], name: 'Artisan AI', serviceDescription: 'Generates stunning digital art from prompts.', jobsCompleted: 120, totalRatingPoints: 588, totalRatings: 120, rating: 4.9, verified: true },
  { owner: MOCK_OWNERS[3], name: 'DataCruncher', serviceDescription: 'Provides deep data analysis and market insights.', jobsCompleted: 75, totalRatingPoints: 360, totalRatings: 75, rating: 4.8, verified: false },
  { owner: MOCK_OWNERS[4], name: 'TranslateSphere', serviceDescription: 'Fast and accurate multilingual translation services.', jobsCompleted: 210, totalRatingPoints: 1000, totalRatings: 210, rating: 4.7, verified: true },
];

let MOCK_JOBS: Job[] = [
  {
    id: 1,
    client: MOCK_OWNERS[0],
    description: 'Audit a new DeFi lending protocol smart contract for security vulnerabilities.',
    payment: 5000,
    status: JobStatus.Posted,
    bids: [
      { agent: MOCK_AGENTS[0], bidId: 101 },
    ],
  },
  {
    id: 2,
    client: MOCK_OWNERS[5],
    description: 'Create a series of 10 sci-fi themed illustrations for a new book cover.',
    payment: 2500,
    status: JobStatus.Posted,
    bids: [
      { agent: MOCK_AGENTS[1], bidId: 102 },
      { agent: MOCK_AGENTS[3], bidId: 103 },
    ],
  },
  {
    id: 3,
    client: MOCK_OWNERS[0],
    description: 'Analyze user engagement data for our mobile app and provide a detailed report.',
    payment: 3000,
    status: JobStatus.InProgress,
    agent: MOCK_AGENTS[2].owner,
    bids: [{ agent: MOCK_AGENTS[2], bidId: 104 }],
  },
    {
    id: 4,
    client: MOCK_OWNERS[5],
    description: 'Translate our company website from English to Japanese and Spanish.',
    payment: 1800,
    status: JobStatus.Completed,
    agent: MOCK_AGENTS[3].owner,
    bids: [],
  },
];
// --- END MOCK DATA ---

const SIMULATED_LATENCY = 800; // in ms

const simulateApiCall = <T,>(data: T): Promise<T> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // Handle undefined gracefully
      if (data === undefined) {
        resolve(undefined as T);
      } else {
        resolve(JSON.parse(JSON.stringify(data))); // Deep copy to prevent mutation
      }
    }, SIMULATED_LATENCY);
  });
};

// In a real app, this would use @apollo/client to send GraphQL queries.
export const getAgents = (): Promise<AgentProfile[]> => simulateApiCall(MOCK_AGENTS);
export const getJobs = (): Promise<Job[]> => simulateApiCall(MOCK_JOBS);
export const getJobById = (id: number): Promise<Job | undefined> => simulateApiCall(MOCK_JOBS.find(job => job.id === id));

// Simulates a user posting a job to their microchain.
export const postJob = (description: string, payment: number): Promise<Job> => {
  const newJob: Job = {
    id: MOCK_JOBS.length + 1,
    client: MOCK_OWNERS[0], // Assume current user is the first owner
    description,
    payment,
    status: JobStatus.Posted,
    bids: [],
  };
  MOCK_JOBS.unshift(newJob);
  return simulateApiCall(newJob);
};

// Simulates a user accepting a bid.
export const acceptJob = (jobId: number, agentOwner: Owner): Promise<Job> => {
    const jobIndex = MOCK_JOBS.findIndex(j => j.id === jobId);
    if(jobIndex !== -1) {
        MOCK_JOBS[jobIndex].status = JobStatus.InProgress;
        MOCK_JOBS[jobIndex].agent = agentOwner;
    }
    return simulateApiCall(MOCK_JOBS[jobIndex]);
}

// Simulates placing a bid on a job (mock mode)
export const placeBid = (jobId: number): Promise<Job> => {
    const jobIndex = MOCK_JOBS.findIndex(j => j.id === jobId);
    if (jobIndex === -1) {
        return Promise.reject(new Error('Job not found'));
    }
    
    const job = MOCK_JOBS[jobIndex];
    if (job.status !== JobStatus.Posted) {
        return Promise.reject(new Error('Job is not available for bidding'));
    }
    
    // Get current user (or use a mock agent)
    const bidderAddress = currentWalletAuth?.address || MOCK_OWNERS[1];
    const bidderAgent = MOCK_AGENTS.find(a => a.owner === bidderAddress) || MOCK_AGENTS[0];
    
    // Check if already bid
    const existingBid = job.bids.find(b => {
        const bidAgent = typeof b.agent === 'string' ? b.agent : b.agent?.owner;
        return bidAgent === bidderAddress;
    });
    
    if (existingBid) {
        return Promise.reject(new Error('You have already bid on this job'));
    }
    
    // Add new bid
    const newBid: Bid = {
        agent: bidderAgent,
        bidId: Date.now(),
        timestamp: new Date().toISOString(),
    };
    
    MOCK_JOBS[jobIndex].bids.push(newBid);
    console.log('✅ Mock bid placed:', newBid);
    
    return simulateApiCall(MOCK_JOBS[jobIndex]);
}

// ==================== LINERA BLOCKCHAIN FUNCTIONS ====================

/**
 * Get the application GraphQL endpoint URL
 * Linera applications are accessed at: /chains/{chainId}/applications/{appId}
 */
function getApplicationEndpoint(): string {
  // If GRAPHQL_URL already has the full path, use it directly
  if (LINERA_GRAPHQL_URL.includes('/chains/')) {
    return LINERA_GRAPHQL_URL;
  }
  // Otherwise build the path
  return `${LINERA_GRAPHQL_URL}/chains/${CHAIN_ID}/applications/${APP_ID}`;
}

/**
 * Execute a GraphQL mutation on the application
 * This sends the mutation to the application's GraphQL endpoint
 */
export async function executeApplicationMutation(mutation: string, variables?: Record<string, any>): Promise<any> {
  if (!USE_LINERA) {
    throw new Error('Linera integration is not enabled. Set VITE_USE_LINERA=true');
  }

  const endpoint = getApplicationEndpoint();
  console.log('🔗 Executing mutation on:', endpoint);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    console.log('✅ Mutation executed:', result);
    return result.data;
  } catch (error) {
    console.error('❌ Failed to execute mutation:', error);
    throw error;
  }
}

/**
 * Register as an agent on the blockchain
 * Uses the application's GraphQL mutation
 */
export async function registerAgentOnChain(name: string, serviceDescription: string): Promise<any> {
  const mutation = `
    mutation RegisterAgent($name: String!, $serviceDescription: String!) {
      registerAgent(name: $name, serviceDescription: $serviceDescription)
    }
  `;
  return executeApplicationMutation(mutation, { name, serviceDescription });
}

/**
 * Post a job on the blockchain
 * Uses the application's GraphQL mutation
 */
export async function postJobOnChain(description: string, payment: number): Promise<any> {
  const mutation = `
    mutation PostJob($description: String!, $payment: String!) {
      postJob(description: $description, payment: $payment)
    }
  `;
  return executeApplicationMutation(mutation, { 
    description, 
    payment: payment.toString() 
  });
}

/**
 * Place a bid on a job
 * Uses the application's GraphQL mutation
 */
export async function placeBidOnChain(jobId: number): Promise<any> {
  const mutation = `
    mutation PlaceBid($jobId: Int!) {
      placeBid(jobId: $jobId)
    }
  `;
  return executeApplicationMutation(mutation, { jobId });
}

/**
 * Accept a bid (client accepts an agent's bid)
 * Uses the application's GraphQL mutation
 */
export async function acceptBidOnChain(jobId: number, agent: Owner): Promise<any> {
  const mutation = `
    mutation AcceptBid($jobId: Int!, $agent: String!) {
      acceptBid(jobId: $jobId, agent: $agent)
    }
  `;
  return executeApplicationMutation(mutation, { jobId, agent });
}

/**
 * Complete a job
 * Uses the application's GraphQL mutation
 */
export async function completeJobOnChain(jobId: number): Promise<any> {
  const mutation = `
    mutation CompleteJob($jobId: Int!) {
      completeJob(jobId: $jobId)
    }
  `;
  return executeApplicationMutation(mutation, { jobId });
}

/**
 * Check if Linera is enabled and configured
 */
export function isLineraEnabled(): boolean {
  return USE_LINERA && !!CHAIN_ID && !!APP_ID;
}

/**
 * Get blockchain configuration
 */
export function getLineraConfig() {
  return {
    enabled: USE_LINERA,
    chainId: CHAIN_ID,
    appId: APP_ID,
    graphqlUrl: LINERA_GRAPHQL_URL,
    port: LINERA_PORT,
  };
}

/**
 * Execute a GraphQL query on the application
 * This sends the query to the application's GraphQL endpoint
 */
export async function executeApplicationQuery(query: string, variables?: Record<string, any>): Promise<any> {
  if (!USE_LINERA) {
    throw new Error('Linera integration is not enabled. Set VITE_USE_LINERA=true');
  }

  const endpoint = getApplicationEndpoint();
  console.log('🔍 Executing query on:', endpoint);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors && result.errors.length > 0) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    console.log('✅ Query result:', result);
    return result.data;
  } catch (error) {
    console.error('❌ Failed to execute query:', error);
    throw error;
  }
}

/**
 * Fetch all jobs from the blockchain
 */
export async function getJobsFromChain(): Promise<Job[]> {
  const query = `
    query GetJobs {
      jobs {
        id
        client
        description
        payment
        status
        agent
        bids {
          agent
          bidId
          timestamp
        }
        createdAt
      }
    }
  `;
  
  try {
    const data = await executeApplicationQuery(query);
    return data.jobs || [];
  } catch (error) {
    console.error('Failed to fetch jobs from chain:', error);
    return [];
  }
}

/**
 * Fetch all agents from the blockchain
 */
export async function getAgentsFromChain(): Promise<AgentProfile[]> {
  const query = `
    query GetAgents {
      agents {
        owner
        name
        serviceDescription
        jobsCompleted
        totalRatingPoints
      }
    }
  `;
  
  try {
    const data = await executeApplicationQuery(query);
    return (data.agents || []).map((agent: any) => ({
      ...agent,
      rating: agent.jobsCompleted > 0 ? agent.totalRatingPoints / agent.jobsCompleted : 0,
    }));
  } catch (error) {
    console.error('Failed to fetch agents from chain:', error);
    return [];
  }
}

/**
 * Fetch a specific job from the blockchain
 */
export async function getJobFromChain(id: number): Promise<Job | undefined> {
  const query = `
    query GetJob($id: Int!) {
      job(id: $id) {
        id
        client
        description
        payment
        status
        agent
        bids {
          agent
          bidId
          timestamp
        }
        createdAt
      }
    }
  `;
  
  try {
    const data = await executeApplicationQuery(query, { id });
    return data.job || undefined;
  } catch (error) {
    console.error('Failed to fetch job from chain:', error);
    return undefined;
  }
}

/**
 * Fetch jobs with filtering, sorting, and pagination
 */
export async function getJobsFiltered(
  filter?: JobFilter,
  sortBy?: JobSortField,
  sortDir?: SortDirection,
  limit?: number,
  offset?: number
): Promise<Job[]> {
  if (!USE_LINERA) {
    // Apply filters to mock data
    let jobs = [...MOCK_JOBS];
    
    if (filter?.status) {
      jobs = jobs.filter(j => j.status === filter.status);
    }
    if (filter?.minPayment) {
      jobs = jobs.filter(j => j.payment >= filter.minPayment!);
    }
    if (filter?.maxPayment) {
      jobs = jobs.filter(j => j.payment <= filter.maxPayment!);
    }
    
    // Sort
    if (sortBy === 'Payment') {
      jobs.sort((a, b) => sortDir === 'Desc' ? b.payment - a.payment : a.payment - b.payment);
    } else if (sortBy === 'Id') {
      jobs.sort((a, b) => sortDir === 'Desc' ? b.id - a.id : a.id - b.id);
    }
    
    // Pagination
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    
    return simulateApiCall(jobs.slice(start, end));
  }

  // For Linera, fetch all jobs and filter client-side
  // (The deployed contract doesn't have advanced filtering types)
  try {
    const allJobs = await getJobsFromChain();
    let jobs = [...allJobs];
    
    // Apply filters client-side
    if (filter?.status) {
      const filterStatus = String(filter.status).toUpperCase();
      jobs = jobs.filter(j => String(j.status).toUpperCase() === filterStatus);
    }
    if (filter?.minPayment) {
      jobs = jobs.filter(j => j.payment >= filter.minPayment!);
    }
    if (filter?.maxPayment) {
      jobs = jobs.filter(j => j.payment <= filter.maxPayment!);
    }
    
    // Apply sorting client-side
    if (sortBy === 'Payment') {
      jobs.sort((a, b) => sortDir === 'Desc' ? b.payment - a.payment : a.payment - b.payment);
    } else if (sortBy === 'Id') {
      jobs.sort((a, b) => sortDir === 'Desc' ? b.id - a.id : a.id - b.id);
    } else {
      // Default: CreatedAt (use id as proxy)
      jobs.sort((a, b) => sortDir === 'Desc' ? b.id - a.id : a.id - b.id);
    }
    
    // Apply pagination
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    
    return jobs.slice(start, end);
  } catch (error) {
    console.error('Failed to fetch filtered jobs:', error);
    return [];
  }
}

/**
 * Fetch agents with filtering, sorting, and pagination
 */
export async function getAgentsFiltered(
  filter?: AgentFilter,
  sortBy?: AgentSortField,
  sortDir?: SortDirection,
  limit?: number,
  offset?: number
): Promise<AgentProfile[]> {
  if (!USE_LINERA) {
    let agents = [...MOCK_AGENTS];
    
    if (filter?.minJobsCompleted) {
      agents = agents.filter(a => a.jobsCompleted >= filter.minJobsCompleted!);
    }
    if (filter?.minRating) {
      agents = agents.filter(a => a.rating >= filter.minRating!);
    }
    
    if (sortBy === 'JobsCompleted') {
      agents.sort((a, b) => sortDir === 'Desc' ? b.jobsCompleted - a.jobsCompleted : a.jobsCompleted - b.jobsCompleted);
    } else if (sortBy === 'Rating') {
      agents.sort((a, b) => sortDir === 'Desc' ? b.rating - a.rating : a.rating - b.rating);
    }
    
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    
    return simulateApiCall(agents.slice(start, end));
  }

  // For Linera, fetch all agents and filter client-side
  // (The deployed contract doesn't have advanced filtering types)
  try {
    const allAgents = await getAgentsFromChain();
    let agents = [...allAgents];
    
    // Apply filters client-side
    if (filter?.minJobsCompleted) {
      agents = agents.filter(a => a.jobsCompleted >= filter.minJobsCompleted!);
    }
    if (filter?.minRating) {
      agents = agents.filter(a => a.rating >= filter.minRating!);
    }
    
    // Apply sorting client-side
    if (sortBy === 'JobsCompleted') {
      agents.sort((a, b) => sortDir === 'Desc' ? b.jobsCompleted - a.jobsCompleted : a.jobsCompleted - b.jobsCompleted);
    } else if (sortBy === 'Rating') {
      agents.sort((a, b) => sortDir === 'Desc' ? b.rating - a.rating : a.rating - b.rating);
    }
    
    // Apply pagination
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    
    return agents.slice(start, end);
  } catch (error) {
    console.error('Failed to fetch filtered agents:', error);
    return [];
  }
}

/**
 * Get marketplace statistics
 */
export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  if (!USE_LINERA) {
    return simulateApiCall({
      totalJobs: MOCK_JOBS.length,
      postedJobs: MOCK_JOBS.filter(j => j.status === JobStatus.Posted).length,
      inProgressJobs: MOCK_JOBS.filter(j => j.status === JobStatus.InProgress).length,
      completedJobs: MOCK_JOBS.filter(j => j.status === JobStatus.Completed).length,
      totalAgents: MOCK_AGENTS.length,
      totalPaymentVolume: MOCK_JOBS.reduce((sum, j) => sum + j.payment, 0).toString(),
    });
  }

  // Calculate stats client-side from fetched data
  try {
    const [jobs, agents] = await Promise.all([
      getJobsFromChain(),
      getAgentsFromChain()
    ]);
    
    const statusStr = (j: Job) => String(j.status).toUpperCase();
    
    return {
      totalJobs: jobs.length,
      postedJobs: jobs.filter(j => statusStr(j) === 'POSTED').length,
      inProgressJobs: jobs.filter(j => statusStr(j) === 'INPROGRESS' || statusStr(j) === 'IN_PROGRESS').length,
      completedJobs: jobs.filter(j => statusStr(j) === 'COMPLETED').length,
      totalAgents: agents.length,
      totalPaymentVolume: jobs.reduce((sum, j) => sum + j.payment, 0).toString(),
    };
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return {
      totalJobs: 0,
      postedJobs: 0,
      inProgressJobs: 0,
      completedJobs: 0,
      totalAgents: 0,
      totalPaymentVolume: '0',
    };
  }
}

/**
 * Rate an agent after job completion
 */
export async function rateAgentOnChain(jobId: number, rating: number, review: string): Promise<any> {
  const mutation = `
    mutation RateAgent($jobId: Int!, $rating: Int!, $review: String!) {
      rateAgent(jobId: $jobId, rating: $rating, review: $review)
    }
  `;
  return executeApplicationMutation(mutation, { jobId, rating, review });
}

/**
 * Update agent profile
 */
export async function updateAgentProfileOnChain(name?: string, serviceDescription?: string): Promise<any> {
  const mutation = `
    mutation UpdateAgentProfile($name: String, $serviceDescription: String) {
      updateAgentProfile(name: $name, serviceDescription: $serviceDescription)
    }
  `;
  return executeApplicationMutation(mutation, { name, serviceDescription });
}

/**
 * Get agent ratings/reviews
 */
export async function getAgentRatings(agentOwner: Owner): Promise<AgentRating[]> {
  if (!USE_LINERA) {
    return simulateApiCall([]);
  }

  const query = `
    query GetAgentRatings($agentOwner: String!) {
      agentRatings(agentOwner: $agentOwner) {
        jobId
        rater
        rating
        review
        timestamp
      }
    }
  `;
  
  try {
    const data = await executeApplicationQuery(query, { agentOwner });
    return data.agentRatings || [];
  } catch (error) {
    console.error('Failed to fetch agent ratings:', error);
    return [];
  }
}

// ==================== REAL-TIME SUBSCRIPTIONS ====================

type SubscriptionCallback<T> = (data: T) => void;

interface Subscription {
  unsubscribe: () => void;
}

/**
 * Subscribe to job updates (polling-based for now)
 * In a full implementation, this would use WebSocket subscriptions
 */
export function subscribeToJobs(
  callback: SubscriptionCallback<Job[]>,
  pollInterval: number = 5000
): Subscription {
  let isActive = true;
  
  const poll = async () => {
    if (!isActive) return;
    
    try {
      const jobs = USE_LINERA ? await getJobsFromChain() : MOCK_JOBS;
      callback(jobs);
    } catch (error) {
      console.error('Job subscription error:', error);
    }
    
    if (isActive) {
      setTimeout(poll, pollInterval);
    }
  };
  
  poll();
  
  return {
    unsubscribe: () => {
      isActive = false;
    }
  };
}

/**
 * Subscribe to a specific job's updates
 */
export function subscribeToJob(
  jobId: number,
  callback: SubscriptionCallback<Job | undefined>,
  pollInterval: number = 3000
): Subscription {
  let isActive = true;
  
  const poll = async () => {
    if (!isActive) return;
    
    try {
      const job = USE_LINERA ? await getJobFromChain(jobId) : MOCK_JOBS.find(j => j.id === jobId);
      callback(job);
    } catch (error) {
      console.error('Job subscription error:', error);
    }
    
    if (isActive) {
      setTimeout(poll, pollInterval);
    }
  };
  
  poll();
  
  return {
    unsubscribe: () => {
      isActive = false;
    }
  };
}

/**
 * Subscribe to agent updates
 */
export function subscribeToAgents(
  callback: SubscriptionCallback<AgentProfile[]>,
  pollInterval: number = 5000
): Subscription {
  let isActive = true;
  
  const poll = async () => {
    if (!isActive) return;
    
    try {
      const agents = USE_LINERA ? await getAgentsFromChain() : MOCK_AGENTS;
      callback(agents);
    } catch (error) {
      console.error('Agent subscription error:', error);
    }
    
    if (isActive) {
      setTimeout(poll, pollInterval);
    }
  };
  
  poll();
  
  return {
    unsubscribe: () => {
      isActive = false;
    }
  };
}

/**
 * Subscribe to marketplace stats
 */
export function subscribeToStats(
  callback: SubscriptionCallback<MarketplaceStats>,
  pollInterval: number = 10000
): Subscription {
  let isActive = true;
  
  const poll = async () => {
    if (!isActive) return;
    
    try {
      const stats = await getMarketplaceStats();
      callback(stats);
    } catch (error) {
      console.error('Stats subscription error:', error);
    }
    
    if (isActive) {
      setTimeout(poll, pollInterval);
    }
  };
  
  poll();
  
  return {
    unsubscribe: () => {
      isActive = false;
    }
  };
}

