/*!
Job Marketplace Service v2.0 - GraphQL Interface

Enhanced with queries for:
- Jobs with category/tag filtering
- Escrow status
- Disputes
- Messages
- Agent verification
- Milestones
*/

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;
use async_graphql::{EmptySubscription, Enum, InputObject, Object, Request, Response, Schema};
use job_marketplace::{
    AgentProfile, AgentRating, ChatMessage, Dispute, DisputeStatus, EscrowInfo,
    Job, JobCategory, JobMarketplace, JobStatus, Operation, VerificationLevel,
};
use linera_sdk::{
    graphql::GraphQLMutationRoot as _,
    linera_base_types::WithServiceAbi,
    views::View,
    Service, ServiceRuntime,
};

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
            QueryRoot {
                state: self.state.clone(),
            },
            Operation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

// ==================== FILTER TYPES ====================

/// Job filter options for querying
#[derive(InputObject, Default)]
struct JobFilter {
    /// Filter by job status
    status: Option<JobStatus>,
    /// Filter by category
    category: Option<JobCategory>,
    /// Filter by tags (any match)
    tags: Option<Vec<String>>,
    /// Minimum payment amount
    min_payment: Option<String>,
    /// Maximum payment amount
    max_payment: Option<String>,
    /// Filter by client address
    client: Option<String>,
    /// Search in title/description
    search: Option<String>,
    /// Has milestones
    has_milestones: Option<bool>,
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
    Deadline,
    BidCount,
}

/// Agent filter options
#[derive(InputObject, Default)]
struct AgentFilter {
    /// Minimum jobs completed
    min_jobs_completed: Option<u64>,
    /// Minimum average rating (1-5)
    min_rating: Option<f64>,
    /// Filter by verification level
    verification_level: Option<VerificationLevel>,
    /// Filter by skills (any match)
    skills: Option<Vec<String>>,
    /// Only available agents
    available: Option<bool>,
}

/// Sort field for agents
#[derive(Enum, Clone, Copy, PartialEq, Eq, Default)]
enum AgentSortField {
    #[default]
    JobsCompleted,
    Rating,
    RegisteredAt,
    SuccessRate,
}

/// Dispute filter options
#[derive(InputObject, Default)]
struct DisputeFilter {
    /// Filter by status
    status: Option<DisputeStatus>,
    /// Filter by job ID
    job_id: Option<u64>,
}

// ==================== QUERY ROOT ====================

/// GraphQL Query Root - Read state from the blockchain
struct QueryRoot {
    state: Arc<JobMarketplace>,
}

#[Object]
impl QueryRoot {
    /// Get service status
    async fn hello(&self) -> String {
        "Job Marketplace v2.0 - Linera Blockchain with Escrow, Disputes & Messaging".to_string()
    }

    // ==================== JOB QUERIES ====================

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

        let next_id = *self.state.next_job_id().get();

        // Start from 0 to handle both uninitialized state (first job ID = 0)
        // and initialized state (first job ID = 1)
        for id in 0..next_id.max(100) {
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

                // Category filter
                if let Some(ref category) = f.category {
                    if job.category != *category {
                        return false;
                    }
                }

                // Tags filter (any match)
                if let Some(ref tags) = f.tags {
                    if !tags.is_empty() {
                        let has_matching_tag = tags.iter().any(|t| {
                            job.tags.iter().any(|jt| jt.to_lowercase().contains(&t.to_lowercase()))
                        });
                        if !has_matching_tag {
                            return false;
                        }
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

                // Search in title/description
                if let Some(ref search) = f.search {
                    let search_lower = search.to_lowercase();
                    if !job.title.to_lowercase().contains(&search_lower)
                        && !job.description.to_lowercase().contains(&search_lower)
                    {
                        return false;
                    }
                }

                // Has milestones filter
                if let Some(has_ms) = f.has_milestones {
                    if has_ms && job.milestones.is_empty() {
                        return false;
                    }
                    if !has_ms && !job.milestones.is_empty() {
                        return false;
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
                JobSortField::Deadline => a.deadline.cmp(&b.deadline),
                JobSortField::BidCount => a.bids.len().cmp(&b.bids.len()),
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

    /// Get jobs by category
    async fn jobs_by_category(&self, category: JobCategory) -> Vec<Job> {
        let mut jobs = Vec::new();
        let next_id = *self.state.next_job_id().get();

        for id in 0..next_id.max(100) {
            if let Ok(Some(job)) = self.state.jobs().get(&id).await {
                if job.category == category {
                    jobs.push(job.clone());
                }
            }
        }
        jobs
    }

    /// Search jobs by keyword in title/description
    async fn search_jobs(&self, query: String) -> Vec<Job> {
        let mut jobs = Vec::new();
        let query_lower = query.to_lowercase();
        let next_id = *self.state.next_job_id().get();

        for id in 0..next_id.max(100) {
            if let Ok(Some(job)) = self.state.jobs().get(&id).await {
                if job.title.to_lowercase().contains(&query_lower)
                    || job.description.to_lowercase().contains(&query_lower)
                    || job.tags.iter().any(|t| t.to_lowercase().contains(&query_lower))
                {
                    jobs.push(job.clone());
                }
            }
        }
        jobs
    }

    /// Get jobs count by status
    async fn jobs_count(&self, status: Option<JobStatus>) -> u64 {
        let mut count = 0u64;
        let next_id = *self.state.next_job_id().get();

        for id in 0..next_id.max(100) {
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

    // ==================== AGENT QUERIES ====================

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

        let _ = self
            .state
            .agents()
            .for_each_index(|owner| {
                owners.push(owner.clone());
                Ok(())
            })
            .await;

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
                        let avg_rating =
                            agent.total_rating_points as f64 / agent.total_ratings as f64;
                        if avg_rating < min_rating {
                            return false;
                        }
                    } else if min_rating > 0.0 {
                        return false;
                    }
                }

                // Verification level filter
                if let Some(ref level) = f.verification_level {
                    if agent.verification_level != *level {
                        return false;
                    }
                }

                // Skills filter (any match)
                if let Some(ref skills) = f.skills {
                    if !skills.is_empty() {
                        let has_matching_skill = skills.iter().any(|s| {
                            agent.skills.iter().any(|as_| as_.to_lowercase().contains(&s.to_lowercase()))
                        });
                        if !has_matching_skill {
                            return false;
                        }
                    }
                }

                // Availability filter
                if let Some(available) = f.available {
                    if agent.availability != available {
                        return false;
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
                        a.total_rating_points as f64 / a.total_ratings as f64
                    } else {
                        0.0
                    };
                    let rating_b = if b.total_ratings > 0 {
                        b.total_rating_points as f64 / b.total_ratings as f64
                    } else {
                        0.0
                    };
                    rating_a
                        .partial_cmp(&rating_b)
                        .unwrap_or(std::cmp::Ordering::Equal)
                }
                AgentSortField::RegisteredAt => a.registered_at.cmp(&b.registered_at),
                AgentSortField::SuccessRate => a.success_rate.cmp(&b.success_rate),
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
        let mut owners = Vec::new();
        let _ = self
            .state
            .agents()
            .for_each_index(|o| {
                owners.push(o.clone());
                Ok(())
            })
            .await;

        for o in owners {
            if format!("{:?}", o).contains(&owner) || owner.contains(&format!("{:?}", o)) {
                if let Ok(Some(profile)) = self.state.agents().get(&o).await {
                    return Some(profile.clone());
                }
            }
        }
        None
    }

    /// Get agents by skill
    async fn agents_by_skill(&self, skill: String) -> Vec<AgentProfile> {
        let mut owners = Vec::new();
        let _ = self
            .state
            .agents()
            .for_each_index(|o| {
                owners.push(o.clone());
                Ok(())
            })
            .await;

        let mut profiles = Vec::new();
        let skill_lower = skill.to_lowercase();

        for owner in owners {
            if let Ok(Some(profile)) = self.state.agents().get(&owner).await {
                if profile.skills.iter().any(|s| s.to_lowercase().contains(&skill_lower)) {
                    profiles.push(profile.clone());
                }
            }
        }
        profiles
    }

    /// Get verified agents only
    async fn verified_agents(&self, min_level: Option<VerificationLevel>) -> Vec<AgentProfile> {
        let mut owners = Vec::new();
        let _ = self
            .state
            .agents()
            .for_each_index(|o| {
                owners.push(o.clone());
                Ok(())
            })
            .await;

        let mut profiles = Vec::new();
        let min = min_level.unwrap_or(VerificationLevel::EmailVerified);

        for owner in owners {
            if let Ok(Some(profile)) = self.state.agents().get(&owner).await {
                // Check verification level is at least min_level
                let level_val = match profile.verification_level {
                    VerificationLevel::Unverified => 0,
                    VerificationLevel::EmailVerified => 1,
                    VerificationLevel::IdentityVerified => 2,
                    VerificationLevel::ProVerified => 3,
                };
                let min_val = match min {
                    VerificationLevel::Unverified => 0,
                    VerificationLevel::EmailVerified => 1,
                    VerificationLevel::IdentityVerified => 2,
                    VerificationLevel::ProVerified => 3,
                };
                if level_val >= min_val {
                    profiles.push(profile.clone());
                }
            }
        }
        profiles
    }

    /// Get ratings for a specific agent
    async fn agent_ratings(&self, _agent_owner: String) -> Vec<AgentRating> {
        let mut ratings = Vec::new();
        let next_id = *self.state.next_rating_id().get();

        for id in 0..next_id.max(100) {
            if let Ok(Some(rating)) = self.state.ratings().get(&id).await {
                ratings.push(rating.clone());
            }
        }

        ratings
    }

    /// Get total number of registered agents
    async fn agents_count(&self) -> u64 {
        let mut count = 0u64;
        let _ = self
            .state
            .agents()
            .for_each_index(|_| {
                count += 1;
                Ok(())
            })
            .await;
        count
    }

    // ==================== ESCROW QUERIES ====================

    /// Get escrow info for a job
    async fn escrow(&self, job_id: u64) -> Option<EscrowInfo> {
        match self.state.escrow().get(&job_id).await {
            Ok(Some(escrow)) => Some(escrow.clone()),
            _ => None,
        }
    }

    /// Get all active escrows
    async fn active_escrows(&self) -> Vec<EscrowInfo> {
        let mut escrows = Vec::new();
        let next_id = *self.state.next_job_id().get();

        for id in 0..next_id.max(100) {
            if let Ok(Some(escrow)) = self.state.escrow().get(&id).await {
                if escrow.status == job_marketplace::EscrowStatus::Locked {
                    escrows.push(escrow.clone());
                }
            }
        }
        escrows
    }

    // ==================== DISPUTE QUERIES ====================

    /// Get all disputes with optional filtering
    async fn disputes(&self, filter: Option<DisputeFilter>) -> Vec<Dispute> {
        let mut disputes = Vec::new();
        let next_id = *self.state.next_dispute_id().get();

        for id in 0..next_id.max(100) {
            if let Ok(Some(dispute)) = self.state.disputes().get(&id).await {
                disputes.push(dispute.clone());
            }
        }

        // Apply filters
        if let Some(f) = filter {
            disputes.retain(|d| {
                if let Some(ref status) = f.status {
                    if d.status != *status {
                        return false;
                    }
                }
                if let Some(job_id) = f.job_id {
                    if d.job_id != job_id {
                        return false;
                    }
                }
                true
            });
        }

        disputes
    }

    /// Get a specific dispute by ID
    async fn dispute(&self, id: u64) -> Option<Dispute> {
        match self.state.disputes().get(&id).await {
            Ok(Some(dispute)) => Some(dispute.clone()),
            _ => None,
        }
    }

    /// Get open disputes count
    async fn open_disputes_count(&self) -> u64 {
        let mut count = 0u64;
        let next_id = *self.state.next_dispute_id().get();

        for id in 0..next_id.max(100) {
            if let Ok(Some(dispute)) = self.state.disputes().get(&id).await {
                if dispute.status == DisputeStatus::Open || dispute.status == DisputeStatus::UnderReview {
                    count += 1;
                }
            }
        }
        count
    }

    // ==================== MESSAGE QUERIES ====================

    /// Get messages for a job
    async fn messages(&self, job_id: u64) -> Vec<ChatMessage> {
        let mut messages = Vec::new();
        let next_id = *self.state.next_message_id().get();

        for id in 0..next_id.max(100) {
            if let Ok(Some(msg)) = self.state.messages().get(&id).await {
                if msg.job_id == job_id {
                    messages.push(msg.clone());
                }
            }
        }

        // Sort by timestamp
        messages.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        messages
    }

    /// Get unread message count for a user
    async fn unread_messages_count(&self, user: String) -> u64 {
        let mut count = 0u64;
        let next_id = *self.state.next_message_id().get();

        for id in 0..next_id.max(100) {
            if let Ok(Some(msg)) = self.state.messages().get(&id).await {
                if !msg.read && format!("{:?}", msg.recipient).contains(&user) {
                    count += 1;
                }
            }
        }
        count
    }

    // ==================== STATISTICS ====================

    /// Get marketplace statistics
    async fn stats(&self) -> MarketplaceStats {
        let next_job_id = *self.state.next_job_id().get();

        let mut total_jobs = 0u64;
        let mut posted_jobs = 0u64;
        let mut in_progress_jobs = 0u64;
        let mut completed_jobs = 0u64;
        let mut disputed_jobs = 0u64;
        let mut total_payment = 0.0f64;
        let mut total_bids = 0u64;

        for id in 1..next_job_id {
            if let Ok(Some(job)) = self.state.jobs().get(&id).await {
                total_jobs += 1;
                total_bids += job.bids.len() as u64;
                let payment: f64 = job.payment.to_string().parse().unwrap_or(0.0);
                total_payment += payment;

                match job.status {
                    JobStatus::Posted => posted_jobs += 1,
                    JobStatus::InProgress | JobStatus::PendingApproval => in_progress_jobs += 1,
                    JobStatus::Completed => completed_jobs += 1,
                    JobStatus::Disputed => disputed_jobs += 1,
                    _ => {}
                }
            }
        }

        let mut agents_count = 0u64;
        let mut verified_agents = 0u64;
        let mut owners = Vec::new();
        let _ = self
            .state
            .agents()
            .for_each_index(|o| {
                owners.push(o.clone());
                Ok(())
            })
            .await;

        for owner in owners {
            agents_count += 1;
            if let Ok(Some(profile)) = self.state.agents().get(&owner).await {
                if profile.verification_level != VerificationLevel::Unverified {
                    verified_agents += 1;
                }
            }
        }

        let next_dispute_id = *self.state.next_dispute_id().get();
        let open_disputes = next_dispute_id - 1; // Simplified

        MarketplaceStats {
            total_jobs,
            posted_jobs,
            in_progress_jobs,
            completed_jobs,
            disputed_jobs,
            total_agents: agents_count,
            verified_agents,
            total_payment_volume: total_payment.to_string(),
            total_bids,
            open_disputes,
            avg_bids_per_job: if total_jobs > 0 {
                total_bids as f64 / total_jobs as f64
            } else {
                0.0
            },
        }
    }

    /// Get category statistics
    async fn category_stats(&self) -> Vec<CategoryStats> {
        let mut category_counts: std::collections::HashMap<JobCategory, u64> =
            std::collections::HashMap::new();
        let next_id = *self.state.next_job_id().get();

        for id in 0..next_id.max(100) {
            if let Ok(Some(job)) = self.state.jobs().get(&id).await {
                *category_counts.entry(job.category).or_insert(0) += 1;
            }
        }

        category_counts
            .into_iter()
            .map(|(category, count)| CategoryStats { category, count })
            .collect()
    }
}

/// Marketplace statistics
#[derive(async_graphql::SimpleObject)]
struct MarketplaceStats {
    total_jobs: u64,
    posted_jobs: u64,
    in_progress_jobs: u64,
    completed_jobs: u64,
    disputed_jobs: u64,
    total_agents: u64,
    verified_agents: u64,
    total_payment_volume: String,
    total_bids: u64,
    open_disputes: u64,
    avg_bids_per_job: f64,
}

/// Category statistics
#[derive(async_graphql::SimpleObject)]
struct CategoryStats {
    category: JobCategory,
    count: u64,
}
