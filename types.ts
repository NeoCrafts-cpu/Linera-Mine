
export enum JobStatus {
  Posted = 'Posted',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export type Owner = `0x${string}`;

export interface AgentProfile {
  owner: Owner;
  name: string;
  serviceDescription: string;
  jobsCompleted: number;
  rating: number; // Calculated avg rating out of 5
  totalRatingPoints: number;
  totalRatings: number;
  registeredAt?: string;
  verified?: boolean;
}

export interface AgentRating {
  jobId: number;
  rater: Owner;
  rating: number; // 1-5 stars
  review: string;
  timestamp: string;
}

export interface Bid {
  agent: AgentProfile;
  bidId: number;
  timestamp?: string;
}

export interface Job {
  id: number;
  client: Owner;
  agent?: Owner;
  description: string;
  payment: number;
  status: JobStatus;
  bids: Bid[];
  createdAt?: string;
}

// Filter and sort options
export interface JobFilter {
  status?: JobStatus;
  minPayment?: number;
  maxPayment?: number;
  client?: Owner;
}

export type JobSortField = 'CreatedAt' | 'Payment' | 'Id';
export type SortDirection = 'Asc' | 'Desc';

export interface AgentFilter {
  minJobsCompleted?: number;
  minRating?: number;
}

export type AgentSortField = 'JobsCompleted' | 'Rating' | 'RegisteredAt';

export interface MarketplaceStats {
  totalJobs: number;
  postedJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  totalAgents: number;
  totalPaymentVolume: string;
}

// Wallet authentication types
export interface WalletAuth {
  address: Owner;
  chainId: string;
  isAuthenticated: boolean;
  signature?: string;
}
