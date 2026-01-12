/**
 * Job Marketplace GraphQL Queries and Mutations
 * 
 * All GraphQL operations for the Job Marketplace contract.
 * These match the schema defined in the Rust service.
 * 
 * Contract Schema Reference:
 * - Job: id, title, description, client, payment, status, bids, category, tags, milestones, etc.
 * - AgentProfile: owner, name, bio, skills, rating, jobs_completed, etc.
 * - Bid: agent, amount, proposal, submitted_at
 * - Dispute: id, job_id, opened_by, reason, status, resolution
 */

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Health check query
 */
export const HELLO_QUERY = `
  query Hello {
    hello
  }
`;

/**
 * Get all jobs with optional filtering
 * 
 * Contract schema:
 * - Bid: agent, bidId, timestamp, amount, proposal, estimatedDays
 * - Milestone: id, title, description, paymentPercentage, status, dueDate
 * - Job: id, client, description, payment, status, agent, bids, createdAt, title, category, tags, deadline, milestones, acceptedBidAmount, escrowId
 */
export const GET_JOBS = `
  query GetJobs($filter: JobFilter, $sortBy: JobSortField, $sortDir: SortDirection, $limit: Int, $offset: Int) {
    jobs(filter: $filter, sortBy: $sortBy, sortDir: $sortDir, limit: $limit, offset: $offset) {
      id
      title
      description
      client
      payment
      status
      deadline
      category
      tags
      createdAt
      agent
      acceptedBidAmount
      escrowId
      bids {
        agent
        bidId
        amount
        proposal
        timestamp
        estimatedDays
      }
      milestones {
        id
        title
        description
        paymentPercentage
        status
        dueDate
      }
    }
  }
`;

/**
 * Get a specific job by ID
 * 
 * Contract schema matches GET_JOBS
 */
export const GET_JOB = `
  query GetJob($id: Int!) {
    job(id: $id) {
      id
      title
      description
      client
      payment
      status
      deadline
      category
      tags
      createdAt
      agent
      acceptedBidAmount
      escrowId
      bids {
        agent
        bidId
        amount
        proposal
        timestamp
        estimatedDays
      }
      milestones {
        id
        title
        description
        paymentPercentage
        status
        dueDate
      }
    }
  }
`;

/**
 * Search jobs by keyword
 */
export const SEARCH_JOBS = `
  query SearchJobs($query: String!) {
    searchJobs(query: $query) {
      id
      title
      description
      client
      payment
      status
      category
      tags
    }
  }
`;

/**
 * Get jobs by category
 */
export const GET_JOBS_BY_CATEGORY = `
  query GetJobsByCategory($category: JobCategory!) {
    jobsByCategory(category: $category) {
      id
      title
      description
      payment
      status
      category
      tags
    }
  }
`;

/**
 * Get job count by status
 */
export const GET_JOBS_COUNT = `
  query GetJobsCount($status: JobStatus) {
    jobsCount(status: $status)
  }
`;

/**
 * Get all agents with optional filtering
 * 
 * Contract schema (AgentProfile):
 * - owner, name, serviceDescription, jobsCompleted, totalRatingPoints, totalRatings
 * - registeredAt, verificationLevel, skills, portfolioUrls, hourlyRate
 * - availability, responseTimeHours, successRate
 */
export const GET_AGENTS = `
  query GetAgents($filter: AgentFilter, $sortBy: AgentSortField, $sortDir: SortDirection, $limit: Int, $offset: Int) {
    agents(filter: $filter, sortBy: $sortBy, sortDir: $sortDir, limit: $limit, offset: $offset) {
      owner
      name
      serviceDescription
      skills
      hourlyRate
      totalRatingPoints
      totalRatings
      jobsCompleted
      successRate
      verificationLevel
      registeredAt
      availability
      portfolioUrls
      responseTimeHours
    }
  }
`;

/**
 * Get a specific agent by owner address
 * 
 * Note: The contract stores ratings separately in AgentRating struct
 * Reviews are fetched via agentRatings query
 */
export const GET_AGENT = `
  query GetAgent($owner: String!) {
    agent(owner: $owner) {
      owner
      name
      serviceDescription
      skills
      hourlyRate
      totalRatingPoints
      totalRatings
      jobsCompleted
      successRate
      verificationLevel
      registeredAt
      availability
      portfolioUrls
      responseTimeHours
    }
  }
`;

/**
 * Get marketplace statistics
 * 
 * Contract schema (MarketplaceStats):
 * - totalJobs, postedJobs, inProgressJobs, completedJobs, disputedJobs
 * - totalAgents, verifiedAgents, totalPaymentVolume, totalBids
 * - openDisputes, avgBidsPerJob
 */
export const GET_STATS = `
  query GetStats {
    stats {
      totalJobs
      postedJobs
      inProgressJobs
      completedJobs
      disputedJobs
      totalAgents
      verifiedAgents
      totalPaymentVolume
      totalBids
      openDisputes
      avgBidsPerJob
    }
  }
`;

/**
 * Get disputes with optional filtering
 * 
 * Contract schema (Dispute):
 * - id, jobId, initiator, reason, status, createdAt, resolvedAt, resolutionNotes, refundPercentage
 */
export const GET_DISPUTES = `
  query GetDisputes($filter: DisputeFilter) {
    disputes(filter: $filter) {
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

/**
 * Get a specific dispute
 */
export const GET_DISPUTE = `
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

/**
 * Get messages for a job
 * 
 * Contract schema (ChatMessage):
 * - id, jobId, sender, recipient, content, timestamp, read
 */
export const GET_JOB_MESSAGES = `
  query GetJobMessages($jobId: Int!) {
    jobMessages(jobId: $jobId) {
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

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Post a new job
 * Note: milestones is required by the contract, pass empty array [] if no milestones
 */
export const POST_JOB = `
  mutation PostJob($title: String!, $description: String!, $payment: String!, $deadline: Int, $category: JobCategory!, $tags: [String!]!, $milestones: [MilestoneInput!]!) {
    postJob(title: $title, description: $description, payment: $payment, deadline: $deadline, category: $category, tags: $tags, milestones: $milestones)
  }
`;

/**
 * Place a bid on a job
 * 
 * Contract params: jobId, amount, proposal, estimatedDays
 */
export const PLACE_BID = `
  mutation PlaceBid($jobId: Int!, $amount: String!, $proposal: String!, $estimatedDays: Int!) {
    placeBid(jobId: $jobId, amount: $amount, proposal: $proposal, estimatedDays: $estimatedDays)
  }
`;

/**
 * Accept a bid on a job
 * 
 * Contract params: jobId, agent (AccountOwner), bidAmount
 */
export const ACCEPT_BID = `
  mutation AcceptBid($jobId: Int!, $agent: String!, $bidAmount: String!) {
    acceptBid(jobId: $jobId, agent: $agent, bidAmount: $bidAmount)
  }
`;

/**
 * Register as an agent
 * 
 * Contract params: name, serviceDescription, skills, hourlyRate (optional)
 */
export const REGISTER_AGENT = `
  mutation RegisterAgent($name: String!, $serviceDescription: String!, $skills: [String!]!, $hourlyRate: String) {
    registerAgent(name: $name, serviceDescription: $serviceDescription, skills: $skills, hourlyRate: $hourlyRate)
  }
`;

/**
 * Update agent profile
 * 
 * Contract: UpdateAgentProfile with serviceDescription, portfolioUrls, availability
 */
export const UPDATE_AGENT = `
  mutation UpdateAgentProfile($name: String, $serviceDescription: String, $skills: [String!], $portfolioUrls: [String!], $hourlyRate: String, $availability: Boolean) {
    updateAgentProfile(name: $name, serviceDescription: $serviceDescription, skills: $skills, portfolioUrls: $portfolioUrls, hourlyRate: $hourlyRate, availability: $availability)
  }
`;

/**
 * Complete a job
 */
export const COMPLETE_JOB = `
  mutation CompleteJob($jobId: Int!) {
    completeJob(jobId: $jobId)
  }
`;

/**
 * Complete a milestone
 */
export const COMPLETE_MILESTONE = `
  mutation CompleteMilestone($jobId: Int!, $milestoneId: Int!) {
    completeMilestone(jobId: $jobId, milestoneId: $milestoneId)
  }
`;

/**
 * Rate an agent after job completion
 * 
 * Contract params: jobId, rating (u8: 1-5), review
 */
export const RATE_AGENT = `
  mutation RateAgent($jobId: Int!, $rating: Int!, $review: String!) {
    rateAgent(jobId: $jobId, rating: $rating, review: $review)
  }
`;

/**
 * Open a dispute
 */
export const OPEN_DISPUTE = `
  mutation OpenDispute($jobId: Int!, $reason: String!) {
    openDispute(jobId: $jobId, reason: $reason)
  }
`;

/**
 * Resolve a dispute
 * 
 * Contract params: disputeId, resolution (DisputeStatus), refundPercentage, notes
 */
export const RESOLVE_DISPUTE = `
  mutation ResolveDispute($disputeId: Int!, $resolution: DisputeStatus!, $refundPercentage: Int, $notes: String!) {
    resolveDispute(disputeId: $disputeId, resolution: $resolution, refundPercentage: $refundPercentage, notes: $notes)
  }
`;

/**
 * Send a message on a job
 * 
 * Contract params: jobId, recipient (AccountOwner), content
 */
export const SEND_MESSAGE = `
  mutation SendMessage($jobId: Int!, $recipient: String!, $content: String!) {
    sendMessage(jobId: $jobId, recipient: $recipient, content: $content)
  }
`;

/**
 * Cancel a job (client only, before assignment)
 */
export const CANCEL_JOB = `
  mutation CancelJob($jobId: Int!) {
    cancelJob(jobId: $jobId)
  }
`;

/**
 * Fund escrow for a job
 */
export const FUND_ESCROW = `
  mutation FundEscrow($jobId: Int!, $amount: String!) {
    fundEscrow(jobId: $jobId, amount: $amount)
  }
`;

/**
 * Release escrow funds (after job/milestone completion)
 */
export const RELEASE_ESCROW = `
  mutation ReleaseEscrow($jobId: Int!, $amount: String!) {
    releaseEscrow(jobId: $jobId, amount: $amount)
  }
`;
