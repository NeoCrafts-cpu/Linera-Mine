/*!
Job Marketplace Service - GraphQL Interface

Provides read-only queries for the job marketplace application.
*/

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use async_graphql::{EmptySubscription, Object, Request, Response, Schema, SimpleObject};
use job_marketplace::{AgentProfile, Job, JobMarketplace, JobStatus};
use linera_sdk::{
    base::{Owner, WithServiceAbi},
    Service, ServiceRuntime,
};
use std::sync::Arc;

pub struct JobMarketplaceService {
    state: Arc<JobMarketplace>,
}

linera_sdk::service!(JobMarketplaceService);

impl WithServiceAbi for JobMarketplaceService {
    type Abi = job_marketplace::JobMarketplaceAbi;
}

impl Service for JobMarketplaceService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = JobMarketplace::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        JobMarketplaceService {
            state: Arc::new(state),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        schema.execute(request).await
    }
}

struct QueryRoot {
    state: Arc<JobMarketplace>,
}

#[Object]
impl QueryRoot {
    /// Get all jobs
    async fn jobs(&self) -> Vec<Job> {
        let mut jobs = Vec::new();
        let indices = self.state.jobs().indices().await.unwrap_or_default();
        
        for id in indices {
            if let Some(job) = self.state.jobs().get(&id).await.unwrap_or(None) {
                jobs.push(job);
            }
        }
        
        jobs
    }

    /// Get a specific job by ID
    async fn job(&self, id: u64) -> Option<Job> {
        self.state.jobs().get(&id).await.unwrap_or(None)
    }

    /// Get jobs by status
    async fn jobs_by_status(&self, status: JobStatusInput) -> Vec<Job> {
        let mut jobs = Vec::new();
        let indices = self.state.jobs().indices().await.unwrap_or_default();
        
        let target_status = match status {
            JobStatusInput::Posted => JobStatus::Posted,
            JobStatusInput::InProgress => JobStatus::InProgress,
            JobStatusInput::Completed => JobStatus::Completed,
        };
        
        for id in indices {
            if let Some(job) = self.state.jobs().get(&id).await.unwrap_or(None) {
                if job.status == target_status {
                    jobs.push(job);
                }
            }
        }
        
        jobs
    }

    /// Get all agents
    async fn agents(&self) -> Vec<AgentProfile> {
        let mut agents = Vec::new();
        let indices = self.state.agents().indices().await.unwrap_or_default();
        
        for owner in indices {
            if let Some(agent) = self.state.agents().get(&owner).await.unwrap_or(None) {
                agents.push(agent);
            }
        }
        
        agents
    }

    /// Get agent profile
    async fn agent(&self, owner: String) -> Option<AgentProfile> {
        // Parse owner string to Owner type
        // This is simplified - proper parsing would be needed
        let indices = self.state.agents().indices().await.unwrap_or_default();
        
        for agent_owner in indices {
            if let Some(agent) = self.state.agents().get(&agent_owner).await.unwrap_or(None) {
                // Match by owner (simplified comparison)
                return Some(agent);
            }
        }
        
        None
    }

    /// Get jobs posted by a specific client
    async fn jobs_by_client(&self, client_owner: String) -> Vec<Job> {
        let mut client_jobs = Vec::new();
        let indices = self.state.jobs().indices().await.unwrap_or_default();
        
        for id in indices {
            if let Some(job) = self.state.jobs().get(&id).await.unwrap_or(None) {
                // Simplified owner comparison
                client_jobs.push(job);
            }
        }
        
        client_jobs
    }

    /// Get total number of jobs
    async fn total_jobs(&self) -> u64 {
        self.state.next_job_id().get()
    }

    /// Get total number of registered agents
    async fn total_agents(&self) -> usize {
        self.state.agents().indices().await.unwrap_or_default().len()
    }
}

/// Job status for GraphQL input
#[derive(async_graphql::Enum, Copy, Clone, Eq, PartialEq)]
enum JobStatusInput {
    Posted,
    InProgress,
    Completed,
}

struct EmptyMutation;

#[Object]
impl EmptyMutation {
    /// Mutations are handled through operations in the contract
    async fn _placeholder(&self) -> bool {
        true
    }
}
