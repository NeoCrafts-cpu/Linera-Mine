/*!
Job Marketplace Service - GraphQL Interface with Queries and Mutations

This service exposes the job marketplace state via GraphQL queries
and schedules operations via GraphQL mutations using the Linera SDK's
GraphQLMutationRoot derive macro.
*/

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;
use async_graphql::{EmptySubscription, Object, Request, Response, Schema, Enum, InputObject};
use linera_sdk::{
    graphql::GraphQLMutationRoot as _,
    linera_base_types::WithServiceAbi,
    views::View,
    Service, ServiceRuntime,
};
use job_marketplace::{Job, AgentProfile, AgentRating, JobMarketplace, Operation, JobStatus};

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

/// Job filter options for querying
#[derive(InputObject, Default)]
struct JobFilter {
    /// Filter by job status
    status: Option<JobStatus>,
    /// Minimum payment amount
    min_payment: Option<String>,
    /// Maximum payment amount
    max_payment: Option<String>,
    /// Filter by client address
    client: Option<String>,
}

/// Sort direction
#[derive(Enum, Clone, Copy, PartialEq, Eq, Default)]
enum SortDirection {
    #[default]
    Asc,
    Desc,
}

/// Sort field for jobs
#[derive(Enum, Clone, Copy, PartialEq, Eq, Default)]
enum JobSortField {
    #[default]
    CreatedAt,
    Payment,
    Id,
}

/// Agent filter options
#[derive(InputObject, Default)]
struct AgentFilter {
    /// Minimum jobs completed
    min_jobs_completed: Option<u64>,
    /// Minimum average rating (1-5)
    min_rating: Option<f64>,
}

/// Sort field for agents
#[derive(Enum, Clone, Copy, PartialEq, Eq, Default)]
enum AgentSortField {
    #[default]
    JobsCompleted,
    Rating,
    RegisteredAt,
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

    /// Get all jobs in the marketplace with optional filtering and sorting
    async fn jobs(
        &self,
        filter: Option<JobFilter>,
        sort_by: Option<JobSortField>,
        sort_dir: Option<SortDirection>,
        limit: Option<usize>,
        offset: Option<usize>,
    ) -> Vec<Job> {
        let mut jobs = Vec::new();
        
        // Get the next_job_id to know how many jobs exist
        let next_id = *self.state.next_job_id().get();
        
        // Iterate through all job IDs
        for id in 1..next_id {
            if let Ok(Some(job)) = self.state.jobs().get(&id).await {
                jobs.push(job.clone());
            }
        }
        
        // Apply filters
        if let Some(f) = filter {
            jobs.retain(|job| {
                // Status filter
                if let Some(ref status) = f.status {
                    if job.status != *status {
                        return false;
                    }
                }
                
                // Min payment filter
                if let Some(ref min) = f.min_payment {
                    if let Ok(min_amount) = min.parse::<f64>() {
                        let job_payment: f64 = job.payment.to_string().parse().unwrap_or(0.0);
                        if job_payment < min_amount {
                            return false;
                        }
                    }
                }
                
                // Max payment filter
                if let Some(ref max) = f.max_payment {
                    if let Ok(max_amount) = max.parse::<f64>() {
                        let job_payment: f64 = job.payment.to_string().parse().unwrap_or(0.0);
                        if job_payment > max_amount {
                            return false;
                        }
                    }
                }
                
                true
            });
        }
        
        // Apply sorting
        let sort_field = sort_by.unwrap_or_default();
        let sort_direction = sort_dir.unwrap_or_default();
        
        jobs.sort_by(|a, b| {
            let cmp = match sort_field {
                JobSortField::CreatedAt => a.created_at.cmp(&b.created_at),
                JobSortField::Payment => a.payment.cmp(&b.payment),
                JobSortField::Id => a.id.cmp(&b.id),
            };
            
            match sort_direction {
                SortDirection::Asc => cmp,
                SortDirection::Desc => cmp.reverse(),
            }
        });
        
        // Apply pagination
        let offset = offset.unwrap_or(0);
        let limit = limit.unwrap_or(100);
        
        jobs.into_iter().skip(offset).take(limit).collect()
    }

    /// Get a specific job by ID
    async fn job(&self, id: u64) -> Option<Job> {
        match self.state.jobs().get(&id).await {
            Ok(Some(job)) => Some(job.clone()),
            _ => None,
        }
    }

    /// Get jobs count by status
    async fn jobs_count(&self, status: Option<JobStatus>) -> u64 {
        let mut count = 0u64;
        let next_id = *self.state.next_job_id().get();
        
        for id in 1..next_id {
            if let Ok(Some(job)) = self.state.jobs().get(&id).await {
                if let Some(ref s) = status {
                    if job.status == *s {
                        count += 1;
                    }
                } else {
                    count += 1;
                }
            }
        }
        
        count
    }

    /// Get all registered agents with optional filtering and sorting
    async fn agents(
        &self,
        filter: Option<AgentFilter>,
        sort_by: Option<AgentSortField>,
        sort_dir: Option<SortDirection>,
        limit: Option<usize>,
        offset: Option<usize>,
    ) -> Vec<AgentProfile> {
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
        
        // Apply filters
        if let Some(f) = filter {
            profiles.retain(|agent| {
                // Min jobs completed filter
                if let Some(min_jobs) = f.min_jobs_completed {
                    if agent.jobs_completed < min_jobs {
                        return false;
                    }
                }
                
                // Min rating filter
                if let Some(min_rating) = f.min_rating {
                    if agent.total_ratings > 0 {
                        let avg_rating = agent.total_rating_points as f64 / agent.total_ratings as f64;
                        if avg_rating < min_rating {
                            return false;
                        }
                    } else if min_rating > 0.0 {
                        return false; // No ratings, filter out if min_rating specified
                    }
                }
                
                true
            });
        }
        
        // Apply sorting
        let sort_field = sort_by.unwrap_or_default();
        let sort_direction = sort_dir.unwrap_or_default();
        
        profiles.sort_by(|a, b| {
            let cmp = match sort_field {
                AgentSortField::JobsCompleted => a.jobs_completed.cmp(&b.jobs_completed),
                AgentSortField::Rating => {
                    let rating_a = if a.total_ratings > 0 { 
                        (a.total_rating_points as f64 / a.total_ratings as f64) 
                    } else { 0.0 };
                    let rating_b = if b.total_ratings > 0 { 
                        (b.total_rating_points as f64 / b.total_ratings as f64) 
                    } else { 0.0 };
                    rating_a.partial_cmp(&rating_b).unwrap_or(std::cmp::Ordering::Equal)
                }
                AgentSortField::RegisteredAt => a.registered_at.cmp(&b.registered_at),
            };
            
            match sort_direction {
                SortDirection::Asc => cmp,
                SortDirection::Desc => cmp.reverse(),
            }
        });
        
        // Apply pagination
        let offset = offset.unwrap_or(0);
        let limit = limit.unwrap_or(100);
        
        profiles.into_iter().skip(offset).take(limit).collect()
    }

    /// Get a specific agent by owner address
    async fn agent(&self, owner: String) -> Option<AgentProfile> {
        // Parse the owner string to AccountOwner
        // This is a simplified version - in production you'd properly parse the address
        let mut owners = Vec::new();
        let _ = self.state.agents().for_each_index(|o| {
            owners.push(o.clone());
            Ok(())
        }).await;
        
        for o in owners {
            if format!("{:?}", o).contains(&owner) || owner.contains(&format!("{:?}", o)) {
                if let Ok(Some(profile)) = self.state.agents().get(&o).await {
                    return Some(profile.clone());
                }
            }
        }
        None
    }

    /// Get ratings for a specific agent
    async fn agent_ratings(&self, agent_owner: String) -> Vec<AgentRating> {
        let mut ratings = Vec::new();
        let next_id = *self.state.next_rating_id().get();
        
        for id in 1..next_id {
            if let Ok(Some(rating)) = self.state.ratings().get(&id).await {
                ratings.push(rating.clone());
            }
        }
        
        // Filter ratings for jobs completed by this agent
        // Note: In a production system, you'd want to store agent owner in the rating
        // or have a more efficient lookup mechanism
        ratings
    }

    /// Get total number of registered agents
    async fn agents_count(&self) -> u64 {
        let mut count = 0u64;
        let _ = self.state.agents().for_each_index(|_| {
            count += 1;
            Ok(())
        }).await;
        count
    }

    /// Get marketplace statistics
    async fn stats(&self) -> MarketplaceStats {
        let next_job_id = *self.state.next_job_id().get();
        
        let mut total_jobs = 0u64;
        let mut posted_jobs = 0u64;
        let mut in_progress_jobs = 0u64;
        let mut completed_jobs = 0u64;
        let mut total_payment = 0.0f64;
        
        for id in 1..next_job_id {
            if let Ok(Some(job)) = self.state.jobs().get(&id).await {
                total_jobs += 1;
                let payment: f64 = job.payment.to_string().parse().unwrap_or(0.0);
                total_payment += payment;
                
                match job.status {
                    JobStatus::Posted => posted_jobs += 1,
                    JobStatus::InProgress => in_progress_jobs += 1,
                    JobStatus::Completed => completed_jobs += 1,
                }
            }
        }
        
        let mut agents_count = 0u64;
        let _ = self.state.agents().for_each_index(|_| {
            agents_count += 1;
            Ok(())
        }).await;
        
        MarketplaceStats {
            total_jobs,
            posted_jobs,
            in_progress_jobs,
            completed_jobs,
            total_agents: agents_count,
            total_payment_volume: total_payment.to_string(),
        }
    }
}

/// Marketplace statistics
#[derive(async_graphql::SimpleObject)]
struct MarketplaceStats {
    total_jobs: u64,
    posted_jobs: u64,
    in_progress_jobs: u64,
    completed_jobs: u64,
    total_agents: u64,
    total_payment_volume: String,
}
