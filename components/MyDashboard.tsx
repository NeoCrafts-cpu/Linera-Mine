import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUserAddress } from '../services/api';
import { Job, AgentProfile, Owner } from '../types';
import { JobCard } from './JobCard';
import { Spinner } from './Spinner';
import * as backendApi from '../services/backendApi';

interface MyDashboardProps {
  onSelectJob: (jobId: number) => void;
}

type TabType = 'posted' | 'working' | 'bids' | 'completed';

const MyDashboard: React.FC<MyDashboardProps> = ({ onSelectJob }) => {
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [workingJobs, setWorkingJobs] = useState<Job[]>([]);
  const [biddedJobs, setBiddedJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [myAgentProfile, setMyAgentProfile] = useState<AgentProfile | null>(null);
  const [agentJobHistory, setAgentJobHistory] = useState<Job[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [agentStats, setAgentStats] = useState<{ totalEarned: number; jobsCompleted: number; activeJobCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('posted');
  
  // Get current user address - check MetaMask wallet first
  const currentUser = localStorage.getItem('linera_mine_web3_address') 
    || localStorage.getItem('linera_user_address')
    || getCurrentUserAddress();

  const fetchData = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch user-specific data from backend
      const [userJobsData, userAgentData] = await Promise.all([
        backendApi.getUserJobs(currentUser),
        backendApi.getUserAgent(currentUser),
      ]);
      
      console.log('✅ Fetched user data:', {
        posted: userJobsData.totals.posted,
        working: userJobsData.totals.working,
        bids: userJobsData.totals.bids,
        completed: userJobsData.totals.completedJobs,
        earned: userJobsData.earnings.totalEarned,
        spent: userJobsData.earnings.totalSpent,
        agent: userAgentData.isRegistered,
      });

      // Separate jobs by status
      const posted = userJobsData.postedJobs || [];
      const working = (userJobsData.agentJobs || []).filter(j => {
        const s = String(j.status).toUpperCase().replace(/_/g, '');
        return s === 'INPROGRESS' || s === 'PENDINGAPPROVAL';
      });
      const bidded = userJobsData.bidJobs || [];
      
      // Completed jobs from both sides
      const completed = [
        ...(userJobsData.completedAsAgent || []),
        ...(userJobsData.completedAsClient || []),
      ];
      // Deduplicate by id
      const seen = new Set<number>();
      const uniqueCompleted = completed.filter(j => {
        if (seen.has(j.id)) return false;
        seen.add(j.id);
        return true;
      });

      setPostedJobs(posted);
      setWorkingJobs(working);
      setBiddedJobs(bidded);
      setCompletedJobs(uniqueCompleted);
      
      // Use earnings from backend (calculated server-side)
      setTotalEarned(userJobsData.earnings?.totalEarned || 0);
      setTotalSpent(userJobsData.earnings?.totalSpent || 0);
      
      // Agent profile + job history
      setMyAgentProfile(userAgentData.agent);
      setAgentJobHistory(userAgentData.jobHistory || []);
      setAgentStats(userAgentData.stats || null);
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setPostedJobs([]);
      setWorkingJobs([]);
      setBiddedJobs([]);
      setCompletedJobs([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      case 'posted': return postedJobs;
      case 'working': return workingJobs;
      case 'bids': return biddedJobs;
      case 'completed': return completedJobs;
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
        {currentUser && (
          <div className="mt-2 px-3 py-2 bg-mc-stone/30 border border-mc-stone inline-block">
            <span className="text-mc-text-dark text-[9px]">Logged in as: </span>
            <span className="text-mc-diamond text-[10px] font-mono">
              {currentUser.substring(0, 10)}...{currentUser.substring(currentUser.length - 8)}
            </span>
          </div>
        )}
        {!currentUser && (
          <div className="mt-2 px-3 py-2 bg-mc-redstone/20 border border-mc-redstone inline-block">
            <span className="text-mc-redstone text-[10px]">⚠️ Not connected - Connect wallet to see your jobs</span>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-mc-ui-bg-dark border-4 border-mc-stone p-4">
          <div className="text-mc-text-dark text-[8px] uppercase mb-1">Posted Jobs</div>
          <div className="text-mc-gold text-2xl font-bold">{postedJobs.length}</div>
        </div>
        <div className="bg-mc-ui-bg-dark border-4 border-mc-stone p-4">
          <div className="text-mc-text-dark text-[8px] uppercase mb-1">Active Work</div>
          <div className="text-mc-diamond text-2xl font-bold">{workingJobs.length}</div>
        </div>
        <div className="bg-mc-ui-bg-dark border-4 border-mc-stone p-4">
          <div className="text-mc-text-dark text-[8px] uppercase mb-1">Completed</div>
          <div className="text-mc-amethyst text-2xl font-bold">{completedJobs.length}</div>
        </div>
        <div className="bg-mc-ui-bg-dark border-4 border-mc-emerald p-4">
          <div className="text-mc-text-dark text-[8px] uppercase mb-1">Total Earned</div>
          <div className="text-mc-emerald text-2xl font-bold flex items-center gap-1">
            💎 {totalEarned.toLocaleString()}
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-mc-diamond/20 rounded-sm border-2 border-mc-diamond flex items-center justify-center">
                <span className="text-3xl">🤖</span>
              </div>
              <div>
                <h3 className="text-mc-text-light text-lg font-bold" style={{textShadow: '2px 2px #1B1B2F'}}>
                  {myAgentProfile.name}
                </h3>
                <p className="text-mc-text-dark text-[10px]">{myAgentProfile.serviceDescription}</p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="text-mc-gold text-[10px]">⭐ {(myAgentProfile.rating || 0).toFixed(1)}</span>
                  <span className="text-mc-text-dark text-[10px]">|</span>
                  <span className="text-mc-emerald text-[10px]">✓ {agentStats?.jobsCompleted || myAgentProfile.jobsCompleted || 0} jobs completed</span>
                  <span className="text-mc-text-dark text-[10px]">|</span>
                  <span className="text-mc-diamond text-[10px]">💎 {(agentStats?.totalEarned || myAgentProfile.totalEarned || 0).toLocaleString()} earned</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-mc-text-dark text-[8px] uppercase">Agent Status</div>
              <div className="text-mc-emerald text-sm font-bold">Active</div>
              {agentStats && agentStats.activeJobCount > 0 && (
                <div className="text-mc-diamond text-[9px] mt-1">{agentStats.activeJobCount} active job(s)</div>
              )}
            </div>
          </div>

          {/* Agent Job History */}
          {agentJobHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t-2 border-mc-stone">
              <div className="text-mc-text-dark text-[8px] uppercase mb-2">📋 Recent Completed Jobs as Agent</div>
              <div className="space-y-2">
                {agentJobHistory.slice(0, 5).map(j => (
                  <div key={j.id}
                    onClick={() => onSelectJob(j.id)}
                    className="flex items-center justify-between bg-mc-stone/20 p-2 border border-mc-stone hover:border-mc-diamond cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-mc-emerald text-[10px]">✓</span>
                      <span className="text-mc-text-light text-[10px]">
                        {(j as any).title || `Job #${j.id}`}
                      </span>
                    </div>
                    <span className="text-mc-emerald text-[10px] font-bold">
                      💎 {Number((j as any).earnedAmount || (j as any).acceptedBidAmount || j.payment || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-mc-ui-bg-dark border-4 border-mc-stone">
        <div className="flex border-b-2 border-mc-stone overflow-x-auto">
          <TabButton tab="posted" label="My Posted Jobs" count={postedJobs.length} icon="📝" />
          <TabButton tab="working" label="Active Work" count={workingJobs.length} icon="⚡" />
          <TabButton tab="bids" label="My Bids" count={biddedJobs.length} icon="💬" />
          <TabButton tab="completed" label="Completed" count={completedJobs.length} icon="✅" />
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
