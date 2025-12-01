/*!
# Job Marketplace

A decentralized job marketplace on Linera where users can:
- Post jobs with payment
- Agents can bid on jobs
- Accept bids and complete jobs
- Rate agents after completion
*/

use async_graphql::{Enum, Request, Response, SimpleObject};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, Amount, Timestamp},
    views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext},
};
use serde::{Deserialize, Serialize};
use thiserror::Error;

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
    /// Next job ID
    next_job_id: RegisterView<u64>,
    /// Next rating ID
    next_rating_id: RegisterView<u64>,
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
}

/// Job status
#[derive(Debug, Clone, Serialize, Deserialize, Enum, Copy, PartialEq, Eq)]
pub enum JobStatus {
    Posted,
    InProgress,
    Completed,
}

/// A job posting
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
}

/// A bid on a job
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct Bid {
    pub agent: AccountOwner,
    pub bid_id: u64,
    pub timestamp: Timestamp,
}

/// Agent profile with reputation
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct AgentProfile {
    pub owner: AccountOwner,
    pub name: String,
    pub service_description: String,
    pub jobs_completed: u64,
    pub total_rating_points: u64,
    pub total_ratings: u64,
    pub registered_at: Timestamp,
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

/// Operations that can be performed
#[derive(Debug, Serialize, Deserialize, GraphQLMutationRoot)]
pub enum Operation {
    /// Post a new job
    PostJob {
        description: String,
        payment: Amount,
    },
    /// Place a bid on a job
    PlaceBid {
        job_id: u64,
    },
    /// Accept a bid (job owner only)
    AcceptBid {
        job_id: u64,
        agent: AccountOwner,
    },
    /// Complete a job (agent only)
    CompleteJob {
        job_id: u64,
    },
    /// Register as an agent
    RegisterAgent {
        name: String,
        service_description: String,
    },
    /// Rate an agent after job completion (client only)
    RateAgent {
        job_id: u64,
        rating: u8,
        review: String,
    },
    /// Update agent profile
    UpdateAgentProfile {
        name: Option<String>,
        service_description: Option<String>,
    },
}

/// Messages that can be sent between chains
#[derive(Debug, Serialize, Deserialize)]
pub enum Message {
    /// Notify job posted
    JobPosted {
        job_id: u64,
        description: String,
        payment: Amount,
    },
    /// Notify bid accepted
    BidAccepted {
        job_id: u64,
        agent: AccountOwner,
    },
    /// Transfer payment
    TransferPayment {
        amount: Amount,
        recipient: AccountOwner,
    },
}

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
}

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
