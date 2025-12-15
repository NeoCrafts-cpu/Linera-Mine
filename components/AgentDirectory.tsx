import React, { useState, useEffect, useCallback } from 'react';
import { getAgents, getAgentsFromChain, isLineraEnabled } from '../services/api';
import { AgentProfile, Owner } from '../types';
import { AgentCard } from './AgentCard';
import { Spinner } from './Spinner';
import { RegisterAgentModal } from './RegisterAgentModal';
import LineraStatus from './LineraStatus';

interface AgentDirectoryProps {
  onSelectAgent?: (agentOwner: Owner) => void;
}

const AgentDirectory: React.FC<AgentDirectoryProps> = ({ onSelectAgent }) => {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'jobs' | 'name'>('rating');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      let agentData: AgentProfile[];
      
      if (isLineraEnabled()) {
        agentData = await getAgentsFromChain();
      } else {
        agentData = await getAgents();
      }
      
      setAgents(agentData);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleAgentRegistered = useCallback(() => {
    setTimeout(() => {
      fetchAgents();
    }, 1000);
  }, [fetchAgents]);

  // Filter and sort agents
  const filteredAgents = agents
    .filter(agent => 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.serviceDescription.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'jobs': return b.jobsCompleted - a.jobsCompleted;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

  // Stats
  const avgRating = agents.length > 0 
    ? (agents.reduce((sum, a) => sum + a.rating, 0) / agents.length).toFixed(1)
    : '0.0';
  const totalJobs = agents.reduce((sum, a) => sum + a.jobsCompleted, 0);

  return (
    <div className="py-4">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl text-mc-text-light flex items-center gap-3" style={{textShadow: '3px 3px #1B1B2F'}}>
              <span className="text-3xl">🤖</span>
              Agent Directory
            </h1>
            <p className="text-mc-text-dark text-[10px] mt-1">
              Discover autonomous agents ready to work on the Linera network
            </p>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="mc-btn bg-mc-diamond hover:bg-mc-diamond-dark text-mc-ui-bg-dark py-3 px-6 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-diamond-dark border-r-mc-diamond-dark text-xs font-bold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
            Register as Agent
          </button>
        </div>

        {/* Connection Status Bar */}
        <LineraStatus />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-mc-ui-bg-dark border-2 border-mc-stone p-4 text-center">
          <div className="text-2xl mb-1">🤖</div>
          <div className="text-xl text-mc-diamond font-bold">{agents.length}</div>
          <div className="text-[9px] text-mc-text-dark uppercase">Total Agents</div>
        </div>
        <div className="bg-mc-ui-bg-dark border-2 border-mc-stone p-4 text-center">
          <div className="text-2xl mb-1">⭐</div>
          <div className="text-xl text-mc-gold font-bold">{avgRating}</div>
          <div className="text-[9px] text-mc-text-dark uppercase">Avg Rating</div>
        </div>
        <div className="bg-mc-ui-bg-dark border-2 border-mc-stone p-4 text-center">
          <div className="text-2xl mb-1">✅</div>
          <div className="text-xl text-mc-emerald font-bold">{totalJobs}</div>
          <div className="text-[9px] text-mc-text-dark uppercase">Jobs Done</div>
        </div>
        <div className="bg-mc-ui-bg-dark border-2 border-mc-stone p-4 text-center">
          <div className="text-2xl mb-1">🔒</div>
          <div className="text-xl text-mc-amethyst font-bold">{agents.filter(a => a.verified).length}</div>
          <div className="text-[9px] text-mc-text-dark uppercase">Verified</div>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="bg-mc-ui-bg-dark border-2 border-mc-stone p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-mc-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-mc-stone text-mc-text-light text-[10px] pl-10 pr-4 py-3 border-2 border-mc-ui-border-dark focus:outline-none focus:border-mc-diamond placeholder-mc-text-dark"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-mc-text-dark text-[9px] uppercase">Sort by:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'jobs' | 'name')}
              className="bg-mc-stone text-mc-text-light text-[10px] px-3 py-2 border-2 border-mc-ui-border-dark focus:outline-none focus:border-mc-diamond cursor-pointer"
            >
              <option value="rating">⭐ Highest Rating</option>
              <option value="jobs">✅ Most Jobs</option>
              <option value="name">📝 Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 bg-mc-ui-bg-dark/50 border-2 border-mc-stone">
          <Spinner />
          <p className="text-mc-text-dark text-[10px] mt-4 animate-pulse">Loading agents from chain...</p>
        </div>
      ) : filteredAgents.length > 0 ? (
        <>
          {/* Results count */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-mc-text-dark text-[10px]">
              Showing <span className="text-mc-diamond">{filteredAgents.length}</span> of {agents.length} agents
            </p>
            <button 
              onClick={fetchAgents}
              className="text-mc-text-dark hover:text-mc-diamond text-[10px] flex items-center gap-1 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <AgentCard 
                key={agent.owner} 
                agent={agent} 
                onSelect={onSelectAgent ? () => onSelectAgent(agent.owner) : undefined}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 bg-mc-ui-bg-dark border-4 border-mc-stone">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-mc-text-light text-sm mb-2">
            {searchTerm ? 'No Agents Found' : 'No Agents Yet'}
          </p>
          <p className="text-mc-text-dark text-[10px]">
            {searchTerm 
              ? `No agents match "${searchTerm}". Try a different search.`
              : "Be the first to register as an agent on Linera Mine!"}
          </p>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-4 text-mc-diamond text-[10px] hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      )}
      
      <RegisterAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRegistered={handleAgentRegistered}
      />
    </div>
  );
};

export default AgentDirectory;