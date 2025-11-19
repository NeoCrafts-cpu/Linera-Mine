
import { AgentProfile, Job, JobStatus, Owner, Bid } from '../types';
import * as Linera from './linera';

// Toggle between mock data and Linera blockchain
// Set VITE_USE_LINERA=true in .env.local to enable Linera integration
const USE_LINERA = import.meta.env.VITE_USE_LINERA === 'true';
const CHAIN_ID = import.meta.env.VITE_LINERA_CHAIN_ID || '';
const APP_ID = import.meta.env.VITE_LINERA_APP_ID || '';

console.log('🔗 Linera Integration:', {
  enabled: USE_LINERA,
  chainId: CHAIN_ID ? `${CHAIN_ID.substring(0, 16)}...` : 'Not set',
  appId: APP_ID ? `${APP_ID.substring(0, 16)}...` : 'Not set',
});

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
  { owner: MOCK_OWNERS[1], name: 'CodeBot 5000', serviceDescription: 'Expert in Rust smart contract auditing.', jobsCompleted: 42, totalRatingPoints: 205, rating: 4.9 },
  { owner: MOCK_OWNERS[2], name: 'Artisan AI', serviceDescription: 'Generates stunning digital art from prompts.', jobsCompleted: 120, totalRatingPoints: 588, rating: 4.9 },
  { owner: MOCK_OWNERS[3], name: 'DataCruncher', serviceDescription: 'Provides deep data analysis and market insights.', jobsCompleted: 75, totalRatingPoints: 360, rating: 4.8 },
  { owner: MOCK_OWNERS[4], name: 'TranslateSphere', serviceDescription: 'Fast and accurate multilingual translation services.', jobsCompleted: 210, totalRatingPoints: 1000, rating: 4.7 },
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
      resolve(JSON.parse(JSON.stringify(data))); // Deep copy to prevent mutation
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

// ==================== LINERA BLOCKCHAIN FUNCTIONS ====================

/**
 * Execute an operation on the Linera blockchain
 */
export async function executeOperation(operation: any): Promise<any> {
  if (!USE_LINERA) {
    throw new Error('Linera integration is not enabled. Set VITE_USE_LINERA=true');
  }

  const mutation = `
    mutation($chainId: ID!, $operation: String!) {
      executeOperation(
        chainId: $chainId
        operation: $operation
      )
    }
  `;

  try {
    const result = await Linera.graphqlRequest(mutation, {
      chainId: CHAIN_ID,
      operation: JSON.stringify(operation),
    });
    console.log('✅ Operation executed on chain:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to execute operation:', error);
    throw error;
  }
}

/**
 * Register as an agent on the blockchain
 */
export async function registerAgentOnChain(name: string, serviceDescription: string): Promise<any> {
  const operation = {
    RegisterAgent: {
      name,
      service_description: serviceDescription,
    },
  };
  return executeOperation(operation);
}

/**
 * Post a job on the blockchain
 */
export async function postJobOnChain(description: string, payment: number): Promise<any> {
  const operation = {
    PostJob: {
      description,
      payment: payment.toString(),
    },
  };
  return executeOperation(operation);
}

/**
 * Place a bid on a job
 */
export async function placeBidOnChain(jobId: number): Promise<any> {
  const operation = {
    PlaceBid: {
      job_id: jobId,
    },
  };
  return executeOperation(operation);
}

/**
 * Accept a bid (client accepts an agent's bid)
 */
export async function acceptBidOnChain(jobId: number, agent: Owner): Promise<any> {
  const operation = {
    AcceptBid: {
      job_id: jobId,
      agent,
    },
  };
  return executeOperation(operation);
}

/**
 * Complete a job
 */
export async function completeJobOnChain(jobId: number): Promise<any> {
  const operation = {
    CompleteJob: {
      job_id: jobId,
    },
  };
  return executeOperation(operation);
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
    graphqlUrl: import.meta.env.VITE_LINERA_GRAPHQL_URL,
  };
}
