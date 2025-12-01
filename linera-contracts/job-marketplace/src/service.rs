/*!
Job Marketplace Service - GraphQL Interface with Queries and Mutations

This service exposes the job marketplace state via GraphQL queries
and schedules operations via GraphQL mutations using the Linera SDK's
GraphQLMutationRoot derive macro.
*/

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;
use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{
    graphql::GraphQLMutationRoot as _,
    linera_base_types::WithServiceAbi,
    views::View,
    Service, ServiceRuntime,
};
use job_marketplace::{Job, AgentProfile, JobMarketplace, Operation};

pub struct JobMarketplaceService {
    state: Arc<JobMarketplace>,
    runtime: Arc<ServiceRuntime<Self>>,
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
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot { state: self.state.clone() }, 
            Operation::mutation_root(self.runtime.clone()), 
            EmptySubscription
        ).finish();
        schema.execute(request).await
    }
}

/// GraphQL Query Root - Read state from the blockchain
struct QueryRoot {
    state: Arc<JobMarketplace>,
}

#[Object]
impl QueryRoot {
    /// Get service status
    async fn hello(&self) -> String {
        "Job Marketplace Service - Linera Blockchain".to_string()
    }

    /// Get all jobs in the marketplace
    async fn jobs(&self) -> Vec<Job> {
        let mut jobs = Vec::new();
        
        // Get the next_job_id to know how many jobs exist
        let next_id = *self.state.next_job_id().get();
        
        // Iterate through all job IDs
        for id in 0..next_id {
            if let Ok(Some(job)) = self.state.jobs().get(&id).await {
                jobs.push(job.clone());
            }
        }
        
        jobs
    }

    /// Get a specific job by ID
    async fn job(&self, id: u64) -> Option<Job> {
        match self.state.jobs().get(&id).await {
            Ok(Some(job)) => Some(job.clone()),
            _ => None,
        }
    }

    /// Get all registered agents
    async fn agents(&self) -> Vec<AgentProfile> {
        let mut owners = Vec::new();
        
        // Collect all agent keys
        let _ = self.state.agents().for_each_index(|owner| {
            owners.push(owner.clone());
            Ok(())
        }).await;
        
        let mut profiles = Vec::new();
        for owner in owners {
            if let Ok(Some(profile)) = self.state.agents().get(&owner).await {
                profiles.push(profile.clone());
            }
        }
        
        profiles
    }
}
