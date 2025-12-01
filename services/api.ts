
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
 * Get the application GraphQL endpoint URL
 * Linera applications are accessed at: /chains/{chainId}/applications/{appId}
 */
function getApplicationEndpoint(): string {
  const baseUrl = import.meta.env.VITE_LINERA_GRAPHQL_URL || 'http://localhost:8081';
  return `${baseUrl}/chains/${CHAIN_ID}/applications/${APP_ID}`;
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
    graphqlUrl: import.meta.env.VITE_LINERA_GRAPHQL_URL,
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
