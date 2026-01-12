/**
 * @deprecated This file is deprecated and should be deleted.
 * Demo mode has been removed - the app now operates blockchain-only.
 * This file is excluded from TypeScript compilation via tsconfig.json.
 * 
 * TODO: Delete this file when able to modify filesystem.
 */

/**
 * Local Storage Service
 * 
 * Provides offline/demo mode functionality by storing jobs and agents locally.
 * This is used when Linera service is not available but users want to demo the app.
 * 
 * Data syncs with blockchain when linera service becomes available.
 */

import { AgentProfile, Job, JobStatus, Owner, Bid, Milestone, MilestoneStatus } from '../types';

const STORAGE_KEYS = {
  JOBS: 'linera_marketplace_jobs',
  AGENTS: 'linera_marketplace_agents',
  JOB_COUNTER: 'linera_marketplace_job_counter',
  MODE: 'linera_marketplace_mode', // 'demo' | 'live'
};

// ==================== DEMO MODE STATUS ====================

export type AppMode = 'demo' | 'live' | 'connecting';

export function getAppMode(): AppMode {
  return (localStorage.getItem(STORAGE_KEYS.MODE) as AppMode) || 'demo';
}

export function setAppMode(mode: AppMode): void {
  localStorage.setItem(STORAGE_KEYS.MODE, mode);
}

// ==================== JOBS STORAGE ====================

function getNextJobId(): number {
  const current = parseInt(localStorage.getItem(STORAGE_KEYS.JOB_COUNTER) || '1', 10);
  localStorage.setItem(STORAGE_KEYS.JOB_COUNTER, (current + 1).toString());
  return current;
}

export function getLocalJobs(): Job[] {
  const stored = localStorage.getItem(STORAGE_KEYS.JOBS);
  if (!stored) return getDefaultDemoJobs();
  
  try {
    return JSON.parse(stored) as Job[];
  } catch {
    return getDefaultDemoJobs();
  }
}

export function saveLocalJobs(jobs: Job[]): void {
  localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
}

export function addLocalJob(job: Omit<Job, 'id' | 'createdAt' | 'bids'>): Job {
  const jobs = getLocalJobs();
  const newJob: Job = {
    ...job,
    id: getNextJobId(),
    createdAt: Date.now(),
    bids: [],
  };
  jobs.unshift(newJob); // Add to beginning
  saveLocalJobs(jobs);
  return newJob;
}

export function updateLocalJob(id: number, updates: Partial<Job>): Job | undefined {
  const jobs = getLocalJobs();
  const index = jobs.findIndex(j => j.id === id);
  if (index === -1) return undefined;
  
  jobs[index] = { ...jobs[index], ...updates };
  saveLocalJobs(jobs);
  return jobs[index];
}

export function getLocalJobById(id: number): Job | undefined {
  const jobs = getLocalJobs();
  return jobs.find(j => j.id === id);
}

export function addBidToLocalJob(jobId: number, bid: Bid): Job | undefined {
  const jobs = getLocalJobs();
  const job = jobs.find(j => j.id === jobId);
  if (!job) return undefined;
  
  job.bids = job.bids || [];
  job.bids.push({
    ...bid,
    bidId: job.bids.length + 1,
    timestamp: Date.now(),
  });
  
  saveLocalJobs(jobs);
  return job;
}

// ==================== AGENTS STORAGE ====================

export function getLocalAgents(): AgentProfile[] {
  const stored = localStorage.getItem(STORAGE_KEYS.AGENTS);
  if (!stored) return getDefaultDemoAgents();
  
  try {
    return JSON.parse(stored) as AgentProfile[];
  } catch {
    return getDefaultDemoAgents();
  }
}

export function saveLocalAgents(agents: AgentProfile[]): void {
  localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
}

export function addLocalAgent(agent: AgentProfile): AgentProfile {
  const agents = getLocalAgents();
  // Check if agent already exists
  const existingIndex = agents.findIndex(a => a.owner === agent.owner);
  if (existingIndex >= 0) {
    agents[existingIndex] = agent;
  } else {
    agents.push(agent);
  }
  saveLocalAgents(agents);
  return agent;
}

export function getLocalAgentByOwner(owner: Owner): AgentProfile | undefined {
  const agents = getLocalAgents();
  return agents.find(a => a.owner === owner);
}

export function updateLocalAgent(owner: Owner, updates: Partial<AgentProfile>): AgentProfile | undefined {
  const agents = getLocalAgents();
  const index = agents.findIndex(a => a.owner === owner);
  if (index === -1) return undefined;
  
  agents[index] = { ...agents[index], ...updates };
  saveLocalAgents(agents);
  return agents[index];
}

// ==================== DEFAULT DEMO DATA ====================

function getDefaultDemoJobs(): Job[] {
  const demoClient = '0x' + 'demo'.repeat(16) as Owner;
  
  return [
    {
      id: 1,
      client: demoClient,
      title: 'Build AI-Powered Trading Bot',
      description: 'Looking for an experienced developer to create an AI trading bot that can analyze market trends and execute trades automatically. Must have experience with ML/AI and financial markets.',
      payment: 5000,
      status: 'open' as JobStatus,
      category: 'Development',
      tags: ['AI', 'Python', 'Trading', 'Machine Learning'],
      bids: [],
      createdAt: Date.now() - 86400000 * 2, // 2 days ago
      milestones: [],
    },
    {
      id: 2,
      client: demoClient,
      title: 'Smart Contract Security Audit',
      description: 'Need a comprehensive security audit for our DeFi smart contracts. Looking for auditors with proven track record.',
      payment: 3000,
      status: 'open' as JobStatus,
      category: 'Security',
      tags: ['Solidity', 'Audit', 'DeFi', 'Security'],
      bids: [],
      createdAt: Date.now() - 86400000, // 1 day ago
      milestones: [],
    },
    {
      id: 3,
      client: demoClient,
      title: 'Create NFT Marketplace Frontend',
      description: 'Design and develop a modern NFT marketplace frontend using React and Web3. Must integrate with multiple chains.',
      payment: 4500,
      status: 'open' as JobStatus,
      category: 'Design',
      tags: ['React', 'Web3', 'NFT', 'Frontend'],
      bids: [],
      createdAt: Date.now() - 3600000 * 5, // 5 hours ago
      milestones: [],
    },
  ];
}

function getDefaultDemoAgents(): AgentProfile[] {
  return [
    {
      owner: ('0x' + 'agent1'.padEnd(64, '0')) as Owner,
      name: 'Alex Developer',
      serviceDescription: 'Full-stack blockchain developer with 5+ years experience in DeFi and NFT projects.',
      jobsCompleted: 47,
      rating: 4.9,
      totalRatingPoints: 230,
      totalRatings: 47,
      registeredAt: Date.now() - 86400000 * 180,
      skills: ['Solidity', 'Rust', 'React', 'Node.js', 'Web3'],
      hourlyRate: 150,
      availability: true,
      verificationLevel: 'verified',
    },
    {
      owner: ('0x' + 'agent2'.padEnd(64, '0')) as Owner,
      name: 'Sarah Security',
      serviceDescription: 'Smart contract auditor and security researcher. Previously at major security firms.',
      jobsCompleted: 32,
      rating: 5.0,
      totalRatingPoints: 160,
      totalRatings: 32,
      registeredAt: Date.now() - 86400000 * 120,
      skills: ['Security', 'Audit', 'Solidity', 'Formal Verification'],
      hourlyRate: 200,
      availability: true,
      verificationLevel: 'premium',
    },
    {
      owner: ('0x' + 'agent3'.padEnd(64, '0')) as Owner,
      name: 'Mike ML Engineer',
      serviceDescription: 'AI/ML specialist focusing on trading algorithms and data analysis.',
      jobsCompleted: 28,
      rating: 4.7,
      totalRatingPoints: 131,
      totalRatings: 28,
      registeredAt: Date.now() - 86400000 * 90,
      skills: ['Python', 'TensorFlow', 'ML', 'Data Science', 'Trading'],
      hourlyRate: 175,
      availability: true,
      verificationLevel: 'verified',
    },
  ];
}

// ==================== CLEAR/RESET ====================

export function clearLocalData(): void {
  localStorage.removeItem(STORAGE_KEYS.JOBS);
  localStorage.removeItem(STORAGE_KEYS.AGENTS);
  localStorage.removeItem(STORAGE_KEYS.JOB_COUNTER);
  console.log('🗑️ Local marketplace data cleared');
}

export function resetToDemo(): void {
  clearLocalData();
  setAppMode('demo');
  console.log('🔄 Reset to demo mode with fresh data');
}
