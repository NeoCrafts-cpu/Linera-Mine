import React, { useState, useEffect, useCallback } from 'react';
import { getJobById, acceptJob, getAgents, getAgentsFromChain, getJobFromChain, isLineraEnabled, completeJobOnChain, acceptBidOnChain, getCurrentUserAddress } from '../services/api';
import { Job, Owner, AgentProfile, JobStatus } from '../types';
import { AgentCard } from './AgentCard';
import { Spinner } from './Spinner';
import { JobStatusBadge } from './JobStatusBadge';
import { RateAgentModal } from './RateAgentModal';
import { PlaceBidModal } from './PlaceBidModal';

interface JobDetailsProps {
  jobId: number;
  onBack: () => void;
}

// Helper function for case-insensitive address comparison
const addressMatch = (addr1: string | null | undefined, addr2: string | null | undefined): boolean => {
  if (!addr1 || !addr2) return false;
  return addr1.toLowerCase() === addr2.toLowerCase();
};

// Pixel art emerald icon
const EmeraldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 16 16" className="pixel-art">
    <rect x="6" y="0" width="4" height="2" fill="#50C878"/>
    <rect x="4" y="2" width="2" height="2" fill="#3CB371"/>
    <rect x="6" y="2" width="4" height="2" fill="#98FB98"/>
    <rect x="10" y="2" width="2" height="2" fill="#50C878"/>
    <rect x="2" y="4" width="2" height="2" fill="#3CB371"/>
    <rect x="4" y="4" width="2" height="2" fill="#50C878"/>
    <rect x="6" y="4" width="4" height="2" fill="#98FB98"/>
    <rect x="10" y="4" width="2" height="2" fill="#50C878"/>
    <rect x="12" y="4" width="2" height="2" fill="#228B22"/>
    <rect x="2" y="6" width="2" height="4" fill="#3CB371"/>
    <rect x="4" y="6" width="2" height="4" fill="#50C878"/>
    <rect x="6" y="6" width="4" height="4" fill="#98FB98"/>
    <rect x="10" y="6" width="2" height="4" fill="#50C878"/>
    <rect x="12" y="6" width="2" height="4" fill="#228B22"/>
    <rect x="4" y="10" width="2" height="2" fill="#3CB371"/>
    <rect x="6" y="10" width="4" height="2" fill="#50C878"/>
    <rect x="10" y="10" width="2" height="2" fill="#228B22"/>
    <rect x="6" y="12" width="4" height="2" fill="#3CB371"/>
    <rect x="6" y="14" width="4" height="2" fill="#228B22"/>
  </svg>
);

const JobDetails: React.FC<JobDetailsProps> = ({ jobId, onBack }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAccepting, setIsAccepting] = useState<Owner | null>(null);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [showRateModal, setShowRateModal] = useState<boolean>(false);
  const [showBidModal, setShowBidModal] = useState<boolean>(false);

  const currentUser = getCurrentUserAddress();

  const fetchJobDetails = useCallback(async () => {
    try {
        setLoading(true);
        
        // Use Linera functions when enabled
        const jobPromise = isLineraEnabled() ? getJobFromChain(jobId) : getJobById(jobId);
        const agentsPromise = isLineraEnabled() ? getAgentsFromChain() : getAgents();
        
        const [jobData, agentsData] = await Promise.all([
            jobPromise,
            agentsPromise
        ]);
        
        if (jobData) {
            setJob(jobData);
        }
        setAgents(agentsData);
    } catch (error) {
        console.error("Failed to fetch job details:", error);
    } finally {
        setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobDetails();
  }, [fetchJobDetails]);

  const handleAcceptBid = async (agentOwner: Owner) => {
    if (!job) return;
    setIsAccepting(agentOwner);
    try {
      if (isLineraEnabled()) {
        await acceptBidOnChain(job.id, agentOwner);
      } else {
        await acceptJob(job.id, agentOwner);
      }
      await fetchJobDetails();
    } catch (error) {
      console.error("Failed to accept bid:", error);
    } finally {
        setIsAccepting(null);
    }
  };

  const handleBidPlaced = () => {
    setShowBidModal(false);
    fetchJobDetails();
  };

  const handleCompleteJob = async () => {
    if (!job) return;
    setIsCompleting(true);
    try {
      if (isLineraEnabled()) {
        await completeJobOnChain(job.id);
      }
      await fetchJobDetails();
    } catch (error) {
      console.error("Failed to complete job:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleRated = () => {
    setShowRateModal(false);
    fetchJobDetails();
  };


  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-mc-ui-bg-dark/50 border-2 border-mc-stone">
        <Spinner />
        <p className="text-mc-text-dark text-[10px] mt-4 animate-pulse">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-16 bg-mc-ui-bg-dark border-4 border-mc-stone">
        <div className="text-4xl mb-4">❓</div>
        <p className="text-mc-text-light text-sm mb-2">Job Not Found</p>
        <p className="text-mc-text-dark text-[10px] mb-4">This job may have been removed or doesn't exist.</p>
        <button onClick={onBack} className="text-mc-diamond text-[10px] hover:underline">
          ← Return to Marketplace
        </button>
      </div>
    );
  }

  const assignedAgentProfile = job.agent ? agents.find(a => a.owner === job.agent) : null;

  return (
    <div className="py-4">
      {/* Back Button */}
      <button 
        onClick={onBack} 
        className="flex items-center gap-2 text-mc-text-dark hover:text-mc-diamond transition-colors mb-6 text-[10px] uppercase tracking-wider"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
        </svg>
        Back to Marketplace
      </button>

      {/* Job Details Card */}
      <div className="bg-mc-ui-bg-dark border-4 border-mc-stone mb-8">
        {/* Status bar at top */}
        <div className={`h-2 ${
          job.status === 'COMPLETED' ? 'bg-mc-emerald' :
          job.status === 'IN_PROGRESS' ? 'bg-mc-diamond' :
          job.status === 'CANCELLED' ? 'bg-mc-redstone' :
          'bg-mc-gold'
        }`}></div>
        
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-mc-text-dark text-[9px] bg-mc-stone px-2 py-1 rounded-sm">
                  JOB #{job.id}
                </span>
                <JobStatusBadge status={job.status} />
              </div>
              <h1 className="text-xl text-mc-text-light leading-relaxed" style={{textShadow: '2px 2px #1B1B2F'}}>
                {job.description}
              </h1>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-mc-stone/30 p-4 border-2 border-mc-stone">
              <div className="text-mc-text-dark text-[8px] uppercase mb-1">Payment</div>
              <div className="flex items-center gap-2">
                <EmeraldIcon />
                <span className="text-mc-emerald text-lg font-bold">{job.payment.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-mc-stone/30 p-4 border-2 border-mc-stone">
              <div className="text-mc-text-dark text-[8px] uppercase mb-1">Total Bids</div>
              <div className="text-mc-diamond text-lg font-bold">{job.bids.length}</div>
            </div>
            <div className="bg-mc-stone/30 p-4 border-2 border-mc-stone">
              <div className="text-mc-text-dark text-[8px] uppercase mb-1">Client</div>
              <div className="text-mc-text-light text-[10px] truncate" title={job.client}>
                {job.client.substring(0, 8)}...{job.client.substring(job.client.length - 6)}
              </div>
            </div>
            <div className="bg-mc-stone/30 p-4 border-2 border-mc-stone">
              <div className="text-mc-text-dark text-[8px] uppercase mb-1">Status</div>
              <div className="text-mc-text-light text-sm">{job.status.replace('_', ' ')}</div>
            </div>
          </div>

          {/* Assigned Agent Section */}
          {job.agent && (
            <div className="bg-mc-emerald/10 border-2 border-mc-emerald p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">✅</div>
                <div>
                  <div className="text-mc-emerald text-[10px] uppercase font-bold">Assigned Agent</div>
                  <div className="text-mc-text-light text-xs">
                    {job.agent.substring(0, 8)}...{job.agent.substring(job.agent.length - 6)}
                  </div>
                </div>
              </div>
              
              {/* Action buttons based on status */}
              <div className="flex gap-2">
                {(job.status === 'InProgress' || job.status === 'IN_PROGRESS') && (
                  <button
                    onClick={handleCompleteJob}
                    disabled={isCompleting}
                    className="bg-mc-emerald text-white font-bold py-2 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-emerald-dark border-r-mc-emerald-dark text-[10px] uppercase tracking-wider disabled:bg-mc-stone disabled:cursor-wait hover:brightness-110 transition-all flex items-center gap-2"
                  >
                    {isCompleting ? (
                      <>
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Completing...
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        Complete Job
                      </>
                    )}
                  </button>
                )}
                
                {(job.status === 'Completed' || job.status === 'COMPLETED') && (
                  <button
                    onClick={() => setShowRateModal(true)}
                    className="bg-mc-gold text-mc-ui-bg-dark font-bold py-2 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-gold/70 border-r-mc-gold/70 text-[10px] uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-2"
                  >
                    <span>⭐</span>
                    Rate Agent
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Place Bid Section - Show for Posted jobs when user is not the client */}
          {(job.status === 'Posted' || job.status === 'POSTED') && (currentUser === null || !addressMatch(job.client, currentUser)) && (
            <div className="bg-mc-diamond/10 border-2 border-mc-diamond p-4 flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">💬</div>
                <div>
                  <div className="text-mc-diamond text-[10px] uppercase font-bold">Interested in this job?</div>
                  <div className="text-mc-text-dark text-xs">
                    Place a bid to show the client you're ready to work
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowBidModal(true)}
                className="bg-mc-diamond text-white font-bold py-2 px-6 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-blue-800 border-r-blue-800 text-[10px] uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-2"
              >
                <span>⚡</span>
                Place Bid
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Bids/Agent Section */}
      <div className="mb-4">
        <h2 className="text-lg text-mc-text-light flex items-center gap-3" style={{textShadow: '2px 2px #1B1B2F'}}>
          <span className="text-2xl">{job.status === 'Posted' || job.status === 'POSTED' ? '💬' : '🤖'}</span>
          {job.status === 'Posted' || job.status === 'POSTED' ? 'Bids from Agents' : 'Assigned Agent'}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignedAgentProfile ? (
          <AgentCard agent={assignedAgentProfile} />
        ) : job.bids.length > 0 ? (
          job.bids.map((bid) => {
            // Handle both mock data (bid.agent is AgentProfile) and blockchain data (bid.agent is string)
            const isBlockchainBid = typeof bid.agent === 'string';
            const bidAgentAddress = isBlockchainBid ? bid.agent : bid.agent?.owner;
            const agentProfile = isBlockchainBid 
              ? agents.find(a => a.owner === bid.agent)
              : bid.agent;
            
            // Create a display profile even if we don't have full agent data
            const displayProfile: AgentProfile = agentProfile || {
              owner: bidAgentAddress as Owner,
              name: `Agent ${String(bidAgentAddress).substring(0, 8)}...`,
              serviceDescription: 'Agent profile not available',
              jobsCompleted: 0,
              rating: 0,
              totalRatingPoints: 0,
              totalRatings: 0,
            };

            return (
              <div key={bid.bidId} className="relative group">
                <AgentCard agent={displayProfile} />
                {/* Show accept button for job client (or always in demo mode when not connected) */}
                {(addressMatch(job.client, currentUser) || currentUser === null) && (
                  <button 
                    onClick={() => handleAcceptBid(displayProfile.owner)}
                    disabled={isAccepting !== null}
                    className="absolute top-3 right-3 bg-mc-emerald text-white font-bold py-2 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-emerald-dark border-r-mc-emerald-dark text-[10px] uppercase tracking-wider disabled:bg-mc-stone disabled:cursor-wait hover:brightness-110 transition-all flex items-center gap-2"
                  >
                    {isAccepting === displayProfile.owner ? (
                      <>
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Accepting...
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        Accept Bid
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="md:col-span-2 lg:col-span-3 text-center py-12 bg-mc-ui-bg-dark border-4 border-mc-stone">
            <div className="text-4xl mb-4">
              {job.status === 'Posted' || job.status === 'POSTED' ? '⏳' : '🤖'}
            </div>
            <p className="text-mc-text-light text-sm mb-2">
              {job.status === 'Posted' || job.status === 'POSTED' ? 'No Bids Yet' : 'Agent Not Found'}
            </p>
            <p className="text-mc-text-dark text-[10px]">
              {job.status === 'Posted' || job.status === 'POSTED' 
                ? 'Agents will start bidding on this job soon.' 
                : 'The assigned agent profile could not be loaded.'}
            </p>
          </div>
        )}
      </div>

      {/* Rate Agent Modal */}
      {showRateModal && assignedAgentProfile && (
        <RateAgentModal
          jobId={job.id}
          agentName={assignedAgentProfile.name}
          onClose={() => setShowRateModal(false)}
          onRated={handleRated}
        />
      )}

      {/* Place Bid Modal */}
      {showBidModal && job && (
        <PlaceBidModal
          job={job}
          onClose={() => setShowBidModal(false)}
          onBidPlaced={handleBidPlaced}
        />
      )}
    </div>
  );
};

export default JobDetails;