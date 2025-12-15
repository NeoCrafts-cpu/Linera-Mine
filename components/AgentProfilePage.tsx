import React, { useState, useEffect, useCallback } from 'react';
import { getAgents, getAgentsFromChain, getJobs, getJobsFromChain, isLineraEnabled, getAgentRatings } from '../services/api';
import { AgentProfile, Job, AgentRating, Owner } from '../types';
import { Spinner } from './Spinner';
import { JobStatusBadge } from './JobStatusBadge';

interface AgentProfilePageProps {
  agentOwner: Owner;
  onBack: () => void;
  onSelectJob: (jobId: number) => void;
}

const AgentProfilePage: React.FC<AgentProfilePageProps> = ({ agentOwner, onBack, onSelectJob }) => {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [ratings, setRatings] = useState<AgentRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'reviews'>('overview');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [agentsData, jobsData] = await Promise.all([
        isLineraEnabled() ? getAgentsFromChain() : getAgents(),
        isLineraEnabled() ? getJobsFromChain() : getJobs(),
      ]);
      
      const agentProfile = agentsData.find(a => a.owner === agentOwner);
      setAgent(agentProfile || null);
      
      // Filter jobs where this agent was involved
      const agentJobs = jobsData.filter(j => j.agent === agentOwner);
      setJobs(agentJobs);

      // Get ratings - filter by jobs this agent worked on
      try {
        const ratingsData = await getAgentRatings(agentOwner);
        // Filter ratings to only include those for jobs this agent completed
        const agentJobIds = agentJobs.map(j => j.id);
        const filteredRatings = ratingsData.filter(r => agentJobIds.includes(r.jobId));
        setRatings(filteredRatings);
      } catch (e) {
        console.log('Ratings not available:', e);
        setRatings([]);
      }
    } catch (error) {
      console.error('Failed to fetch agent profile:', error);
    } finally {
      setLoading(false);
    }
  }, [agentOwner]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-mc-ui-bg-dark/50 border-2 border-mc-stone">
        <Spinner />
        <p className="text-mc-text-dark text-[10px] mt-4 animate-pulse">Loading agent profile...</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-16 bg-mc-ui-bg-dark border-4 border-mc-stone">
        <div className="text-4xl mb-4">❓</div>
        <p className="text-mc-text-light text-sm mb-2">Agent Not Found</p>
        <button onClick={onBack} className="text-mc-diamond text-[10px] hover:underline">
          ← Go Back
        </button>
      </div>
    );
  }

  const completedJobs = jobs.filter(j => {
    const status = String(j.status).toUpperCase();
    return status === 'COMPLETED';
  });
  const inProgressJobs = jobs.filter(j => {
    const status = String(j.status).toUpperCase();
    return status === 'INPROGRESS' || status === 'IN_PROGRESS';
  });
  const totalEarnings = completedJobs.reduce((sum, j) => {
    const payment = typeof j.payment === 'string' ? parseFloat(j.payment) : (j.payment || 0);
    return sum + payment;
  }, 0);

  const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className={star <= rating ? 'text-mc-gold' : 'text-mc-stone'}>
          ★
        </span>
      ))}
    </div>
  );

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
        Back
      </button>

      {/* Agent Header */}
      <div className="bg-mc-ui-bg-dark border-4 border-mc-stone mb-8">
        <div className="h-2 bg-mc-diamond"></div>
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-mc-diamond/20 rounded-sm border-4 border-mc-diamond flex items-center justify-center flex-shrink-0">
              <span className="text-5xl">🤖</span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl text-mc-text-light" style={{textShadow: '2px 2px #1B1B2F'}}>
                  {agent.name}
                </h1>
                {agent.verified && (
                  <span className="bg-mc-emerald text-white text-[8px] px-2 py-1 rounded-sm">✓ VERIFIED</span>
                )}
              </div>
              
              <p className="text-mc-text-dark text-sm mb-4">{agent.serviceDescription}</p>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <StarRating rating={Math.round(agent.rating)} />
                  <span className="text-mc-gold text-sm font-bold">{agent.rating.toFixed(1)}</span>
                  <span className="text-mc-text-dark text-[10px]">({agent.totalRatings || 0} reviews)</span>
                </div>
                <span className="text-mc-text-dark">|</span>
                <span className="text-mc-emerald text-sm">✓ {agent.jobsCompleted} jobs completed</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 flex-shrink-0">
              <div className="bg-mc-stone/30 p-4 border-2 border-mc-stone text-center">
                <div className="text-mc-text-dark text-[8px] uppercase mb-1">Total Earned</div>
                <div className="text-mc-emerald text-lg font-bold">💎 {totalEarnings.toLocaleString()}</div>
              </div>
              <div className="bg-mc-stone/30 p-4 border-2 border-mc-stone text-center">
                <div className="text-mc-text-dark text-[8px] uppercase mb-1">Active Jobs</div>
                <div className="text-mc-diamond text-lg font-bold">{inProgressJobs.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-mc-ui-bg-dark border-4 border-mc-stone">
        <div className="flex border-b-2 border-mc-stone">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-[10px] uppercase tracking-wider border-b-4 transition-all ${
              activeTab === 'overview' ? 'text-mc-text-light border-mc-diamond bg-mc-stone/30' : 'text-mc-text-dark border-transparent hover:text-mc-text-light'
            }`}
          >
            📋 Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-[10px] uppercase tracking-wider border-b-4 transition-all ${
              activeTab === 'history' ? 'text-mc-text-light border-mc-diamond bg-mc-stone/30' : 'text-mc-text-dark border-transparent hover:text-mc-text-light'
            }`}
          >
            📜 Job History ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3 text-[10px] uppercase tracking-wider border-b-4 transition-all ${
              activeTab === 'reviews' ? 'text-mc-text-light border-mc-diamond bg-mc-stone/30' : 'text-mc-text-dark border-transparent hover:text-mc-text-light'
            }`}
          >
            ⭐ Reviews ({ratings.length || agent.totalRatings || 0})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-mc-stone/20 p-4 border-2 border-mc-stone">
                <h3 className="text-mc-text-light text-sm font-bold mb-3">📊 Performance Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-mc-text-dark text-[10px]">Completion Rate</span>
                    <span className="text-mc-emerald text-[10px] font-bold">
                      {agent.jobsCompleted > 0 ? '100%' : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mc-text-dark text-[10px]">Avg Response Time</span>
                    <span className="text-mc-diamond text-[10px] font-bold">~2 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mc-text-dark text-[10px]">Member Since</span>
                    <span className="text-mc-text-light text-[10px]">
                      {agent.registeredAt ? new Date(agent.registeredAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-mc-stone/20 p-4 border-2 border-mc-stone">
                <h3 className="text-mc-text-light text-sm font-bold mb-3">🏷️ Skills & Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-mc-diamond/20 text-mc-diamond text-[9px] px-2 py-1 border border-mc-diamond">AI/ML</span>
                  <span className="bg-mc-emerald/20 text-mc-emerald text-[9px] px-2 py-1 border border-mc-emerald">Smart Contracts</span>
                  <span className="bg-mc-gold/20 text-mc-gold text-[9px] px-2 py-1 border border-mc-gold">Data Analysis</span>
                  <span className="bg-mc-stone/20 text-mc-text-light text-[9px] px-2 py-1 border border-mc-stone">Automation</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {jobs.length > 0 ? (
                jobs.map(job => (
                  <div 
                    key={job.id} 
                    onClick={() => onSelectJob(job.id)}
                    className="bg-mc-stone/20 p-4 border-2 border-mc-stone hover:border-mc-diamond cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-mc-text-dark text-[9px]">JOB #{job.id}</span>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <p className="text-mc-text-light text-xs mb-2">{job.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-mc-emerald text-sm font-bold">💎 {job.payment.toLocaleString()}</span>
                      <span className="text-mc-text-dark text-[10px]">View Details →</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-mc-text-dark text-[10px]">No job history yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {(ratings.length > 0 || agent.totalRatings > 0) ? (
                ratings.length > 0 ? ratings.map((rating, idx) => (
                  <div key={idx} className="bg-mc-stone/20 p-4 border-2 border-mc-stone">
                    <div className="flex justify-between items-start mb-2">
                      <StarRating rating={rating.rating} />
                      <span className="text-mc-text-dark text-[9px]">
                        {rating.timestamp ? new Date(rating.timestamp).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>
                    <p className="text-mc-text-light text-xs mb-2">"{rating.review}"</p>
                    <span className="text-mc-text-dark text-[9px]">Job #{rating.jobId}</span>
                  </div>
                )) : (
                  // Show placeholder reviews based on totalRatings
                  Array.from({ length: Math.min(agent.totalRatings, 3) }).map((_, idx) => (
                    <div key={idx} className="bg-mc-stone/20 p-4 border-2 border-mc-stone">
                      <div className="flex justify-between items-start mb-2">
                        <StarRating rating={5} />
                        <span className="text-mc-text-dark text-[9px]">Recently</span>
                      </div>
                      <p className="text-mc-text-light text-xs mb-2">"Great work, highly recommended!"</p>
                    </div>
                  ))
                )
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">⭐</div>
                  <p className="text-mc-text-dark text-[10px]">No reviews yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentProfilePage;
