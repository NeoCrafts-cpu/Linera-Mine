
import {
  AgentProfile, Job, JobStatus, Owner, Bid, JobFilter, AgentFilter, JobSortField, 
  AgentSortField, SortDirection, MarketplaceStats, WalletAuth, AgentRating,
  // New v2.0 types
  JobCategory, EscrowInfo, Dispute, DisputeStatus, ChatMessage, VerificationLevel,
  PostJobInput, PlaceBidInput, RegisterAgentInput, UpdateAgentInput,
  OpenDisputeInput, ResolveDisputeInput, SendMessageInput,
  Milestone, MilestoneStatus, EscrowStatus
} from '../types';
import * as Linera from './linera';

// Toggle between mock data and Linera blockchain
// Set VITE_USE_LINERA=true in .env.local to enable Linera integration
const USE_LINERA = import.meta.env.VITE_USE_LINERA === 'true';
const CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID || '';
const APP_ID = import.meta.env.VITE_LINERA_APP_ID || '';
const   LINERA_PORT = import.meta.env.VITE_LINERA_PORT || '8081';
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
  // First check if wallet is connected via API
  if (currentWalletAuth?.address) {
    return currentWalletAuth.address;
  }
  // Fallback to environment variable
  const envOwner = import.meta.env.VITE_LINERA_WALLET_OWNER;
  if (envOwner) {
    return envOwner as Owner;
  }
  return null;
}

// ==================== LINERA-ONLY MODE ====================
// All data comes from the Linera blockchain - no mock data

/**
 * Check if Linera integration is enabled
 */
export function isLineraEnabled(): boolean {
  return USE_LINERA && !!CHAIN_ID && !!APP_ID;
}

/**
 * Get the GraphQL endpoint for the Linera application
 */
function getGraphQLEndpoint(): string {
  return `${LINERA_GRAPHQL_URL}/chains/${CHAIN_ID}/applications/${APP_ID}`;
}

/**
 * Execute a GraphQL query against the Linera application
 */
async function executeGraphQL(query: string, variables: Record<string, unknown> = {}): Promise<any> {
  const endpoint = getGraphQLEndpoint();
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

// ==================== QUERY FUNCTIONS ====================

/**
 * Get all agents from the blockchain
 */
export async function getAgents(): Promise<AgentProfile[]> {
  if (!isLineraEnabled()) {
    console.warn('Linera not enabled - returning empty agent list');
    return [];
  }
  return getAgentsFromChain();
}

/**
 * Get all jobs from the blockchain
 */
export async function getJobs(): Promise<Job[]> {
  if (!isLineraEnabled()) {
    console.warn('Linera not enabled - returning empty job list');
    return [];
  }
  return getJobsFromChain();
}

/**
 * Get a specific job by ID from the blockchain
 */
export async function getJobById(id: number): Promise<Job | undefined> {
  if (!isLineraEnabled()) {
    console.warn('Linera not enabled - job not found');
    return undefined;
  }
  return getJobFromChain(id);
}

// Legacy mock functions - now redirect to blockchain
export const postJob = async (description: string, payment: number, title: string = 'New Job', category: string = 'Other', tags: string[] = []): Promise<Job> => {
  return postJobOnChain(title, description, payment, category, tags, []);
};

export const acceptJob = async (jobId: number, agentOwner: Owner): Promise<Job> => {
  // Need to get the bid amount from the job
  const job = await getJobById(jobId);
  const bid = job?.bids.find(b => {
    const bidAgent = typeof b.agent === 'string' ? b.agent : (b.agent as AgentProfile)?.owner;
    return bidAgent === agentOwner;
  });
  const bidAmount = bid?.amount || job?.payment || 0;
  await acceptBidOnChain(jobId, agentOwner, typeof bidAmount === 'number' ? bidAmount : parseFloat(bidAmount as string));
  return getJobById(jobId) as Promise<Job>;
};

export const placeBid = async (jobId: number): Promise<Job> => {
  // This should not be called directly - use placeBidOnChain with proper params
  throw new Error('placeBid requires amount, proposal, and estimatedDays. Use placeBidOnChain instead.');
};

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
export async function registerAgentOnChain(
  name: string, 
  serviceDescription: string,
  skills: string[] = [],
  hourlyRate: number | null = null
): Promise<any> {
  const mutation = `
    mutation RegisterAgent(
      $name: String!, 
      $serviceDescription: String!,
      $skills: [String!]!,
      $hourlyRate: String
    ) {
      registerAgent(
        name: $name, 
        serviceDescription: $serviceDescription,
        skills: $skills,
        hourlyRate: $hourlyRate
      )
    }
  `;
  return executeApplicationMutation(mutation, { 
    name, 
    serviceDescription,
    skills,
    hourlyRate: hourlyRate ? hourlyRate.toString() : null
  });
}

/**
 * Post a job on the blockchain
 * Uses the application's GraphQL mutation
 */
export async function postJobOnChain(
  title: string,
  description: string, 
  payment: number,
  category: string = 'OTHER',
  tags: string[] = [],
  milestones: { title: string; description: string; paymentPercentage: number }[] = []
): Promise<any> {
  const mutation = `
    mutation PostJob(
      $title: String!, 
      $description: String!, 
      $payment: String!,
      $category: JobCategory!,
      $tags: [String!]!,
      $deadline: Int,
      $milestones: [MilestoneInput!]!
    ) {
      postJob(
        title: $title,
        description: $description, 
        payment: $payment,
        category: $category,
        tags: $tags,
        deadline: $deadline,
        milestones: $milestones
      )
    }
  `;
  
  // Convert milestones to the expected format
  const milestoneInputs = milestones.map(m => ({
    title: m.title,
    description: m.description,
    paymentPercentage: m.paymentPercentage,
    dueDays: null
  }));
  
  return executeApplicationMutation(mutation, { 
    title,
    description, 
    payment: payment.toString(),
    category: category.toUpperCase().replace(/ /g, '_'),
    tags,
    deadline: null,
    milestones: milestoneInputs
  });
}

/**
 * Place a bid on a job
 * Uses the application's GraphQL mutation
 */
export async function placeBidOnChain(
  jobId: number,
  amount: number,
  proposal: string,
  estimatedDays: number
): Promise<any> {
  const mutation = `
    mutation PlaceBid(
      $jobId: Int!, 
      $amount: String!,
      $proposal: String!,
      $estimatedDays: Int!
    ) {
      placeBid(
        jobId: $jobId,
        amount: $amount,
        proposal: $proposal,
        estimatedDays: $estimatedDays
      )
    }
  `;
  return executeApplicationMutation(mutation, { 
    jobId, 
    amount: amount.toString(),
    proposal,
    estimatedDays
  });
}

/**
 * Accept a bid (client accepts an agent's bid)
 * Uses the application's GraphQL mutation
 */
export async function acceptBidOnChain(jobId: number, agent: Owner, bidAmount: number): Promise<any> {
  const mutation = `
    mutation AcceptBid($jobId: Int!, $agent: String!, $bidAmount: String!) {
      acceptBid(jobId: $jobId, agent: $agent, bidAmount: $bidAmount)
    }
  `;
  return executeApplicationMutation(mutation, { jobId, agent, bidAmount: bidAmount.toString() });
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
        title
        description
        payment
        status
        agent
        category
        tags
        deadline
        milestones {
          id
          title
          description
          paymentPercentage
          status
          dueDate
        }
        acceptedBidAmount
        escrowId
        bids {
          agent
          bidId
          timestamp
          amount
          proposal
          estimatedDays
        }
        createdAt
      }
    }
  `;
  
  try {
    const data = await executeApplicationQuery(query);
    // Normalize status and convert payment to number from blockchain
    const jobs = (data.jobs || []).map((job: any) => ({
      ...job,
      status: normalizeJobStatus(job.status),
      payment: typeof job.payment === 'string' ? parseFloat(job.payment) : (job.payment || 0),
      id: typeof job.id === 'string' ? parseInt(job.id, 10) : job.id,
      bids: (job.bids || []).map((bid: any) => ({
        ...bid,
        bidId: typeof bid.bidId === 'string' ? parseInt(bid.bidId, 10) : bid.bidId,
        amount: typeof bid.amount === 'string' ? parseFloat(bid.amount) : (bid.amount || 0),
        estimatedDays: typeof bid.estimatedDays === 'string' ? parseInt(bid.estimatedDays, 10) : (bid.estimatedDays || 0),
      })),
      milestones: job.milestones || [],
      tags: job.tags || [],
    }));
    return jobs;
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
        totalRatings
        registeredAt
        verificationLevel
        skills
        portfolioUrls
        hourlyRate
        availability
        responseTimeHours
        successRate
      }
    }
  `;
  
  try {
    const data = await executeApplicationQuery(query);
    return (data.agents || []).map((agent: any) => ({
      ...agent,
      rating: agent.totalRatings > 0 ? agent.totalRatingPoints / agent.totalRatings : 0,
      hourlyRate: agent.hourlyRate ? parseFloat(agent.hourlyRate) : null,
      skills: agent.skills || [],
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
        title
        description
        payment
        status
        agent
        category
        tags
        deadline
        milestones {
          id
          title
          description
          paymentPercentage
          status
          dueDate
        }
        acceptedBidAmount
        escrowId
        bids {
          agent
          bidId
          timestamp
          amount
          proposal
          estimatedDays
        }
        createdAt
      }
    }
  `;
  
  try {
    const data = await executeApplicationQuery(query, { id });
    if (!data.job) return undefined;
    
    const job = data.job;
    return {
      ...job,
      status: normalizeJobStatus(job.status),
      payment: typeof job.payment === 'string' ? parseFloat(job.payment) : (job.payment || 0),
      id: typeof job.id === 'string' ? parseInt(job.id, 10) : job.id,
      bids: (job.bids || []).map((bid: any) => ({
        ...bid,
        bidId: typeof bid.bidId === 'string' ? parseInt(bid.bidId, 10) : bid.bidId,
        amount: typeof bid.amount === 'string' ? parseFloat(bid.amount) : (bid.amount || 0),
        estimatedDays: typeof bid.estimatedDays === 'string' ? parseInt(bid.estimatedDays, 10) : (bid.estimatedDays || 0),
      })),
      milestones: job.milestones || [],
      tags: job.tags || [],
    };
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
  // Fetch all jobs from chain and filter client-side
  try {
    const allJobs = await getJobsFromChain();
    let jobs = [...allJobs];
    
    // Apply filters client-side
    if (filter?.status) {
      const filterStatus = String(filter.status).toUpperCase();
      jobs = jobs.filter(j => String(j.status).toUpperCase() === filterStatus);
    }
    if (filter?.minPayment) {
      const minPay = typeof filter.minPayment === 'number' ? filter.minPayment : parseFloat(filter.minPayment);
      jobs = jobs.filter(j => {
        const pay = typeof j.payment === 'number' ? j.payment : parseFloat(j.payment as any);
        return pay >= minPay;
      });
    }
    if (filter?.maxPayment) {
      const maxPay = typeof filter.maxPayment === 'number' ? filter.maxPayment : parseFloat(filter.maxPayment);
      jobs = jobs.filter(j => {
        const pay = typeof j.payment === 'number' ? j.payment : parseFloat(j.payment as any);
        return pay <= maxPay;
      });
    }
    
    // Apply sorting client-side
    if (sortBy === 'Payment') {
      jobs.sort((a, b) => {
        const payA = typeof a.payment === 'number' ? a.payment : parseFloat(a.payment as any);
        const payB = typeof b.payment === 'number' ? b.payment : parseFloat(b.payment as any);
        return sortDir === 'Desc' ? payB - payA : payA - payB;
      });
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
  // Fetch all agents from chain and filter client-side
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
  // Calculate stats from blockchain data
  try {
    const [jobs, agents] = await Promise.all([
      getJobsFromChain(),
      getAgentsFromChain()
    ]);
    
    const statusStr = (j: Job) => String(j.status).toUpperCase();
    
    const totalBids = jobs.reduce((sum, j) => sum + (j.bids?.length || 0), 0);
    const disputedJobs = jobs.filter(j => statusStr(j) === 'DISPUTED').length;
    const verifiedAgents = agents.filter(a => a.verificationLevel && a.verificationLevel !== VerificationLevel.Unverified).length;
    
    return {
      totalJobs: jobs.length,
      postedJobs: jobs.filter(j => statusStr(j) === 'POSTED').length,
      inProgressJobs: jobs.filter(j => statusStr(j) === 'INPROGRESS' || statusStr(j) === 'IN_PROGRESS').length,
      completedJobs: jobs.filter(j => statusStr(j) === 'COMPLETED').length,
      disputedJobs,
      totalAgents: agents.length,
      verifiedAgents,
      totalBids,
      openDisputes: disputedJobs, // Same as disputed jobs for now
      avgBidsPerJob: jobs.length > 0 ? totalBids / jobs.length : 0,
      totalPaymentVolume: jobs.reduce((sum, j) => {
        const pay = typeof j.payment === 'number' ? j.payment : parseFloat(j.payment as any) || 0;
        return sum + pay;
      }, 0).toString(),
    };
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return {
      totalJobs: 0,
      postedJobs: 0,
      inProgressJobs: 0,
      completedJobs: 0,
      disputedJobs: 0,
      totalAgents: 0,
      verifiedAgents: 0,
      totalBids: 0,
      openDisputes: 0,
      avgBidsPerJob: 0,
      totalPaymentVolume: '0',
    };
  }
}

/**
 * Normalize job status from blockchain format to TypeScript enum format
 * Handles: POSTED -> Posted, IN_PROGRESS -> InProgress, COMPLETED -> Completed, CANCELLED -> Cancelled
 */
function normalizeJobStatus(status: string): JobStatus {
  if (!status) return JobStatus.Posted;
  
  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case 'POSTED':
      return JobStatus.Posted;
    case 'IN_PROGRESS':
    case 'INPROGRESS':
      return JobStatus.InProgress;
    case 'COMPLETED':
      return JobStatus.Completed;
    case 'CANCELLED':
    case 'CANCELED':
      return JobStatus.Cancelled;
    default:
      // Try to match if already in correct format
      if (Object.values(JobStatus).includes(status as JobStatus)) {
        return status as JobStatus;
      }
      console.warn('Unknown job status:', status);
      return JobStatus.Posted;
  }
}

/**
 * Rate an agent after job completion
 * Note: rateAgent mutation may not exist in all contract versions
 */
export async function rateAgentOnChain(jobId: number, rating: number, review: string): Promise<any> {
  // Get current user address for the rating
  const rater = getCurrentUserAddress() || '0x0000000000000000000000000000000000000000000000000000000000000000' as Owner;
  
  // Create rating object
  const ratingObj: AgentRating = {
    jobId,
    rater,
    rating,
    review,
    timestamp: new Date().toISOString()
  };

  // Always save locally first as backup
  saveLocalRating(ratingObj);

  try {
    const mutation = `
      mutation RateAgent($jobId: Int!, $rating: Int!, $review: String!) {
        rateAgent(jobId: $jobId, rating: $rating, review: $review)
      }
    `;
    return await executeApplicationMutation(mutation, { jobId, rating, review });
  } catch (error: any) {
    // If the mutation doesn't exist in the contract, rating is still saved locally
    if (error.message?.includes('Unknown field') || error.message?.includes('rateAgent')) {
      console.warn('rateAgent mutation not available in contract, rating saved locally');
      return { success: true, message: 'Rating saved locally', jobId, rating, review };
    }
    throw error;
  }
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

// Local storage key for ratings (fallback when contract doesn't support it)
const RATINGS_STORAGE_KEY = 'linera_mine_ratings';

function getLocalRatings(): AgentRating[] {
  try {
    const stored = localStorage.getItem(RATINGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalRating(rating: AgentRating): void {
  try {
    const ratings = getLocalRatings();
    ratings.push(rating);
    localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(ratings));
  } catch (e) {
    console.error('Failed to save rating locally:', e);
  }
}

/**
 * Get agent ratings/reviews
 */
export async function getAgentRatings(agentOwner: Owner): Promise<AgentRating[]> {
  // First try to get from local storage (always available)
  const localRatings = getLocalRatings().filter(r => {
    // Match ratings for this agent (we store by jobId, need to cross-reference)
    return true; // Return all for now, filter in component
  });

  // Try blockchain first
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
    const chainRatings = data.agentRatings || [];
    // Merge with local ratings (prefer chain data if available)
    if (chainRatings.length > 0) {
      return chainRatings;
    }
    return localRatings;
  } catch (error) {
    console.error('Failed to fetch agent ratings from chain, using local:', error);
    return localRatings;
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
      const jobs = await getJobsFromChain();
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
      const job = await getJobFromChain(jobId);
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
      const agents = await getAgentsFromChain();
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

// ==================== V2.0 ENHANCED API FUNCTIONS ====================

/**
 * Post a job with enhanced features (v2.0)
 */
export async function postJobEnhanced(input: PostJobInput): Promise<any> {
  const mutation = `
    mutation PostJob(
      $title: String!,
      $description: String!,
      $payment: String!,
      $category: JobCategory!,
      $tags: [String!]!,
      $deadline: Int,
      $milestones: [MilestoneInput!]!
    ) {
      postJob(
        title: $title,
        description: $description,
        payment: $payment,
        category: $category,
        tags: $tags,
        deadline: $deadline,
        milestones: $milestones
      )
    }
  `;
  return executeApplicationMutation(mutation, {
    title: input.title,
    description: input.description,
    payment: input.payment.toString(),
    category: input.category,
    tags: input.tags,
    deadline: input.deadline,
    milestones: input.milestones,
  });
}

/**
 * Place a bid with amount and proposal (v2.0)
 */
export async function placeBidEnhanced(input: PlaceBidInput): Promise<any> {
  const mutation = `
    mutation PlaceBid($jobId: Int!, $amount: String!, $proposal: String!, $estimatedDays: Int!) {
      placeBid(jobId: $jobId, amount: $amount, proposal: $proposal, estimatedDays: $estimatedDays)
    }
  `;
  return executeApplicationMutation(mutation, {
    jobId: input.jobId,
    amount: input.amount.toString(),
    proposal: input.proposal,
    estimatedDays: input.estimatedDays,
  });
}

/**
 * Accept a bid with amount (v2.0)
 */
export async function acceptBidEnhanced(jobId: number, agent: Owner, bidAmount: number | string): Promise<any> {
  const mutation = `
    mutation AcceptBid($jobId: Int!, $agent: String!, $bidAmount: String!) {
      acceptBid(jobId: $jobId, agent: $agent, bidAmount: $bidAmount)
    }
  `;
  return executeApplicationMutation(mutation, {
    jobId,
    agent,
    bidAmount: bidAmount.toString(),
  });
}

/**
 * Register agent with enhanced profile (v2.0)
 */
export async function registerAgentEnhanced(input: RegisterAgentInput): Promise<any> {
  const mutation = `
    mutation RegisterAgent($name: String!, $serviceDescription: String!, $skills: [String!]!, $hourlyRate: String) {
      registerAgent(name: $name, serviceDescription: $serviceDescription, skills: $skills, hourlyRate: $hourlyRate)
    }
  `;
  return executeApplicationMutation(mutation, {
    name: input.name,
    serviceDescription: input.serviceDescription,
    skills: input.skills,
    hourlyRate: input.hourlyRate?.toString(),
  });
}

/**
 * Update agent profile (v2.0)
 */
export async function updateAgentProfile(input: UpdateAgentInput): Promise<any> {
  const mutation = `
    mutation UpdateAgentProfile(
      $name: String,
      $serviceDescription: String,
      $skills: [String!],
      $portfolioUrls: [String!],
      $hourlyRate: String,
      $availability: Boolean
    ) {
      updateAgentProfile(
        name: $name,
        serviceDescription: $serviceDescription,
        skills: $skills,
        portfolioUrls: $portfolioUrls,
        hourlyRate: $hourlyRate,
        availability: $availability
      )
    }
  `;
  return executeApplicationMutation(mutation, {
    ...input,
    hourlyRate: input.hourlyRate?.toString(),
  });
}

// ==================== MILESTONE OPERATIONS ====================

/**
 * Submit work for a milestone
 */
export async function submitMilestone(jobId: number, milestoneId: number, deliveryNotes: string): Promise<any> {
  const mutation = `
    mutation SubmitMilestone($jobId: Int!, $milestoneId: Int!, $deliveryNotes: String!) {
      submitMilestone(jobId: $jobId, milestoneId: $milestoneId, deliveryNotes: $deliveryNotes)
    }
  `;
  return executeApplicationMutation(mutation, { jobId, milestoneId, deliveryNotes });
}

/**
 * Approve a milestone
 */
export async function approveMilestone(jobId: number, milestoneId: number): Promise<any> {
  const mutation = `
    mutation ApproveMilestone($jobId: Int!, $milestoneId: Int!) {
      approveMilestone(jobId: $jobId, milestoneId: $milestoneId)
    }
  `;
  return executeApplicationMutation(mutation, { jobId, milestoneId });
}

/**
 * Request revision for a milestone
 */
export async function requestRevision(jobId: number, milestoneId: number, feedback: string): Promise<any> {
  const mutation = `
    mutation RequestRevision($jobId: Int!, $milestoneId: Int!, $feedback: String!) {
      requestRevision(jobId: $jobId, milestoneId: $milestoneId, feedback: $feedback)
    }
  `;
  return executeApplicationMutation(mutation, { jobId, milestoneId, feedback });
}

// ==================== DISPUTE OPERATIONS ====================

/**
 * Open a dispute
 */
export async function openDispute(input: OpenDisputeInput): Promise<any> {
  const mutation = `
    mutation OpenDispute($jobId: Int!, $reason: String!) {
      openDispute(jobId: $jobId, reason: $reason)
    }
  `;
  return executeApplicationMutation(mutation, input);
}

/**
 * Respond to a dispute
 */
export async function respondToDispute(disputeId: number, response: string): Promise<any> {
  const mutation = `
    mutation RespondToDispute($disputeId: Int!, $response: String!) {
      respondToDispute(disputeId: $disputeId, response: $response)
    }
  `;
  return executeApplicationMutation(mutation, { disputeId, response });
}

/**
 * Resolve a dispute (admin only)
 */
export async function resolveDispute(input: ResolveDisputeInput): Promise<any> {
  const mutation = `
    mutation ResolveDispute($disputeId: Int!, $resolution: DisputeStatus!, $refundPercentage: Int, $notes: String!) {
      resolveDispute(disputeId: $disputeId, resolution: $resolution, refundPercentage: $refundPercentage, notes: $notes)
    }
  `;
  return executeApplicationMutation(mutation, input);
}

/**
 * Get all disputes
 */
export async function getDisputes(filter?: { status?: DisputeStatus; jobId?: number }): Promise<Dispute[]> {
  const query = `
    query GetDisputes($status: DisputeStatus, $jobId: Int) {
      disputes(filter: { status: $status, jobId: $jobId }) {
        id
        jobId
        initiator
        reason
        status
        createdAt
        resolvedAt
        resolutionNotes
        refundPercentage
      }
    }
  `;
  try {
    const data = await executeApplicationQuery(query, filter);
    return data.disputes || [];
  } catch (error) {
    console.error('Failed to fetch disputes:', error);
    return [];
  }
}

/**
 * Get a specific dispute
 */
export async function getDispute(id: number): Promise<Dispute | undefined> {
  const query = `
    query GetDispute($id: Int!) {
      dispute(id: $id) {
        id
        jobId
        initiator
        reason
        status
        createdAt
        resolvedAt
        resolutionNotes
        refundPercentage
      }
    }
  `;
  try {
    const data = await executeApplicationQuery(query, { id });
    return data.dispute;
  } catch (error) {
    console.error('Failed to fetch dispute:', error);
    return undefined;
  }
}

// ==================== MESSAGING OPERATIONS ====================

/**
 * Send a message
 */
export async function sendMessage(input: SendMessageInput): Promise<any> {
  const mutation = `
    mutation SendMessage($jobId: Int!, $recipient: String!, $content: String!) {
      sendMessage(jobId: $jobId, recipient: $recipient, content: $content)
    }
  `;
  return executeApplicationMutation(mutation, input);
}

/**
 * Mark messages as read
 */
export async function markMessagesRead(messageIds: number[]): Promise<any> {
  const mutation = `
    mutation MarkMessagesRead($messageIds: [Int!]!) {
      markMessagesRead(messageIds: $messageIds)
    }
  `;
  return executeApplicationMutation(mutation, { messageIds });
}

/**
 * Get messages for a job
 */
export async function getMessages(jobId: number): Promise<ChatMessage[]> {
  const query = `
    query GetMessages($jobId: Int!) {
      messages(jobId: $jobId) {
        id
        jobId
        sender
        recipient
        content
        timestamp
        read
      }
    }
  `;
  try {
    const data = await executeApplicationQuery(query, { jobId });
    return data.messages || [];
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return [];
  }
}

/**
 * Get unread message count
 */
export async function getUnreadMessagesCount(user: string): Promise<number> {
  const query = `
    query GetUnreadCount($user: String!) {
      unreadMessagesCount(user: $user)
    }
  `;
  try {
    const data = await executeApplicationQuery(query, { user });
    return data.unreadMessagesCount || 0;
  } catch (error) {
    console.error('Failed to fetch unread count:', error);
    return 0;
  }
}

// ==================== ESCROW OPERATIONS ====================

/**
 * Get escrow info for a job
 */
export async function getEscrow(jobId: number): Promise<EscrowInfo | undefined> {
  const query = `
    query GetEscrow($jobId: Int!) {
      escrow(jobId: $jobId) {
        jobId
        client
        agent
        amount
        status
        lockedAt
        releasedAt
      }
    }
  `;
  try {
    const data = await executeApplicationQuery(query, { jobId });
    return data.escrow;
  } catch (error) {
    console.error('Failed to fetch escrow:', error);
    return undefined;
  }
}

/**
 * Get all active escrows
 */
export async function getActiveEscrows(): Promise<EscrowInfo[]> {
  const query = `
    query GetActiveEscrows {
      activeEscrows {
        jobId
        client
        agent
        amount
        status
        lockedAt
        releasedAt
      }
    }
  `;
  try {
    const data = await executeApplicationQuery(query);
    return data.activeEscrows || [];
  } catch (error) {
    console.error('Failed to fetch active escrows:', error);
    return [];
  }
}

// ==================== CATEGORY & SEARCH ====================

/**
 * Get jobs by category
 */
export async function getJobsByCategory(category: JobCategory): Promise<Job[]> {
  const query = `
    query GetJobsByCategory($category: JobCategory!) {
      jobsByCategory(category: $category) {
        id
        client
        title
        description
        payment
        status
        category
        tags
        bids {
          agent
          bidId
          amount
          proposal
          estimatedDays
        }
        milestones {
          id
          title
          status
          paymentPercentage
        }
      }
    }
  `;
  try {
    const data = await executeApplicationQuery(query, { category });
    return data.jobsByCategory || [];
  } catch (error) {
    console.error('Failed to fetch jobs by category:', error);
    return [];
  }
}

/**
 * Search jobs by keyword
 */
export async function searchJobs(query: string): Promise<Job[]> {
  const gqlQuery = `
    query SearchJobs($query: String!) {
      searchJobs(query: $query) {
        id
        client
        title
        description
        payment
        status
        category
        tags
        bids {
          agent
          bidId
          amount
        }
      }
    }
  `;
  try {
    const data = await executeApplicationQuery(gqlQuery, { query });
    return data.searchJobs || [];
  } catch (error) {
    console.error('Failed to search jobs:', error);
    return [];
  }
}

/**
 * Get agents by skill
 */
export async function getAgentsBySkill(skill: string): Promise<AgentProfile[]> {
  const query = `
    query GetAgentsBySkill($skill: String!) {
      agentsBySkill(skill: $skill) {
        owner
        name
        serviceDescription
        skills
        verificationLevel
        jobsCompleted
        totalRatingPoints
        totalRatings
        successRate
        availability
      }
    }
  `;
  try {
    const data = await executeApplicationQuery(query, { skill });
    return data.agentsBySkill || [];
  } catch (error) {
    console.error('Failed to fetch agents by skill:', error);
    return [];
  }
}

/**
 * Get verified agents
 */
export async function getVerifiedAgents(minLevel?: VerificationLevel): Promise<AgentProfile[]> {
  const query = `
    query GetVerifiedAgents($minLevel: VerificationLevel) {
      verifiedAgents(minLevel: $minLevel) {
        owner
        name
        serviceDescription
        skills
        verificationLevel
        jobsCompleted
        totalRatingPoints
        totalRatings
        successRate
        availability
      }
    }
  `;
  try {
    const data = await executeApplicationQuery(query, { minLevel });
    return data.verifiedAgents || [];
  } catch (error) {
    console.error('Failed to fetch verified agents:', error);
    return [];
  }
}

// ==================== ENHANCED STATS ====================

/**
 * Get category statistics
 */
export async function getCategoryStats(): Promise<{ category: JobCategory; count: number }[]> {
  const query = `
    query GetCategoryStats {
      categoryStats {
        category
        count
      }
    }
  `;
  try {
    const data = await executeApplicationQuery(query);
    return data.categoryStats || [];
  } catch (error) {
    console.error('Failed to fetch category stats:', error);
    return [];
  }
}

/**
 * Get open disputes count
 */
export async function getOpenDisputesCount(): Promise<number> {
  const query = `
    query GetOpenDisputesCount {
      openDisputesCount
    }
  `;
  try {
    const data = await executeApplicationQuery(query);
    return data.openDisputesCount || 0;
  } catch (error) {
    console.error('Failed to fetch open disputes count:', error);
    return 0;
  }
}
