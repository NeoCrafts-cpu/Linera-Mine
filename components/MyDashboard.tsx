import React, { useState, useEffect, useCallback } from 'react';
import { getJobs, getJobsFromChain, getAgents, getAgentsFromChain, isLineraEnabled, getCurrentUserAddress } from '../services/api';
import { Job, AgentProfile, JobStatus, Owner } from '../types';
import { JobCard } from './JobCard';
import { Spinner } from './Spinner';
import { JobStatusBadge } from './JobStatusBadge';

interface MyDashboardProps {
  onSelectJob: (jobId: number) => void;
}

type TabType = 'posted' | 'working' | 'bids' | 'completed';

const MyDashboard: React.FC<MyDashboardProps> = ({ onSelectJob }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('posted');
  
  const currentUser = getCurrentUserAddress();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [jobsData, agentsData] = await Promise.all([
        isLineraEnabled() ? getJobsFromChain() : getJobs(),
        isLineraEnabled() ? getAgentsFromChain() : getAgents(),
      ]);
      setJobs(jobsData);
      setAgents(agentsData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter jobs by category
  const myPostedJobs = jobs.filter(j => j.client === currentUser);
  const myWorkingJobs = jobs.filter(j => j.agent === currentUser && (j.status === JobStatus.InProgress || j.status === 'InProgress' as any));
  const myBiddedJobs = jobs.filter(j => 
    j.bids.some(bid => {
      const bidAgent = typeof bid.agent === 'string' ? bid.agent : bid.agent?.owner;
      return bidAgent === currentUser;
    })
  );
  const myCompletedJobs = jobs.filter(j => 
    (j.client === currentUser || j.agent === currentUser) && 
    (j.status === JobStatus.Completed || j.status === 'Completed' as any || j.status === 'COMPLETED')
  );

  // Get current user's agent profile
  const myAgentProfile = agents.find(a => a.owner === currentUser);

  // Stats
  const totalEarnings = myCompletedJobs
    .filter(j => j.agent === currentUser)
    .reduce((sum, j) => sum + j.payment, 0);
  const totalSpent = myCompletedJobs
    .filter(j => j.client === currentUser)
    .reduce((sum, j) => sum + j.payment, 0);

  const TabButton: React.FC<{ tab: TabType; label: string; count: number; icon: string }> = ({ tab, label, count, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-3 text-[10px] uppercase tracking-wider transition-all border-b-4 ${
        activeTab === tab
          ? 'bg-mc-stone/50 text-mc-text-light border-mc-diamond'
          : 'text-mc-text-dark border-transparent hover:text-mc-text-light hover:bg-mc-stone/30'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      <span className={`px-2 py-0.5 rounded-sm text-[8px] ${
        activeTab === tab ? 'bg-mc-diamond text-white' : 'bg-mc-stone/50'
      }`}>
        {count}
      </span>
    </button>
  );

  const getActiveJobs = () => {
    switch (activeTab) {
      case 'posted': return myPostedJobs;
      case 'working': return myWorkingJobs;
      case 'bids': return myBiddedJobs;
      case 'completed': return myCompletedJobs;
      default: return [];
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'posted': return { icon: '📝', title: 'No Jobs Posted', desc: 'Post your first job to get started!' };
      case 'working': return { icon: '⚡', title: 'No Active Work', desc: 'Bid on jobs to start working' };
      case 'bids': return { icon: '💬', title: 'No Active Bids', desc: 'Browse the marketplace and place bids' };
      case 'completed': return { icon: '✅', title: 'No Completed Jobs', desc: 'Complete jobs to see them here' };
      default: return { icon: '📋', title: 'No Data', desc: '' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-mc-ui-bg-dark/50 border-2 border-mc-stone">
        <Spinner />
        <p className="text-mc-text-dark text-[10px] mt-4 animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl text-mc-text-light flex items-center gap-3" style={{textShadow: '3px 3px #1B1B2F'}}>
          <span className="text-3xl">📊</span>
          My Dashboard
        </h1>
        <p className="text-mc-text-dark text-[10px] mt-1">
          Track your jobs, bids, and earnings
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-mc-ui-bg-dark border-4 border-mc-stone p-4">
          <div className="text-mc-text-dark text-[8px] uppercase mb-1">Posted Jobs</div>
          <div className="text-mc-gold text-2xl font-bold">{myPostedJobs.length}</div>
        </div>
        <div className="bg-mc-ui-bg-dark border-4 border-mc-stone p-4">
          <div className="text-mc-text-dark text-[8px] uppercase mb-1">Active Work</div>
          <div className="text-mc-diamond text-2xl font-bold">{myWorkingJobs.length}</div>
        </div>
        <div className="bg-mc-ui-bg-dark border-4 border-mc-stone p-4">
          <div className="text-mc-text-dark text-[8px] uppercase mb-1">Total Earned</div>
          <div className="text-mc-emerald text-2xl font-bold flex items-center gap-1">
            💎 {totalEarnings.toLocaleString()}
          </div>
        </div>
        <div className="bg-mc-ui-bg-dark border-4 border-mc-stone p-4">
          <div className="text-mc-text-dark text-[8px] uppercase mb-1">Total Spent</div>
          <div className="text-mc-redstone text-2xl font-bold flex items-center gap-1">
            💎 {totalSpent.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Agent Profile Summary */}
      {myAgentProfile && (
        <div className="bg-mc-ui-bg-dark border-4 border-mc-diamond mb-8 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-mc-diamond/20 rounded-sm border-2 border-mc-diamond flex items-center justify-center">
                <span className="text-3xl">🤖</span>
              </div>
              <div>
                <h3 className="text-mc-text-light text-lg font-bold" style={{textShadow: '2px 2px #1B1B2F'}}>
                  {myAgentProfile.name}
                </h3>
                <p className="text-mc-text-dark text-[10px]">{myAgentProfile.serviceDescription}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-mc-gold text-[10px]">⭐ {myAgentProfile.rating.toFixed(1)}</span>
                  <span className="text-mc-text-dark text-[10px]">|</span>
                  <span className="text-mc-emerald text-[10px]">✓ {myAgentProfile.jobsCompleted} jobs</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-mc-text-dark text-[8px] uppercase">Agent Status</div>
              <div className="text-mc-emerald text-sm font-bold">Active</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-mc-ui-bg-dark border-4 border-mc-stone">
        <div className="flex border-b-2 border-mc-stone overflow-x-auto">
          <TabButton tab="posted" label="My Posted Jobs" count={myPostedJobs.length} icon="📝" />
          <TabButton tab="working" label="Active Work" count={myWorkingJobs.length} icon="⚡" />
          <TabButton tab="bids" label="My Bids" count={myBiddedJobs.length} icon="💬" />
          <TabButton tab="completed" label="Completed" count={myCompletedJobs.length} icon="✅" />
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {getActiveJobs().length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getActiveJobs().map(job => (
                <JobCard key={job.id} job={job} onSelectJob={onSelectJob} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">{getEmptyMessage().icon}</div>
              <p className="text-mc-text-light text-sm mb-2">{getEmptyMessage().title}</p>
              <p className="text-mc-text-dark text-[10px]">{getEmptyMessage().desc}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyDashboard;
