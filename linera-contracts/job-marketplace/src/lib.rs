/*!
# Job Marketplace v2.0

A decentralized job marketplace on Linera with:
- Escrow payment system
- Competitive bidding with amounts
- Dispute resolution
- Agent verification
- Job categories/tags
- Milestone-based jobs
- Deadlines
- In-app messaging
*/

use async_graphql::{Enum, Request, Response, SimpleObject, InputObject};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, Amount, Timestamp},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

// ==================== APPLICATION STATE ====================

/// Application state
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct JobMarketplace {
    /// All jobs in the marketplace
    jobs: MapView<u64, Job>,
    /// Agent profiles
    agents: MapView<AccountOwner, AgentProfile>,
    /// Agent ratings/reviews
    ratings: MapView<u64, AgentRating>,
    /// Escrow balances (job_id -> locked amount)
    escrow: MapView<u64, EscrowInfo>,
    /// Disputes
    disputes: MapView<u64, Dispute>,
    /// Messages between users
    messages: MapView<u64, ChatMessage>,
    /// Next job ID
    next_job_id: RegisterView<u64>,
    /// Next rating ID
    next_rating_id: RegisterView<u64>,
    /// Next dispute ID
    next_dispute_id: RegisterView<u64>,
    /// Next message ID
    next_message_id: RegisterView<u64>,
}

impl JobMarketplace {
    pub fn jobs(&self) -> &MapView<u64, Job> {
        &self.jobs
    }

    pub fn jobs_mut(&mut self) -> &mut MapView<u64, Job> {
        &mut self.jobs
    }

    pub fn agents(&self) -> &MapView<AccountOwner, AgentProfile> {
        &self.agents
    }

    pub fn agents_mut(&mut self) -> &mut MapView<AccountOwner, AgentProfile> {
        &mut self.agents
    }

    pub fn ratings(&self) -> &MapView<u64, AgentRating> {
        &self.ratings
    }

    pub fn ratings_mut(&mut self) -> &mut MapView<u64, AgentRating> {
        &mut self.ratings
    }

    pub fn escrow(&self) -> &MapView<u64, EscrowInfo> {
        &self.escrow
    }

    pub fn escrow_mut(&mut self) -> &mut MapView<u64, EscrowInfo> {
        &mut self.escrow
    }

    pub fn disputes(&self) -> &MapView<u64, Dispute> {
        &self.disputes
    }

    pub fn disputes_mut(&mut self) -> &mut MapView<u64, Dispute> {
        &mut self.disputes
    }

    pub fn messages(&self) -> &MapView<u64, ChatMessage> {
        &self.messages
    }

    pub fn messages_mut(&mut self) -> &mut MapView<u64, ChatMessage> {
        &mut self.messages
    }

    pub fn next_job_id(&self) -> &RegisterView<u64> {
        &self.next_job_id
    }

    pub fn next_job_id_mut(&mut self) -> &mut RegisterView<u64> {
        &mut self.next_job_id
    }

    pub fn next_rating_id(&self) -> &RegisterView<u64> {
        &self.next_rating_id
    }

    pub fn next_rating_id_mut(&mut self) -> &mut RegisterView<u64> {
        &mut self.next_rating_id
    }

    pub fn next_dispute_id(&self) -> &RegisterView<u64> {
        &self.next_dispute_id
    }

    pub fn next_dispute_id_mut(&mut self) -> &mut RegisterView<u64> {
        &mut self.next_dispute_id
    }

    pub fn next_message_id(&self) -> &RegisterView<u64> {
        &self.next_message_id
    }

    pub fn next_message_id_mut(&mut self) -> &mut RegisterView<u64> {
        &mut self.next_message_id
    }
}

// ==================== ENUMS ====================

/// Job status
#[derive(Debug, Clone, Serialize, Deserialize, Enum, Copy, PartialEq, Eq)]
pub enum JobStatus {
    /// Job is open for bids
    Posted,
    /// Bid accepted, work in progress
    InProgress,
    /// Agent submitted work, awaiting client approval
    PendingApproval,
    /// Work approved, payment released
    Completed,
    /// Job was cancelled
    Cancelled,
    /// In dispute resolution
    Disputed,
}

/// Job category/tags
#[derive(Debug, Clone, Serialize, Deserialize, Enum, Copy, PartialEq, Eq, Hash)]
pub enum JobCategory {
    AIModel,
    DataAnalysis,
    ContentWriting,
    CodeDevelopment,
    ImageGeneration,
    VideoProduction,
    Research,
    Translation,
    CustomerService,
    Other,
}

/// Dispute status
#[derive(Debug, Clone, Serialize, Deserialize, Enum, Copy, PartialEq, Eq)]
pub enum DisputeStatus {
    /// Dispute is open
    Open,
    /// Under review
    UnderReview,
    /// Resolved in favor of client (refund)
    ResolvedForClient,
    /// Resolved in favor of agent (payment released)
    ResolvedForAgent,
    /// Split resolution (partial refund)
    ResolvedSplit,
}

/// Escrow status
#[derive(Debug, Clone, Serialize, Deserialize, Enum, Copy, PartialEq, Eq)]
pub enum EscrowStatus {
    /// Funds locked in escrow
    Locked,
    /// Funds released to agent
    Released,
    /// Funds refunded to client
    Refunded,
    /// Partial refund (dispute resolution)
    PartiallyRefunded,
}

/// Milestone status
#[derive(Debug, Clone, Serialize, Deserialize, Enum, Copy, PartialEq, Eq)]
pub enum MilestoneStatus {
    Pending,
    InProgress,
    Submitted,
    Approved,
    Rejected,
}

/// Agent verification level
#[derive(Debug, Clone, Serialize, Deserialize, Enum, Copy, PartialEq, Eq, Default)]
pub enum VerificationLevel {
    #[default]
    Unverified,
    EmailVerified,
    IdentityVerified,
    ProVerified,
}

// ==================== STRUCTS ====================

/// A job posting with enhanced features
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Job {
    pub id: u64,
    pub client: AccountOwner,
    pub description: String,
    pub payment: Amount,
    pub status: JobStatus,
    pub agent: Option<AccountOwner>,
    pub bids: Vec<Bid>,
    pub created_at: Timestamp,
    // New fields
    pub title: String,
    pub category: JobCategory,
    pub tags: Vec<String>,
    pub deadline: Option<Timestamp>,
    pub milestones: Vec<Milestone>,
    pub accepted_bid_amount: Option<Amount>,
    pub escrow_id: Option<u64>,
}

/// A bid on a job with amount
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Bid {
    pub agent: AccountOwner,
    pub bid_id: u64,
    pub timestamp: Timestamp,
    // New fields
    pub amount: Amount,
    pub proposal: String,
    pub estimated_days: u32,
}

/// Job milestone for phased delivery
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Milestone {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub payment_percentage: u8, // % of total payment
    pub status: MilestoneStatus,
    pub due_date: Option<Timestamp>,
}

/// Agent profile with verification
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct AgentProfile {
    pub owner: AccountOwner,
    pub name: String,
    pub service_description: String,
    pub jobs_completed: u64,
    pub total_rating_points: u64,
    pub total_ratings: u64,
    pub registered_at: Timestamp,
    // New fields
    pub verification_level: VerificationLevel,
    pub skills: Vec<String>,
    pub portfolio_urls: Vec<String>,
    pub hourly_rate: Option<Amount>,
    pub availability: bool,
    pub response_time_hours: u32,
    pub success_rate: u8, // Percentage 0-100
}

/// Agent rating/review
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct AgentRating {
    pub job_id: u64,
    pub rater: AccountOwner,
    pub rating: u8, // 1-5 stars
    pub review: String,
    pub timestamp: Timestamp,
}

/// Escrow information for a job
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct EscrowInfo {
    pub job_id: u64,
    pub client: AccountOwner,
    pub agent: Option<AccountOwner>,
    pub amount: Amount,
    pub status: EscrowStatus,
    pub locked_at: Timestamp,
    pub released_at: Option<Timestamp>,
}

/// Dispute for job resolution
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Dispute {
    pub id: u64,
    pub job_id: u64,
    pub initiator: AccountOwner,
    pub reason: String,
    pub status: DisputeStatus,
    pub created_at: Timestamp,
    pub resolved_at: Option<Timestamp>,
    pub resolution_notes: Option<String>,
    pub refund_percentage: Option<u8>, // For split resolutions
}

/// Chat message between client and agent
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct ChatMessage {
    pub id: u64,
    pub job_id: u64,
    pub sender: AccountOwner,
    pub recipient: AccountOwner,
    pub content: String,
    pub timestamp: Timestamp,
    pub read: bool,
}

// ==================== OPERATIONS ====================

/// Operations that can be performed
#[derive(Debug, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    // ===== Job Operations =====
    /// Post a new job with escrow
    PostJob {
        title: String,
        description: String,
        payment: Amount,
        category: JobCategory,
        tags: Vec<String>,
        deadline: Option<u64>, // Unix timestamp
        milestones: Vec<MilestoneInput>,
    },
    /// Cancel a posted job (only if no accepted bid)
    CancelJob {
        job_id: u64,
    },
    
    // ===== Bidding Operations =====
    /// Place a bid on a job with amount and proposal
    PlaceBid {
        job_id: u64,
        amount: Amount,
        proposal: String,
        estimated_days: u32,
    },
    /// Withdraw a bid
    WithdrawBid {
        job_id: u64,
    },
    /// Accept a bid (locks payment in escrow)
    AcceptBid {
        job_id: u64,
        agent: AccountOwner,
        bid_amount: Amount,
    },
    
    // ===== Work Delivery Operations =====
    /// Submit work for a milestone
    SubmitMilestone {
        job_id: u64,
        milestone_id: u64,
        delivery_notes: String,
    },
    /// Approve a milestone (releases proportional payment)
    ApproveMilestone {
        job_id: u64,
        milestone_id: u64,
    },
    /// Request revision for a milestone
    RequestRevision {
        job_id: u64,
        milestone_id: u64,
        feedback: String,
    },
    /// Complete entire job (releases remaining payment)
    CompleteJob {
        job_id: u64,
    },
    
    // ===== Agent Operations =====
    /// Register as an agent with enhanced profile
    RegisterAgent {
        name: String,
        service_description: String,
        skills: Vec<String>,
        hourly_rate: Option<Amount>,
    },
    /// Update agent profile
    UpdateAgentProfile {
        name: Option<String>,
        service_description: Option<String>,
        skills: Option<Vec<String>>,
        portfolio_urls: Option<Vec<String>>,
        hourly_rate: Option<Amount>,
        availability: Option<bool>,
    },
    /// Request verification upgrade
    RequestVerification {
        level: VerificationLevel,
        proof_data: String,
    },
    
    // ===== Rating Operations =====
    /// Rate an agent after job completion
    RateAgent {
        job_id: u64,
        rating: u8,
        review: String,
    },
    
    // ===== Dispute Operations =====
    /// Open a dispute
    OpenDispute {
        job_id: u64,
        reason: String,
    },
    /// Respond to a dispute
    RespondToDispute {
        dispute_id: u64,
        response: String,
    },
    /// Resolve dispute (admin/arbitrator only)
    ResolveDispute {
        dispute_id: u64,
        resolution: DisputeStatus,
        refund_percentage: Option<u8>,
        notes: String,
    },
    
    // ===== Messaging Operations =====
    /// Send a message
    SendMessage {
        job_id: u64,
        recipient: AccountOwner,
        content: String,
    },
    /// Mark messages as read
    MarkMessagesRead {
        message_ids: Vec<u64>,
    },
}

/// Input for milestone creation
#[derive(Debug, Clone, Serialize, Deserialize, InputObject)]
pub struct MilestoneInput {
    pub title: String,
    pub description: String,
    pub payment_percentage: u8,
    pub due_days: Option<u32>,
}

// ==================== MESSAGES ====================

/// Messages that can be sent between chains
#[derive(Debug, Serialize, Deserialize)]
pub enum Message {
    /// Notify job posted
    JobPosted {
        job_id: u64,
        title: String,
        payment: Amount,
        category: JobCategory,
    },
    /// Notify bid accepted
    BidAccepted {
        job_id: u64,
        agent: AccountOwner,
        amount: Amount,
    },
    /// Transfer payment from escrow
    ReleaseEscrow {
        job_id: u64,
        amount: Amount,
        recipient: AccountOwner,
    },
    /// Refund from escrow
    RefundEscrow {
        job_id: u64,
        amount: Amount,
        recipient: AccountOwner,
    },
    /// Notify dispute opened
    DisputeOpened {
        dispute_id: u64,
        job_id: u64,
    },
    /// Notify new message
    NewMessage {
        message_id: u64,
        job_id: u64,
        sender: AccountOwner,
    },
}

// ==================== ERRORS ====================

/// Application errors
#[derive(Debug, Error, Serialize, Deserialize)]
pub enum JobMarketplaceError {
    #[error("Job not found: {0}")]
    JobNotFound(u64),
    
    #[error("Not authorized")]
    NotAuthorized,
    
    #[error("Invalid job status")]
    InvalidStatus,
    
    #[error("Agent not registered")]
    AgentNotRegistered,
    
    #[error("Insufficient funds")]
    InsufficientFunds,
    
    #[error("Invalid rating: must be 1-5")]
    InvalidRating,
    
    #[error("Already rated this job")]
    AlreadyRated,
    
    #[error("Agent already registered")]
    AgentAlreadyRegistered,
    
    #[error("Bid not found")]
    BidNotFound,
    
    #[error("Already bid on this job")]
    AlreadyBid,
    
    #[error("Cannot bid on own job")]
    CannotBidOwnJob,
    
    #[error("Escrow not found")]
    EscrowNotFound,
    
    #[error("Dispute not found")]
    DisputeNotFound,
    
    #[error("Dispute already open")]
    DisputeAlreadyOpen,
    
    #[error("Milestone not found")]
    MilestoneNotFound,
    
    #[error("Invalid milestone percentages")]
    InvalidMilestonePercentages,
    
    #[error("Job deadline passed")]
    DeadlinePassed,
    
    #[error("Message not found")]
    MessageNotFound,
    
    #[error("Invalid amount")]
    InvalidAmount,
}

// ==================== ABI ====================

/// Application ABI
pub struct JobMarketplaceAbi;

impl linera_sdk::abi::ContractAbi for JobMarketplaceAbi {
    type Operation = Operation;
    type Response = Result<(), JobMarketplaceError>;
}

impl linera_sdk::abi::ServiceAbi for JobMarketplaceAbi {
    type Query = Request;
    type QueryResponse = Response;
}
