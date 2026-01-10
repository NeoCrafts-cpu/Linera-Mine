/**
 * Job Marketplace v2.0 - TypeScript Types
 * 
 * Enhanced types matching the Rust smart contract with:
 * - Escrow payment system
 * - Dispute resolution
 * - Competitive bidding with amounts
 * - Job categories and tags
 * - Agent verification
 * - Milestones
 * - In-app messaging
 */

// ==================== ENUMS ====================

export enum JobStatus {
  Posted = 'POSTED',
  InProgress = 'IN_PROGRESS',
  PendingApproval = 'PENDING_APPROVAL',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
  Disputed = 'DISPUTED'
}

export enum JobCategory {
  AIModel = 'AI_MODEL',
  DataAnalysis = 'DATA_ANALYSIS',
  ContentWriting = 'CONTENT_WRITING',
  CodeDevelopment = 'CODE_DEVELOPMENT',
  ImageGeneration = 'IMAGE_GENERATION',
  VideoProduction = 'VIDEO_PRODUCTION',
  Research = 'RESEARCH',
  Translation = 'TRANSLATION',
  CustomerService = 'CUSTOMER_SERVICE',
  Other = 'OTHER'
}

export enum DisputeStatus {
  Open = 'OPEN',
  UnderReview = 'UNDER_REVIEW',
  ResolvedForClient = 'RESOLVED_FOR_CLIENT',
  ResolvedForAgent = 'RESOLVED_FOR_AGENT',
  ResolvedSplit = 'RESOLVED_SPLIT'
}

export enum EscrowStatus {
  Locked = 'LOCKED',
  Released = 'RELEASED',
  Refunded = 'REFUNDED',
  PartiallyRefunded = 'PARTIALLY_REFUNDED'
}

export enum MilestoneStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Submitted = 'SUBMITTED',
  Approved = 'APPROVED',
  Rejected = 'REJECTED'
}

export enum VerificationLevel {
  Unverified = 'UNVERIFIED',
  EmailVerified = 'EMAIL_VERIFIED',
  IdentityVerified = 'IDENTITY_VERIFIED',
  ProVerified = 'PRO_VERIFIED'
}

// ==================== BASIC TYPES ====================

export type Owner = `0x${string}`;

export type Amount = string | number; // Flexible for GraphQL responses

// ==================== MILESTONE ====================

export interface Milestone {
  id: number;
  title: string;
  description: string;
  paymentPercentage: number; // 0-100
  status: MilestoneStatus;
  dueDate?: string;
}

export interface MilestoneInput {
  title: string;
  description: string;
  paymentPercentage: number;
  dueDays?: number;
}

// ==================== BID ====================

export interface Bid {
  agent: AgentProfile | Owner;
  bidId: number;
  timestamp?: string;
  // New fields
  amount: Amount;
  proposal: string;
  estimatedDays: number;
}

// ==================== JOB ====================

export interface Job {
  id: number;
  client: Owner;
  agent?: Owner;
  description: string;
  payment: Amount;
  status: JobStatus;
  bids: Bid[];
  createdAt?: string;
  // New fields (optional since they may not be present in older data)
  title?: string;
  category?: JobCategory | string;
  tags?: string[];
  deadline?: string;
  milestones?: Milestone[];
  acceptedBidAmount?: Amount;
  escrowId?: number;
}

// ==================== AGENT PROFILE ====================

export interface AgentProfile {
  owner: Owner;
  name: string;
  serviceDescription: string;
  jobsCompleted: number;
  rating: number; // Calculated avg rating out of 5
  totalRatingPoints: number;
  totalRatings: number;
  registeredAt?: string;
  // New fields (optional since they may not be present in older data)
  verificationLevel?: VerificationLevel;
  skills?: string[];
  portfolioUrls?: string[];
  hourlyRate?: Amount;
  availability?: boolean;
  responseTimeHours?: number;
  successRate?: number; // 0-100
}

export interface AgentRating {
  jobId: number;
  rater: Owner;
  rating: number; // 1-5 stars
  review: string;
  timestamp: string;
}

// ==================== ESCROW ====================

export interface EscrowInfo {
  jobId: number;
  client: Owner;
  agent?: Owner;
  amount: Amount;
  status: EscrowStatus;
  lockedAt: string;
  releasedAt?: string;
}

// ==================== DISPUTE ====================

export interface Dispute {
  id: number;
  jobId: number;
  initiator: Owner;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  refundPercentage?: number;
}

// ==================== MESSAGING ====================

export interface ChatMessage {
  id: number;
  jobId: number;
  sender: Owner;
  recipient: Owner;
  content: string;
  timestamp: string;
  read: boolean;
}

// ==================== FILTER & SORT ====================

export interface JobFilter {
  status?: JobStatus;
  category?: JobCategory;
  tags?: string[];
  minPayment?: number;
  maxPayment?: number;
  client?: Owner;
  search?: string;
  hasMilestones?: boolean;
}

export type JobSortField = 'CreatedAt' | 'Payment' | 'Id' | 'Deadline' | 'BidCount';
export type SortDirection = 'Asc' | 'Desc';

export interface AgentFilter {
  minJobsCompleted?: number;
  minRating?: number;
  verificationLevel?: VerificationLevel;
  skills?: string[];
  available?: boolean;
}

export type AgentSortField = 'JobsCompleted' | 'Rating' | 'RegisteredAt' | 'SuccessRate';

export interface DisputeFilter {
  status?: DisputeStatus;
  jobId?: number;
}

// ==================== STATISTICS ====================

export interface MarketplaceStats {
  totalJobs: number;
  postedJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  disputedJobs: number;
  totalAgents: number;
  verifiedAgents: number;
  totalPaymentVolume: string;
  totalBids: number;
  openDisputes: number;
  avgBidsPerJob: number;
}

export interface CategoryStats {
  category: JobCategory;
  count: number;
}

// ==================== WALLET AUTH ====================

export interface WalletAuth {
  address: Owner;
  chainId: string;
  isAuthenticated: boolean;
  signature?: string;
}

// ==================== NOTIFICATIONS ====================

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  jobId?: number;
  disputeId?: number;
}

export enum NotificationType {
  JobPosted = 'JOB_POSTED',
  BidReceived = 'BID_RECEIVED',
  BidAccepted = 'BID_ACCEPTED',
  WorkSubmitted = 'WORK_SUBMITTED',
  MilestoneApproved = 'MILESTONE_APPROVED',
  JobCompleted = 'JOB_COMPLETED',
  DisputeOpened = 'DISPUTE_OPENED',
  DisputeResolved = 'DISPUTE_RESOLVED',
  NewMessage = 'NEW_MESSAGE',
  PaymentReleased = 'PAYMENT_RELEASED'
}

// ==================== OPERATION INPUTS ====================

export interface PostJobInput {
  title: string;
  description: string;
  payment: Amount;
  category: JobCategory;
  tags: string[];
  deadline?: number; // Unix timestamp
  milestones: MilestoneInput[];
}

export interface PlaceBidInput {
  jobId: number;
  amount: Amount;
  proposal: string;
  estimatedDays: number;
}

export interface RegisterAgentInput {
  name: string;
  serviceDescription: string;
  skills: string[];
  hourlyRate?: Amount;
}

export interface UpdateAgentInput {
  name?: string;
  serviceDescription?: string;
  skills?: string[];
  portfolioUrls?: string[];
  hourlyRate?: Amount;
  availability?: boolean;
}

export interface OpenDisputeInput {
  jobId: number;
  reason: string;
}

export interface ResolveDisputeInput {
  disputeId: number;
  resolution: DisputeStatus;
  refundPercentage?: number;
  notes: string;
}

export interface SendMessageInput {
  jobId: number;
  recipient: Owner;
  content: string;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
