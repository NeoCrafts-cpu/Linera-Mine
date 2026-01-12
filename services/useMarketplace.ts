/**
 * @deprecated This file is deprecated and should be deleted.
 * The app now uses the WASM adapter from './linera/index' instead.
 * This file is excluded from TypeScript compilation via tsconfig.json.
 * 
 * TODO: Delete this file when able to modify filesystem.
 */

/**
 * Job Marketplace Hooks for Linera
 * 
 * Custom hooks for the Job Marketplace application following Linera example patterns.
 * These hooks wrap the GraphQL queries and mutations specific to your application.
 * 
 * Pattern based on:
 * - examples/non-fungible/web-frontend/src/App.js (NFT queries)
 * - examples/social/web-frontend/src/App.tsx (posts with subscriptions)
 * - examples/fungible/web-frontend/src/App.tsx (token transfers)
 */

import { useCallback, useEffect, useState } from 'react';
import { useLinera, useLineraQuery, useLazyLineraQuery, useLineraMutation, useLineraSubscription } from './LineraProvider';
import { Job, AgentProfile, Bid, JobStatus, Owner } from '../types';

// ==================== GRAPHQL QUERIES ====================

const GET_JOBS = `
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

const GET_JOB = `
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

const GET_AGENTS = `
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

const GET_AGENT = `
  query GetAgent($owner: String!) {
    agent(owner: $owner) {
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

// ==================== GRAPHQL MUTATIONS ====================

const POST_JOB = `
  mutation PostJob(
    $title: String!
    $description: String!
    $payment: String!
    $category: String!
    $tags: [String!]!
    $milestones: [MilestoneInput!]!
  ) {
    postJob(
      title: $title
      description: $description
      payment: $payment
      category: $category
      tags: $tags
      milestones: $milestones
    )
  }
`;

const PLACE_BID = `
  mutation PlaceBid(
    $jobId: Int!
    $amount: String!
    $proposal: String!
    $estimatedDays: Int!
  ) {
    placeBid(
      jobId: $jobId
      amount: $amount
      proposal: $proposal
      estimatedDays: $estimatedDays
    )
  }
`;

const ACCEPT_BID = `
  mutation AcceptBid($jobId: Int!, $agent: String!, $bidAmount: String!) {
    acceptBid(jobId: $jobId, agent: $agent, bidAmount: $bidAmount)
  }
`;

const COMPLETE_JOB = `
  mutation CompleteJob($jobId: Int!) {
    completeJob(jobId: $jobId)
  }
`;

const REGISTER_AGENT = `
  mutation RegisterAgent(
    $name: String!
    $serviceDescription: String!
    $skills: [String!]!
    $hourlyRate: String
  ) {
    registerAgent(
      name: $name
      serviceDescription: $serviceDescription
      skills: $skills
      hourlyRate: $hourlyRate
    )
  }
`;

const RATE_AGENT = `
  mutation RateAgent($jobId: Int!, $rating: Int!, $review: String) {
    rateAgent(jobId: $jobId, rating: $rating, review: $review)
  }
`;

// ==================== DATA HOOKS ====================

/**
 * useJobs - Fetch all jobs from the marketplace
 * 
 * Pattern from Linera Social example - fetches posts and refetches on notifications
 */
export function useJobs(options?: { refetchOnNotification?: boolean }) {
  const { data, loading, error, refetch } = useLineraQuery<{ jobs: Job[] }>(GET_JOBS);

  // Auto-refetch on chain notifications (like Linera Social example)
  useLineraSubscription({
    onData: () => {
      if (options?.refetchOnNotification !== false) {
        refetch();
      }
    },
    skip: options?.refetchOnNotification === false
  });

  // Process jobs - normalize status and convert types
  const jobs = data?.jobs?.map(job => ({
    ...job,
    payment: typeof job.payment === 'string' ? parseFloat(job.payment) : job.payment,
    id: typeof job.id === 'string' ? parseInt(job.id, 10) : job.id,
    bids: (job.bids || []).map(bid => ({
      ...bid,
      amount: typeof bid.amount === 'string' ? parseFloat(bid.amount) : bid.amount,
      bidId: typeof bid.bidId === 'string' ? parseInt(bid.bidId, 10) : bid.bidId,
    }))
  })) || [];

  return { jobs, loading, error, refetch };
}

/**
 * useLazyJobs - Fetch jobs on demand
 */
export function useLazyJobs() {
  const [getJobs, { data, loading, error, called }] = useLazyLineraQuery<{ jobs: Job[] }>(GET_JOBS);
  
  const jobs = data?.jobs || [];
  
  return [getJobs, { jobs, loading, error, called }] as const;
}

/**
 * useJob - Fetch a specific job by ID
 */
export function useJob(id: number | undefined) {
  const { data, loading, error, refetch } = useLineraQuery<{ job: Job | null }>(GET_JOB, {
    variables: { id },
    skip: id === undefined
  });

  return { job: data?.job || null, loading, error, refetch };
}

/**
 * useAgents - Fetch all registered agents
 */
export function useAgents(options?: { refetchOnNotification?: boolean }) {
  const { data, loading, error, refetch } = useLineraQuery<{ agents: AgentProfile[] }>(GET_AGENTS);

  useLineraSubscription({
    onData: () => {
      if (options?.refetchOnNotification !== false) {
        refetch();
      }
    },
    skip: options?.refetchOnNotification === false
  });

  // Process agents - calculate rating
  const agents = data?.agents?.map(agent => ({
    ...agent,
    rating: agent.totalRatings > 0 
      ? agent.totalRatingPoints / agent.totalRatings 
      : 0,
    hourlyRate: agent.hourlyRate ? parseFloat(String(agent.hourlyRate)) : null,
  })) || [];

  return { agents, loading, error, refetch };
}

/**
 * useAgent - Fetch a specific agent by owner address
 */
export function useAgent(owner: string | undefined) {
  const { data, loading, error, refetch } = useLineraQuery<{ agent: AgentProfile | null }>(GET_AGENT, {
    variables: { owner },
    skip: !owner
  });

  return { agent: data?.agent || null, loading, error, refetch };
}

// ==================== MUTATION HOOKS ====================

/**
 * usePostJob - Post a new job to the marketplace
 * 
 * Based on Linera NFT example's useMutation pattern
 */
export function usePostJob() {
  const [execute, { data, loading, error }] = useLineraMutation<{ postJob: boolean }>(POST_JOB);

  const postJob = useCallback(async (input: {
    title: string;
    description: string;
    payment: number;
    category: string;
    tags: string[];
    milestones?: Array<{
      title: string;
      description: string;
      paymentPercentage: number;
      dueDate?: number;
    }>;
  }) => {
    return execute({
      variables: {
        title: input.title,
        description: input.description,
        payment: input.payment.toString(),
        category: input.category,
        tags: input.tags,
        milestones: input.milestones || []
      }
    });
  }, [execute]);

  return [postJob, { data, loading, error }] as const;
}

/**
 * usePlaceBid - Place a bid on a job
 */
export function usePlaceBid() {
  const [execute, { data, loading, error }] = useLineraMutation<{ placeBid: boolean }>(PLACE_BID);

  const placeBid = useCallback(async (input: {
    jobId: number;
    amount: number;
    proposal: string;
    estimatedDays: number;
  }) => {
    return execute({
      variables: {
        jobId: input.jobId,
        amount: input.amount.toString(),
        proposal: input.proposal,
        estimatedDays: input.estimatedDays
      }
    });
  }, [execute]);

  return [placeBid, { data, loading, error }] as const;
}

/**
 * useAcceptBid - Accept a bid (client only)
 */
export function useAcceptBid() {
  const [execute, { data, loading, error }] = useLineraMutation<{ acceptBid: boolean }>(ACCEPT_BID);

  const acceptBid = useCallback(async (input: {
    jobId: number;
    agent: string;
    bidAmount: number;
  }) => {
    return execute({
      variables: {
        jobId: input.jobId,
        agent: input.agent,
        bidAmount: input.bidAmount.toString()
      }
    });
  }, [execute]);

  return [acceptBid, { data, loading, error }] as const;
}

/**
 * useCompleteJob - Mark a job as completed
 */
export function useCompleteJob() {
  const [execute, { data, loading, error }] = useLineraMutation<{ completeJob: boolean }>(COMPLETE_JOB);

  const completeJob = useCallback(async (jobId: number) => {
    return execute({ variables: { jobId } });
  }, [execute]);

  return [completeJob, { data, loading, error }] as const;
}

/**
 * useRegisterAgent - Register as an agent
 */
export function useRegisterAgent() {
  const [execute, { data, loading, error }] = useLineraMutation<{ registerAgent: boolean }>(REGISTER_AGENT);

  const registerAgent = useCallback(async (input: {
    name: string;
    serviceDescription: string;
    skills: string[];
    hourlyRate?: number;
  }) => {
    return execute({
      variables: {
        name: input.name,
        serviceDescription: input.serviceDescription,
        skills: input.skills,
        hourlyRate: input.hourlyRate?.toString() || null
      }
    });
  }, [execute]);

  return [registerAgent, { data, loading, error }] as const;
}

/**
 * useRateAgent - Rate an agent after job completion
 */
export function useRateAgent() {
  const [execute, { data, loading, error }] = useLineraMutation<{ rateAgent: boolean }>(RATE_AGENT);

  const rateAgent = useCallback(async (input: {
    jobId: number;
    rating: number;
    review?: string;
  }) => {
    return execute({
      variables: {
        jobId: input.jobId,
        rating: input.rating,
        review: input.review || null
      }
    });
  }, [execute]);

  return [rateAgent, { data, loading, error }] as const;
}

// ==================== EXPORTS ====================

export {
  GET_JOBS,
  GET_JOB,
  GET_AGENTS,
  GET_AGENT,
  POST_JOB,
  PLACE_BID,
  ACCEPT_BID,
  COMPLETE_JOB,
  REGISTER_AGENT,
  RATE_AGENT
};
