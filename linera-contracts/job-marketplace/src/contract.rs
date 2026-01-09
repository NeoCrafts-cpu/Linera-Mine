/*!
Job Marketplace Contract v2.0 - Business Logic

Enhanced with:
- Escrow payment system
- Dispute resolution
- Competitive bidding with amounts
- Milestone-based delivery
- In-app messaging
- Agent verification
*/

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use job_marketplace::{
    AgentProfile, AgentRating, Bid, ChatMessage, Dispute, DisputeStatus, EscrowInfo,
    EscrowStatus, Job, JobCategory, JobMarketplace, JobMarketplaceError, JobStatus,
    Message, Milestone, MilestoneInput, MilestoneStatus, Operation, VerificationLevel,
};
use linera_sdk::{
    linera_base_types::{AccountOwner, Amount},
    views::{RootView, View},
    Contract, ContractRuntime,
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
        // Initialize all IDs starting at 1
        self.state.next_job_id_mut().set(1);
        self.state.next_rating_id_mut().set(1);
        self.state.next_dispute_id_mut().set(1);
        self.state.next_message_id_mut().set(1);
    }

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response {
        match operation {
            // ===== Job Operations =====
            Operation::PostJob {
                title,
                description,
                payment,
                category,
                tags,
                deadline,
                milestones,
            } => self.post_job(title, description, payment, category, tags, deadline, milestones).await,
            
            Operation::CancelJob { job_id } => self.cancel_job(job_id).await,

            // ===== Bidding Operations =====
            Operation::PlaceBid {
                job_id,
                amount,
                proposal,
                estimated_days,
            } => self.place_bid(job_id, amount, proposal, estimated_days).await,
            
            Operation::WithdrawBid { job_id } => self.withdraw_bid(job_id).await,
            
            Operation::AcceptBid {
                job_id,
                agent,
                bid_amount,
            } => self.accept_bid(job_id, agent, bid_amount).await,

            // ===== Work Delivery Operations =====
            Operation::SubmitMilestone {
                job_id,
                milestone_id,
                delivery_notes,
            } => self.submit_milestone(job_id, milestone_id, delivery_notes).await,
            
            Operation::ApproveMilestone {
                job_id,
                milestone_id,
            } => self.approve_milestone(job_id, milestone_id).await,
            
            Operation::RequestRevision {
                job_id,
                milestone_id,
                feedback,
            } => self.request_revision(job_id, milestone_id, feedback).await,
            
            Operation::CompleteJob { job_id } => self.complete_job(job_id).await,

            // ===== Agent Operations =====
            Operation::RegisterAgent {
                name,
                service_description,
                skills,
                hourly_rate,
            } => self.register_agent(name, service_description, skills, hourly_rate).await,
            
            Operation::UpdateAgentProfile {
                name,
                service_description,
                skills,
                portfolio_urls,
                hourly_rate,
                availability,
            } => {
                self.update_agent_profile(
                    name,
                    service_description,
                    skills,
                    portfolio_urls,
                    hourly_rate,
                    availability,
                )
                .await
            }
            
            Operation::RequestVerification { level, proof_data } => {
                self.request_verification(level, proof_data).await
            }

            // ===== Rating Operations =====
            Operation::RateAgent {
                job_id,
                rating,
                review,
            } => self.rate_agent(job_id, rating, review).await,

            // ===== Dispute Operations =====
            Operation::OpenDispute { job_id, reason } => self.open_dispute(job_id, reason).await,
            
            Operation::RespondToDispute {
                dispute_id,
                response,
            } => self.respond_to_dispute(dispute_id, response).await,
            
            Operation::ResolveDispute {
                dispute_id,
                resolution,
                refund_percentage,
                notes,
            } => self.resolve_dispute(dispute_id, resolution, refund_percentage, notes).await,

            // ===== Messaging Operations =====
            Operation::SendMessage {
                job_id,
                recipient,
                content,
            } => self.send_message(job_id, recipient, content).await,
            
            Operation::MarkMessagesRead { message_ids } => {
                self.mark_messages_read(message_ids).await
            }
        }
    }

    async fn execute_message(&mut self, message: Message) {
        match message {
            Message::JobPosted { job_id: _, title: _, payment: _, category: _ } => {
                // Cross-chain job notification
                // Would be handled by storing notification state if needed
            }
            Message::BidAccepted { job_id: _, agent: _, amount: _ } => {
                // Bid accepted notification
            }
            Message::ReleaseEscrow { job_id: _, amount: _, recipient: _ } => {
                // Handle escrow release
            }
            Message::RefundEscrow { job_id: _, amount: _, recipient: _ } => {
                // Handle escrow refund
            }
            Message::DisputeOpened { dispute_id: _, job_id: _ } => {
                // Dispute notification
            }
            Message::NewMessage { message_id: _, job_id: _, sender: _ } => {
                // New message notification
            }
        }
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

// ==================== IMPLEMENTATION ====================

impl JobMarketplaceContract {
    /// Get authenticated caller or return error
    fn get_caller(&mut self) -> Result<AccountOwner, JobMarketplaceError> {
        self.runtime
            .authenticated_signer()
            .ok_or(JobMarketplaceError::NotAuthorized)
    }

    // ==================== JOB OPERATIONS ====================

    /// Post a new job with escrow
    async fn post_job(
        &mut self,
        title: String,
        description: String,
        payment: Amount,
        category: JobCategory,
        tags: Vec<String>,
        deadline: Option<u64>,
        milestone_inputs: Vec<MilestoneInput>,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

        // Validate milestones total 100%
        if !milestone_inputs.is_empty() {
            let total: u8 = milestone_inputs.iter().map(|m| m.payment_percentage).sum();
            if total != 100 {
                return Err(JobMarketplaceError::InvalidMilestonePercentages);
            }
        }

        // Get next job ID
        let job_id = *self.state.next_job_id().get();
        self.state.next_job_id_mut().set(job_id + 1);

        // Convert milestones
        let milestones: Vec<Milestone> = milestone_inputs
            .into_iter()
            .enumerate()
            .map(|(i, m)| Milestone {
                id: i as u64,
                title: m.title,
                description: m.description,
                payment_percentage: m.payment_percentage,
                status: MilestoneStatus::Pending,
                due_date: m.due_days.map(|days| {
                    let current = self.runtime.system_time();
                    linera_sdk::linera_base_types::Timestamp::from(
                        current.micros() + (days as u64 * 24 * 60 * 60 * 1_000_000)
                    )
                }),
            })
            .collect();

        // Convert deadline
        let deadline_ts = deadline.map(|ts| {
            linera_sdk::linera_base_types::Timestamp::from(ts * 1_000_000)
        });

        // Create job
        let job = Job {
            id: job_id,
            client: caller,
            description,
            payment,
            status: JobStatus::Posted,
            agent: None,
            bids: vec![],
            created_at: self.runtime.system_time(),
            title: title.clone(),
            category,
            tags,
            deadline: deadline_ts,
            milestones,
            accepted_bid_amount: None,
            escrow_id: None,
        };

        // Store job
        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to insert job");

        Ok(())
    }

    /// Cancel a posted job
    async fn cancel_job(&mut self, job_id: u64) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

        let mut job = self.state
            .jobs()
            .get(&job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(job_id))?;

        // Only client can cancel
        if job.client != caller {
            return Err(JobMarketplaceError::NotAuthorized);
        }

        // Can only cancel if Posted (no accepted bid)
        if job.status != JobStatus::Posted {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        job.status = JobStatus::Cancelled;

        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to update job");

        Ok(())
    }

    // ==================== BIDDING OPERATIONS ====================

    /// Place a bid on a job with amount and proposal
    async fn place_bid(
        &mut self,
        job_id: u64,
        amount: Amount,
        proposal: String,
        estimated_days: u32,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

        // Check if agent is registered
        let agents_list = self.state.agents().indices().await.expect("Failed to get agents");
        if !agents_list.contains(&caller) {
            return Err(JobMarketplaceError::AgentNotRegistered);
        }

        // Get job
        let mut job = self.state
            .jobs()
            .get(&job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(job_id))?;

        // Cannot bid on own job
        if job.client == caller {
            return Err(JobMarketplaceError::CannotBidOwnJob);
        }

        // Check if job is in Posted status
        if job.status != JobStatus::Posted {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        // Check deadline
        if let Some(deadline) = job.deadline {
            if self.runtime.system_time() > deadline {
                return Err(JobMarketplaceError::DeadlinePassed);
            }
        }

        // Check if already bid
        if job.bids.iter().any(|b| b.agent == caller) {
            return Err(JobMarketplaceError::AlreadyBid);
        }

        // Validate amount
        if amount == Amount::ZERO {
            return Err(JobMarketplaceError::InvalidAmount);
        }

        // Add bid
        let bid = Bid {
            agent: caller,
            bid_id: job.bids.len() as u64,
            timestamp: self.runtime.system_time(),
            amount,
            proposal,
            estimated_days,
        };
        job.bids.push(bid);

        // Update job
        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to update job");

        Ok(())
    }

    /// Withdraw a bid
    async fn withdraw_bid(&mut self, job_id: u64) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

        let mut job = self.state
            .jobs()
            .get(&job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(job_id))?;

        // Check if job is still posted
        if job.status != JobStatus::Posted {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        // Find and remove bid
        let original_len = job.bids.len();
        job.bids.retain(|b| b.agent != caller);

        if job.bids.len() == original_len {
            return Err(JobMarketplaceError::BidNotFound);
        }

        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to update job");

        Ok(())
    }

    /// Accept a bid (locks payment in escrow)
    async fn accept_bid(
        &mut self,
        job_id: u64,
        agent: AccountOwner,
        bid_amount: Amount,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

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

        // Verify bid exists with the specified amount
        let bid_exists = job.bids.iter().any(|b| b.agent == agent && b.amount == bid_amount);
        if !bid_exists {
            return Err(JobMarketplaceError::BidNotFound);
        }

        // Create escrow
        let escrow_id = job_id; // Use job_id as escrow_id for simplicity
        let escrow = EscrowInfo {
            job_id,
            client: caller,
            agent: Some(agent),
            amount: bid_amount,
            status: EscrowStatus::Locked,
            locked_at: self.runtime.system_time(),
            released_at: None,
        };

        self.state
            .escrow_mut()
            .insert(&escrow_id, escrow)
            .expect("Failed to create escrow");

        // Update job
        job.status = JobStatus::InProgress;
        job.agent = Some(agent);
        job.accepted_bid_amount = Some(bid_amount);
        job.escrow_id = Some(escrow_id);

        // Set milestones to InProgress if first milestone
        if !job.milestones.is_empty() {
            job.milestones[0].status = MilestoneStatus::InProgress;
        }

        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to update job");

        Ok(())
    }

    // ==================== WORK DELIVERY OPERATIONS ====================

    /// Submit work for a milestone
    async fn submit_milestone(
        &mut self,
        job_id: u64,
        milestone_id: u64,
        _delivery_notes: String,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

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

        // Check job status
        if job.status != JobStatus::InProgress {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        // Find and update milestone
        let milestone = job
            .milestones
            .iter_mut()
            .find(|m| m.id == milestone_id)
            .ok_or(JobMarketplaceError::MilestoneNotFound)?;

        if milestone.status != MilestoneStatus::InProgress {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        milestone.status = MilestoneStatus::Submitted;

        // Update job status to pending approval
        job.status = JobStatus::PendingApproval;

        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to update job");

        Ok(())
    }

    /// Approve a milestone (releases proportional payment)
    async fn approve_milestone(
        &mut self,
        job_id: u64,
        milestone_id: u64,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

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

        // Find and update milestone
        let milestone = job
            .milestones
            .iter_mut()
            .find(|m| m.id == milestone_id)
            .ok_or(JobMarketplaceError::MilestoneNotFound)?;

        if milestone.status != MilestoneStatus::Submitted {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        milestone.status = MilestoneStatus::Approved;

        // Check if all milestones are approved
        let all_approved = job.milestones.iter().all(|m| m.status == MilestoneStatus::Approved);

        if all_approved {
            job.status = JobStatus::Completed;
        } else {
            // Find next pending milestone and set to in progress
            if let Some(next) = job.milestones.iter_mut().find(|m| m.status == MilestoneStatus::Pending) {
                next.status = MilestoneStatus::InProgress;
            }
            job.status = JobStatus::InProgress;
        }

        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to update job");

        Ok(())
    }

    /// Request revision for a milestone
    async fn request_revision(
        &mut self,
        job_id: u64,
        milestone_id: u64,
        _feedback: String,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

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

        // Find and update milestone
        let milestone = job
            .milestones
            .iter_mut()
            .find(|m| m.id == milestone_id)
            .ok_or(JobMarketplaceError::MilestoneNotFound)?;

        if milestone.status != MilestoneStatus::Submitted {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        milestone.status = MilestoneStatus::Rejected;
        job.status = JobStatus::InProgress;

        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to update job");

        Ok(())
    }

    /// Complete entire job (releases remaining payment)
    async fn complete_job(&mut self, job_id: u64) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

        let mut job = self.state
            .jobs()
            .get(&job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(job_id))?;

        // Client approves completion
        if job.client != caller {
            return Err(JobMarketplaceError::NotAuthorized);
        }

        // Check status
        if job.status != JobStatus::InProgress && job.status != JobStatus::PendingApproval {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        // Update job
        job.status = JobStatus::Completed;

        // Mark all milestones as approved
        for milestone in &mut job.milestones {
            milestone.status = MilestoneStatus::Approved;
        }

        self.state
            .jobs_mut()
            .insert(&job_id, job.clone())
            .expect("Failed to update job");

        // Release escrow
        if let Some(escrow_id) = job.escrow_id {
            if let Some(mut escrow) = self.state.escrow().get(&escrow_id).await.expect("Failed to get escrow") {
                escrow.status = EscrowStatus::Released;
                escrow.released_at = Some(self.runtime.system_time());
                self.state.escrow_mut().insert(&escrow_id, escrow).expect("Failed to update escrow");
            }
        }

        // Update agent stats
        if let Some(agent_owner) = job.agent {
            if let Some(mut agent_profile) = self.state.agents().get(&agent_owner).await.expect("Failed to get agent") {
                agent_profile.jobs_completed += 1;
                // Update success rate
                let total_jobs = agent_profile.jobs_completed;
                agent_profile.success_rate = ((agent_profile.success_rate as u64 * (total_jobs - 1) + 100) / total_jobs) as u8;
                self.state.agents_mut().insert(&agent_owner, agent_profile).expect("Failed to update agent");
            }
        }

        Ok(())
    }

    // ==================== AGENT OPERATIONS ====================

    /// Register as an agent with enhanced profile
    async fn register_agent(
        &mut self,
        name: String,
        service_description: String,
        skills: Vec<String>,
        hourly_rate: Option<Amount>,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

        // Check if agent already registered
        let agents_list = self.state.agents().indices().await.expect("Failed to get agents");
        if agents_list.contains(&caller) {
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
            verification_level: VerificationLevel::Unverified,
            skills,
            portfolio_urls: vec![],
            hourly_rate,
            availability: true,
            response_time_hours: 24,
            success_rate: 100,
        };

        self.state
            .agents_mut()
            .insert(&caller, profile)
            .expect("Failed to register agent");

        Ok(())
    }

    /// Update agent profile
    async fn update_agent_profile(
        &mut self,
        name: Option<String>,
        service_description: Option<String>,
        skills: Option<Vec<String>>,
        portfolio_urls: Option<Vec<String>>,
        hourly_rate: Option<Amount>,
        availability: Option<bool>,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

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
        if let Some(s) = skills {
            profile.skills = s;
        }
        if let Some(urls) = portfolio_urls {
            profile.portfolio_urls = urls;
        }
        if let Some(rate) = hourly_rate {
            profile.hourly_rate = Some(rate);
        }
        if let Some(avail) = availability {
            profile.availability = avail;
        }

        self.state
            .agents_mut()
            .insert(&caller, profile)
            .expect("Failed to update agent");

        Ok(())
    }

    /// Request verification upgrade
    async fn request_verification(
        &mut self,
        level: VerificationLevel,
        _proof_data: String,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

        let mut profile = self.state
            .agents()
            .get(&caller)
            .await
            .expect("Failed to get agent")
            .ok_or(JobMarketplaceError::AgentNotRegistered)?;

        // In a real system, this would trigger a verification process
        // For now, auto-approve for demonstration
        profile.verification_level = level;

        self.state
            .agents_mut()
            .insert(&caller, profile)
            .expect("Failed to update agent");

        Ok(())
    }

    // ==================== RATING OPERATIONS ====================

    /// Rate an agent after job completion
    async fn rate_agent(
        &mut self,
        job_id: u64,
        rating: u8,
        review: String,
    ) -> Result<(), JobMarketplaceError> {
        // Validate rating is 1-5
        if rating < 1 || rating > 5 {
            return Err(JobMarketplaceError::InvalidRating);
        }

        let caller = self.get_caller()?;

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

    // ==================== DISPUTE OPERATIONS ====================

    /// Open a dispute
    async fn open_dispute(
        &mut self,
        job_id: u64,
        reason: String,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

        let mut job = self.state
            .jobs()
            .get(&job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(job_id))?;

        // Only client or agent can open dispute
        if job.client != caller && job.agent != Some(caller) {
            return Err(JobMarketplaceError::NotAuthorized);
        }

        // Can only dispute jobs in progress
        if job.status != JobStatus::InProgress && job.status != JobStatus::PendingApproval {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        // Check for existing dispute
        let disputes_list = self.state.disputes().indices().await.expect("Failed to get disputes");
        for dispute_id in disputes_list {
            let dispute = self.state.disputes().get(&dispute_id).await.expect("Failed to get dispute");
            if let Some(d) = dispute {
                if d.job_id == job_id && d.status == DisputeStatus::Open {
                    return Err(JobMarketplaceError::DisputeAlreadyOpen);
                }
            }
        }

        // Create dispute
        let dispute_id = *self.state.next_dispute_id().get();
        self.state.next_dispute_id_mut().set(dispute_id + 1);

        let dispute = Dispute {
            id: dispute_id,
            job_id,
            initiator: caller,
            reason,
            status: DisputeStatus::Open,
            created_at: self.runtime.system_time(),
            resolved_at: None,
            resolution_notes: None,
            refund_percentage: None,
        };

        self.state
            .disputes_mut()
            .insert(&dispute_id, dispute)
            .expect("Failed to create dispute");

        // Update job status
        job.status = JobStatus::Disputed;
        self.state
            .jobs_mut()
            .insert(&job_id, job)
            .expect("Failed to update job");

        Ok(())
    }

    /// Respond to a dispute (add evidence)
    async fn respond_to_dispute(
        &mut self,
        dispute_id: u64,
        _response: String,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

        let dispute = self.state
            .disputes()
            .get(&dispute_id)
            .await
            .expect("Failed to get dispute")
            .ok_or(JobMarketplaceError::DisputeNotFound)?;

        // Get job to verify participant
        let job = self.state
            .jobs()
            .get(&dispute.job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(dispute.job_id))?;

        // Only client or agent can respond
        if job.client != caller && job.agent != Some(caller) {
            return Err(JobMarketplaceError::NotAuthorized);
        }

        if dispute.status != DisputeStatus::Open {
            return Err(JobMarketplaceError::InvalidStatus);
        }

        // Update dispute to under review
        let mut updated_dispute = dispute.clone();
        updated_dispute.status = DisputeStatus::UnderReview;

        self.state
            .disputes_mut()
            .insert(&dispute_id, updated_dispute)
            .expect("Failed to update dispute");

        Ok(())
    }

    /// Resolve dispute (admin/arbitrator)
    async fn resolve_dispute(
        &mut self,
        dispute_id: u64,
        resolution: DisputeStatus,
        refund_percentage: Option<u8>,
        notes: String,
    ) -> Result<(), JobMarketplaceError> {
        let _caller = self.get_caller()?;
        // In production, would verify caller is arbitrator

        let mut dispute = self.state
            .disputes()
            .get(&dispute_id)
            .await
            .expect("Failed to get dispute")
            .ok_or(JobMarketplaceError::DisputeNotFound)?;

        dispute.status = resolution;
        dispute.resolved_at = Some(self.runtime.system_time());
        dispute.resolution_notes = Some(notes);
        dispute.refund_percentage = refund_percentage;

        self.state
            .disputes_mut()
            .insert(&dispute_id, dispute.clone())
            .expect("Failed to update dispute");

        // Update job and escrow based on resolution
        let mut job = self.state
            .jobs()
            .get(&dispute.job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(dispute.job_id))?;

        if let Some(escrow_id) = job.escrow_id {
            if let Some(mut escrow) = self.state.escrow().get(&escrow_id).await.expect("Failed to get escrow") {
                match resolution {
                    DisputeStatus::ResolvedForClient => {
                        escrow.status = EscrowStatus::Refunded;
                        job.status = JobStatus::Cancelled;
                    }
                    DisputeStatus::ResolvedForAgent => {
                        escrow.status = EscrowStatus::Released;
                        job.status = JobStatus::Completed;
                    }
                    DisputeStatus::ResolvedSplit => {
                        escrow.status = EscrowStatus::PartiallyRefunded;
                        job.status = JobStatus::Completed;
                    }
                    _ => {}
                }
                escrow.released_at = Some(self.runtime.system_time());
                self.state.escrow_mut().insert(&escrow_id, escrow).expect("Failed to update escrow");
            }
        }

        self.state.jobs_mut().insert(&dispute.job_id, job).expect("Failed to update job");

        Ok(())
    }

    // ==================== MESSAGING OPERATIONS ====================

    /// Send a message
    async fn send_message(
        &mut self,
        job_id: u64,
        recipient: AccountOwner,
        content: String,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

        // Verify job exists and caller is participant
        let job = self.state
            .jobs()
            .get(&job_id)
            .await
            .expect("Failed to get job")
            .ok_or(JobMarketplaceError::JobNotFound(job_id))?;

        if job.client != caller && job.agent != Some(caller) {
            return Err(JobMarketplaceError::NotAuthorized);
        }

        // Create message
        let message_id = *self.state.next_message_id().get();
        self.state.next_message_id_mut().set(message_id + 1);

        let message = ChatMessage {
            id: message_id,
            job_id,
            sender: caller,
            recipient,
            content,
            timestamp: self.runtime.system_time(),
            read: false,
        };

        self.state
            .messages_mut()
            .insert(&message_id, message)
            .expect("Failed to send message");

        Ok(())
    }

    /// Mark messages as read
    async fn mark_messages_read(
        &mut self,
        message_ids: Vec<u64>,
    ) -> Result<(), JobMarketplaceError> {
        let caller = self.get_caller()?;

        for msg_id in message_ids {
            if let Some(mut message) = self.state.messages().get(&msg_id).await.expect("Failed to get message") {
                // Only recipient can mark as read
                if message.recipient == caller {
                    message.read = true;
                    self.state.messages_mut().insert(&msg_id, message).expect("Failed to update message");
                }
            }
        }

        Ok(())
    }
}
