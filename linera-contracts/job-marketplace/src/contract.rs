/*!
Job Marketplace Contract - Business Logic

Handles operations and messages for the job marketplace application.
*/

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_trait::async_trait;
use job_marketplace::{Job, JobMarketplace, JobMarketplaceError, JobStatus, Message, Operation, AgentProfile, AgentRating, Bid};
use linera_sdk::{
    linera_base_types::{Amount, AccountOwner},
    Contract, ContractRuntime, views::{RootView, View},
};

pub struct JobMarketplaceContract {
    state: JobMarketplace,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(JobMarketplaceContract);

impl linera_sdk::linera_base_types::WithContractAbi for JobMarketplaceContract {
    type Abi = job_marketplace::JobMarketplaceAbi;
}

impl Contract for JobMarketplaceContract {
    type Message = Message;
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = JobMarketplace::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        JobMarketplaceContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {
        // Initialize with job ID and rating ID starting at 1
        self.state.next_job_id_mut().set(1);
        self.state.next_rating_id_mut().set(1);
    }

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response {
        match operation {
            Operation::PostJob { description, payment } => {
                self.post_job(description, payment).await
            }
            Operation::PlaceBid { job_id } => {
                self.place_bid(job_id).await
            }
            Operation::AcceptBid { job_id, agent } => {
                self.accept_bid(job_id, agent).await
            }
            Operation::CompleteJob { job_id } => {
                self.complete_job(job_id).await
            }
            Operation::RegisterAgent { name, service_description } => {
                self.register_agent(name, service_description).await
            }
            Operation::RateAgent { job_id, rating, review } => {
                self.rate_agent(job_id, rating, review).await
            }
            Operation::UpdateAgentProfile { name, service_description } => {
                self.update_agent_profile(name, service_description).await
            }
        }
    }

    async fn execute_message(&mut self, message: Message) {
        match message {
            Message::JobPosted { job_id, description, payment } => {
                // Handle job posted notification
                // log: Received job notification
            }
            Message::BidAccepted { job_id, agent } => {
                // Handle bid accepted notification
                // log: Bid accepted for job
            }
            Message::TransferPayment { amount, recipient } => {
                // TODO: Handle payment transfer properly
                // self.runtime.transfer(source, destination, amount);
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl JobMarketplaceContract {
    /// Post a new job
    async fn post_job(&mut self, description: String, payment: Amount) -> Result<(), JobMarketplaceError> {
        let caller = self.runtime
            .authenticated_signer()
            .ok_or(JobMarketplaceError::NotAuthorized)?;

        // Get next job ID
        let job_id = *self.state.next_job_id().get();
        self.state.next_job_id_mut().set(job_id + 1);

        // Create job
        let job = Job {
            id: job_id,
            client: caller,
            description: description.clone(),
            payment,
            status: JobStatus::Posted,
            agent: None,
            bids: vec![],
            created_at: self.runtime.system_time(),
        };

        // Store job
        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to insert job");

        // Optionally send cross-chain message to notify other chains
        // self.runtime.send_message(...);

        Ok(())
    }

    /// Place a bid on a job
    async fn place_bid(&mut self, job_id: u64) -> Result<(), JobMarketplaceError> {
        let caller = self.runtime
            .authenticated_signer()
            .ok_or(JobMarketplaceError::NotAuthorized)?;

        // Check if agent is registered
        if !self.state.agents().indices().await.expect("Failed to get agents").contains(&caller) {
            return Err(JobMarketplaceError::AgentNotRegistered);
        }

        // Get job
        let mut job = self.state
            .jobs()
            .get(&job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(job_id))?;

        // Check if job is in Posted status
        if job.status != JobStatus::Posted {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        // Add bid
        let bid = Bid {
            agent: caller,
            bid_id: job.bids.len() as u64,
            timestamp: self.runtime.system_time(),
        };
        job.bids.push(bid);

        // Update job
        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to update job");

        Ok(())
    }

    /// Accept a bid (client only)
    async fn accept_bid(&mut self, job_id: u64, agent: AccountOwner) -> Result<(), JobMarketplaceError> {
        let caller = self.runtime
            .authenticated_signer()
            .ok_or(JobMarketplaceError::NotAuthorized)?;

        // Get job
        let mut job = self.state
            .jobs()
            .get(&job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(job_id))?;

        // Check if caller is the client
        if job.client != caller {
            return Err(JobMarketplaceError::NotAuthorized);
        }

        // Check if job is in Posted status
        if job.status != JobStatus::Posted {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        // Update job
        job.status = JobStatus::InProgress;
        job.agent = Some(agent);

        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to update job");

        // Send message to agent's chain
        // self.runtime.send_message(...);

        Ok(())
    }

    /// Complete a job (agent only)
    async fn complete_job(&mut self, job_id: u64) -> Result<(), JobMarketplaceError> {
        let caller = self.runtime
            .authenticated_signer()
            .ok_or(JobMarketplaceError::NotAuthorized)?;

        // Get job
        let mut job = self.state
            .jobs()
            .get(&job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(job_id))?;

        // Check if caller is the assigned agent
        if job.agent != Some(caller) {
            return Err(JobMarketplaceError::NotAuthorized);
        }

        // Check if job is in InProgress status
        if job.status != JobStatus::InProgress {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        // Update job
        job.status = JobStatus::Completed;

        self.state
            .jobs_mut()
            .insert(&job_id, job.clone())
            .expect("Failed to update job");

        // TODO: Transfer payment to agent
        // self.runtime.transfer(source, destination, job.payment);

        // Update agent stats
        let mut agent_profile = self.state
            .agents_mut()
            .get(&caller)
            .await
            .expect("Failed to get agent")
            .ok_or(JobMarketplaceError::AgentNotRegistered)?;

        agent_profile.jobs_completed += 1;
        self.state
            .agents_mut()
            .insert(&caller, agent_profile)
            .expect("Failed to update agent");

        Ok(())
    }

    /// Register as an agent
    async fn register_agent(&mut self, name: String, service_description: String) -> Result<(), JobMarketplaceError> {
        let caller = self.runtime
            .authenticated_signer()
            .ok_or(JobMarketplaceError::NotAuthorized)?;

        // Check if agent already registered
        if self.state.agents().indices().await.expect("Failed to get agents").contains(&caller) {
            return Err(JobMarketplaceError::AgentAlreadyRegistered);
        }

        let profile = AgentProfile {
            owner: caller,
            name,
            service_description,
            jobs_completed: 0,
            total_rating_points: 0,
            total_ratings: 0,
            registered_at: self.runtime.system_time(),
        };

        self.state
            .agents_mut()
            .insert(&caller, profile)
            .expect("Failed to register agent");

        Ok(())
    }

    /// Rate an agent after job completion
    async fn rate_agent(&mut self, job_id: u64, rating: u8, review: String) -> Result<(), JobMarketplaceError> {
        // Validate rating is 1-5
        if rating < 1 || rating > 5 {
            return Err(JobMarketplaceError::InvalidRating);
        }

        let caller = self.runtime
            .authenticated_signer()
            .ok_or(JobMarketplaceError::NotAuthorized)?;

        // Get job
        let job = self.state
            .jobs()
            .get(&job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(job_id))?;

        // Check if job is completed
        if job.status != JobStatus::Completed {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        // Check if caller is the client
        if job.client != caller {
            return Err(JobMarketplaceError::NotAuthorized);
        }

        // Get the agent
        let agent_owner = job.agent.ok_or(JobMarketplaceError::AgentNotRegistered)?;

        // Create rating
        let rating_id = *self.state.next_rating_id().get();
        self.state.next_rating_id_mut().set(rating_id + 1);

        let agent_rating = AgentRating {
            job_id,
            rater: caller,
            rating,
            review,
            timestamp: self.runtime.system_time(),
        };

        self.state
            .ratings_mut()
            .insert(&rating_id, agent_rating)
            .expect("Failed to insert rating");

        // Update agent's rating stats
        let mut agent_profile = self.state
            .agents()
            .get(&agent_owner)
            .await
            .expect("Failed to get agent")
            .ok_or(JobMarketplaceError::AgentNotRegistered)?;

        agent_profile.total_rating_points += rating as u64;
        agent_profile.total_ratings += 1;

        self.state
            .agents_mut()
            .insert(&agent_owner, agent_profile)
            .expect("Failed to update agent");

        Ok(())
    }

    /// Update agent profile
    async fn update_agent_profile(&mut self, name: Option<String>, service_description: Option<String>) -> Result<(), JobMarketplaceError> {
        let caller = self.runtime
            .authenticated_signer()
            .ok_or(JobMarketplaceError::NotAuthorized)?;

        let mut profile = self.state
            .agents()
            .get(&caller)
            .await
            .expect("Failed to get agent")
            .ok_or(JobMarketplaceError::AgentNotRegistered)?;

        if let Some(n) = name {
            profile.name = n;
        }
        if let Some(desc) = service_description {
            profile.service_description = desc;
        }

        self.state
            .agents_mut()
            .insert(&caller, profile)
            .expect("Failed to update agent");

        Ok(())
    }
}
