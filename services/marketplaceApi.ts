/**
 * Marketplace API - Uses LineraAdapter for blockchain operations
 * 
 * This provides typed access to all Job Marketplace operations.
 * Uses the @linera/client WASM module for direct blockchain interaction.
 */

import { lineraAdapter } from './linera/index';
import * as Queries from './linera/queries';
import { 
  Job, AgentProfile, Bid, JobStatus, JobCategory, 
  MarketplaceStats, Dispute, ChatMessage 
} from '../types';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface JobsResponse {
  jobs: Job[];
}

interface JobResponse {
  job: Job | null;
}

interface AgentsResponse {
  agents: AgentProfile[];
}

interface AgentResponse {
  agent: AgentProfile | null;
}

interface StatsResponse {
  stats: MarketplaceStats;
}

interface DisputesResponse {
  disputes: Dispute[];
}

interface MessagesResponse {
  jobMessages: ChatMessage[];
}

interface HelloResponse {
  hello: string;
}

// =============================================================================
// MARKETPLACE API CLASS
// =============================================================================

/**
 * MarketplaceApi provides typed access to all Job Marketplace operations
 */
class MarketplaceApiClass {
  
  // ===========================================================================
  // CONNECTION
  // ===========================================================================
  
  /**
   * Check if connected to blockchain
   */
  isConnected(): boolean {
    return lineraAdapter.isApplicationConnected();
  }

  /**
   * Check connection health with a simple query
   */
  async healthCheck(): Promise<string> {
    const result = await lineraAdapter.query<HelloResponse>(Queries.HELLO_QUERY);
    return result.hello;
  }

  // ===========================================================================
  // JOB QUERIES
  // ===========================================================================
  
  /**
   * Get all jobs with optional filtering
   */
  async getJobs(options?: {
    filter?: {
      status?: JobStatus;
      category?: JobCategory;
      tags?: string[];
      search?: string;
    };
    sortBy?: 'CREATED_AT' | 'PAYMENT' | 'DEADLINE' | 'BID_COUNT';
    sortDir?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Job[]> {
    const result = await lineraAdapter.query<JobsResponse>(
      Queries.GET_JOBS,
      {
        filter: options?.filter,
        sortBy: options?.sortBy,
        sortDir: options?.sortDir,
        limit: options?.limit,
        offset: options?.offset,
      }
    );
    return result.jobs || [];
  }

  /**
   * Get a specific job by ID
   */
  async getJob(id: number): Promise<Job | null> {
    const result = await lineraAdapter.query<JobResponse>(
      Queries.GET_JOB,
      { id }
    );
    return result.job;
  }

  /**
   * Search jobs by keyword
   */
  async searchJobs(query: string): Promise<Job[]> {
    const result = await lineraAdapter.query<{ searchJobs: Job[] }>(
      Queries.SEARCH_JOBS,
      { query }
    );
    return result.searchJobs || [];
  }

  /**
   * Get jobs by category
   */
  async getJobsByCategory(category: JobCategory): Promise<Job[]> {
    const result = await lineraAdapter.query<{ jobsByCategory: Job[] }>(
      Queries.GET_JOBS_BY_CATEGORY,
      { category }
    );
    return result.jobsByCategory || [];
  }

  /**
   * Get job count
   */
  async getJobsCount(status?: JobStatus): Promise<number> {
    const result = await lineraAdapter.query<{ jobsCount: number }>(
      Queries.GET_JOBS_COUNT,
      { status }
    );
    return result.jobsCount || 0;
  }

  // ===========================================================================
  // AGENT QUERIES
  // ===========================================================================

  /**
   * Get all agents with optional filtering
   */
  async getAgents(options?: {
    filter?: {
      minJobsCompleted?: number;
      minRating?: number;
      skills?: string[];
      available?: boolean;
    };
    sortBy?: 'JOBS_COMPLETED' | 'RATING' | 'REGISTERED_AT' | 'SUCCESS_RATE';
    sortDir?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<AgentProfile[]> {
    const result = await lineraAdapter.query<AgentsResponse>(
      Queries.GET_AGENTS,
      {
        filter: options?.filter,
        sortBy: options?.sortBy,
        sortDir: options?.sortDir,
        limit: options?.limit,
        offset: options?.offset,
      }
    );
    return result.agents || [];
  }

  /**
   * Get a specific agent by owner address
   */
  async getAgent(owner: string): Promise<AgentProfile | null> {
    const result = await lineraAdapter.query<AgentResponse>(
      Queries.GET_AGENT,
      { owner: owner.toLowerCase() }
    );
    return result.agent;
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get marketplace statistics
   */
  async getStats(): Promise<MarketplaceStats> {
    const result = await lineraAdapter.query<StatsResponse>(Queries.GET_STATS);
    return result.stats;
  }

  // ===========================================================================
  // DISPUTES
  // ===========================================================================

  /**
   * Get disputes
   */
  async getDisputes(filter?: { status?: string; jobId?: number }): Promise<Dispute[]> {
    const result = await lineraAdapter.query<DisputesResponse>(
      Queries.GET_DISPUTES,
      { filter }
    );
    return result.disputes || [];
  }

  // ===========================================================================
  // MESSAGES
  // ===========================================================================

  /**
   * Get messages for a job
   */
  async getJobMessages(jobId: number): Promise<ChatMessage[]> {
    const result = await lineraAdapter.query<MessagesResponse>(
      Queries.GET_JOB_MESSAGES,
      { jobId }
    );
    return result.jobMessages || [];
  }

  // ===========================================================================
  // JOB MUTATIONS
  // ===========================================================================

  /**
   * Post a new job
   */
  async postJob(input: {
    title: string;
    description: string;
    payment: string;
    deadline?: number | null;
    category: JobCategory;
    tags: string[];
    milestones?: Array<{
      title: string;
      description: string;
      payment_percentage: number;
      due_days?: number | null;
    }>;
  }): Promise<number> {
    const result = await lineraAdapter.mutate<{ postJob: number }>(
      Queries.POST_JOB,
      {
        ...input,
        deadline: input.deadline || null,
        milestones: input.milestones || [],
      }
    );
    return result.postJob;
  }

  /**
   * Place a bid on a job
   */
  async placeBid(input: {
    jobId: number;
    amount: string;
    proposal: string;
    estimatedDays?: number;
  }): Promise<boolean> {
    await lineraAdapter.mutate(Queries.PLACE_BID, {
      ...input,
      estimatedDays: input.estimatedDays || 7, // Default to 7 days
    });
    return true;
  }

  /**
   * Accept a bid on a job
   */
  async acceptBid(jobId: number, agent: string, bidAmount: string): Promise<boolean> {
    await lineraAdapter.mutate(Queries.ACCEPT_BID, { jobId, agent, bidAmount });
    return true;
  }

  /**
   * Complete a job
   */
  async completeJob(jobId: number): Promise<boolean> {
    await lineraAdapter.mutate(Queries.COMPLETE_JOB, { jobId });
    return true;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: number): Promise<boolean> {
    await lineraAdapter.mutate(Queries.CANCEL_JOB, { jobId });
    return true;
  }

  // ===========================================================================
  // AGENT MUTATIONS
  // ===========================================================================

  /**
   * Register as an agent
   */
  async registerAgent(input: {
    name: string;
    serviceDescription: string;
    skills: string[];
    hourlyRate?: string;
  }): Promise<boolean> {
    await lineraAdapter.mutate(Queries.REGISTER_AGENT, input);
    return true;
  }

  /**
   * Update agent profile
   */
  async updateAgent(input: {
    name?: string;
    serviceDescription?: string;
    skills?: string[];
    portfolioUrls?: string[];
    hourlyRate?: string;
    availability?: boolean;
  }): Promise<boolean> {
    await lineraAdapter.mutate(Queries.UPDATE_AGENT, input);
    return true;
  }

  /**
   * Update agent profile (alias for updateAgent)
   */
  async updateAgentProfile(input: {
    name?: string;
    serviceDescription?: string;
  }): Promise<boolean> {
    return this.updateAgent({ name: input.name, serviceDescription: input.serviceDescription });
  }

  /**
   * Rate an agent
   * Contract expects: jobId, rating, review
   */
  async rateAgent(input: {
    jobId: number;
    rating: number;
    review: string;
  }): Promise<boolean> {
    await lineraAdapter.mutate(Queries.RATE_AGENT, {
      jobId: input.jobId,
      rating: input.rating,
      review: input.review,
    });
    return true;
  }

  // ===========================================================================
  // MILESTONE MUTATIONS
  // ===========================================================================

  /**
   * Complete a milestone
   */
  async completeMilestone(jobId: number, milestoneId: number): Promise<boolean> {
    await lineraAdapter.mutate(Queries.COMPLETE_MILESTONE, { jobId, milestoneId });
    return true;
  }

  // ===========================================================================
  // DISPUTE MUTATIONS
  // ===========================================================================

  /**
   * Open a dispute
   */
  async openDispute(jobId: number, reason: string): Promise<boolean> {
    await lineraAdapter.mutate(Queries.OPEN_DISPUTE, { jobId, reason });
    return true;
  }

  /**
   * Resolve a dispute
   * Contract expects: disputeId, resolution (DisputeStatus), refundPercentage, notes
   */
  async resolveDispute(
    disputeId: number, 
    resolution: 'RESOLVED_FOR_CLIENT' | 'RESOLVED_FOR_AGENT' | 'RESOLVED_SPLIT', 
    notes: string,
    refundPercentage?: number
  ): Promise<boolean> {
    await lineraAdapter.mutate(Queries.RESOLVE_DISPUTE, { 
      disputeId, 
      resolution, 
      refundPercentage,
      notes
    });
    return true;
  }

  // ===========================================================================
  // MESSAGE MUTATIONS
  // ===========================================================================

  /**
   * Send a message on a job
   * Contract expects: jobId, recipient, content
   */
  async sendMessage(jobId: number, recipient: string, content: string): Promise<boolean> {
    await lineraAdapter.mutate(Queries.SEND_MESSAGE, { jobId, recipient, content });
    return true;
  }

  // ===========================================================================
  // ESCROW MUTATIONS
  // ===========================================================================

  /**
   * Fund escrow for a job
   */
  async fundEscrow(jobId: number, amount: string): Promise<boolean> {
    await lineraAdapter.mutate(Queries.FUND_ESCROW, { jobId, amount });
    return true;
  }

  /**
   * Release escrow funds
   */
  async releaseEscrow(jobId: number, amount: string): Promise<boolean> {
    await lineraAdapter.mutate(Queries.RELEASE_ESCROW, { jobId, amount });
    return true;
  }
}

// Export singleton instance
export const marketplaceApi = new MarketplaceApiClass();

export default marketplaceApi;
