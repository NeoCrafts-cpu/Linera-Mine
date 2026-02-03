/**
 * Backend API Service - File-based storage backend
 * 
 * Provides API access to the backend for:
 * - User authentication (wallet, email)
 * - Job storage and management
 * - Agent profiles and leaderboard
 * - Platform statistics
 * 
 * This mirrors the Linera-Dominion approach with REST API calls.
 */

import { Job, AgentProfile, JobCategory, JobStatus } from '../types';

// Get backend URL from environment or default to localhost
const getApiBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  return 'http://localhost:3001';
};

// Get stored auth token
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('linera_mine_auth_token');
  }
  return null;
};

// Store auth token
const setAuthToken = (token: string | null) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('linera_mine_auth_token', token);
    } else {
      localStorage.removeItem('linera_mine_auth_token');
    }
  }
};

// =============================================================================
// HTTP HELPERS
// =============================================================================

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`;
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return data as T;
}

// =============================================================================
// AUTH API
// =============================================================================

export interface AuthUser {
  id: string;
  email: string | null;
  chainId: string | null;
  address: string | null;
  createdAt?: number;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}

/**
 * Connect with wallet (creates user if needed)
 */
export async function connectWallet(chainId: string, address: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/api/auth/wallet', {
    method: 'POST',
    body: JSON.stringify({ chainId, address }),
  });

  if (response.token) {
    setAuthToken(response.token);
  }

  return response;
}

/**
 * Register with email/password
 */
export async function registerWithEmail(
  email: string,
  password: string,
  chainId?: string,
  address?: string
): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, chainId, address }),
  });

  if (response.token) {
    setAuthToken(response.token);
  }

  return response;
}

/**
 * Login with email/password
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (response.token) {
    setAuthToken(response.token);
  }

  return response;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!getAuthToken()) return null;

  try {
    const response = await apiRequest<{ success: boolean; user: AuthUser }>('/api/auth/me');
    return response.user;
  } catch {
    setAuthToken(null);
    return null;
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore errors
  }
  setAuthToken(null);
}

/**
 * Update wallet info for current user
 */
export async function updateWallet(chainId: string, address: string): Promise<AuthUser | null> {
  try {
    const response = await apiRequest<{ success: boolean; user: AuthUser }>('/api/wallet', {
      method: 'PUT',
      body: JSON.stringify({ chainId, address }),
    });
    return response.user;
  } catch {
    return null;
  }
}

// =============================================================================
// JOBS API
// =============================================================================

export interface JobsListResponse {
  jobs: Job[];
  total: number;
  filtered: number;
}

export interface JobResponse {
  job: Job;
  success?: boolean;
}

export interface BidData {
  agent: string;
  amount: number;
  proposal?: string;
  estimatedDays?: number;
}

/**
 * Get all jobs with optional filters
 */
export async function getJobs(filters?: {
  status?: JobStatus;
  category?: JobCategory;
  minPayment?: number;
  maxPayment?: number;
  limit?: number;
}): Promise<JobsListResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.minPayment) params.append('minPayment', filters.minPayment.toString());
  if (filters?.maxPayment) params.append('maxPayment', filters.maxPayment.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const query = params.toString();
  return apiRequest<JobsListResponse>(`/api/jobs${query ? `?${query}` : ''}`);
}

/**
 * Get single job by ID
 */
export async function getJob(id: number | string): Promise<Job | null> {
  try {
    const response = await apiRequest<{ job: Job }>(`/api/jobs/${id}`);
    return response.job;
  } catch {
    return null;
  }
}

/**
 * Create a new job
 */
export async function createJob(jobData: {
  title?: string;
  description: string;
  payment: number;
  category?: JobCategory;
  tags?: string[];
  client: string;
  milestones?: { title: string; payment: number }[];
}): Promise<Job> {
  const response = await apiRequest<{ success: boolean; job: Job }>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData),
  });
  return response.job;
}

/**
 * Update job
 */
export async function updateJob(id: number | string, updates: Partial<Job>): Promise<Job> {
  const response = await apiRequest<{ success: boolean; job: Job }>(`/api/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return response.job;
}

/**
 * Place a bid on a job
 */
export async function placeBid(jobId: number | string, bid: BidData): Promise<{ success: boolean; bid: any }> {
  return apiRequest(`/api/jobs/${jobId}/bid`, {
    method: 'POST',
    body: JSON.stringify(bid),
  });
}

/**
 * Accept a bid
 */
export async function acceptBid(
  jobId: number | string,
  agent: string,
  bidAmount: number
): Promise<Job> {
  const response = await apiRequest<{ success: boolean; job: Job }>(`/api/jobs/${jobId}/accept-bid`, {
    method: 'POST',
    body: JSON.stringify({ agent, bidAmount }),
  });
  return response.job;
}

/**
 * Complete a job
 */
export async function completeJob(jobId: number | string): Promise<Job> {
  const response = await apiRequest<{ success: boolean; job: Job }>(`/api/jobs/${jobId}/complete`, {
    method: 'POST',
  });
  return response.job;
}

/**
 * Delete a job
 */
export async function deleteJob(id: number | string): Promise<void> {
  await apiRequest(`/api/jobs/${id}`, { method: 'DELETE' });
}

// =============================================================================
// AGENTS API
// =============================================================================

export interface AgentsListResponse {
  agents: AgentProfile[];
  total: number;
}

export interface AgentResponse {
  agent: AgentProfile;
  success?: boolean;
}

/**
 * Get all agents with optional filters
 */
export async function getAgents(filters?: {
  skill?: string;
  minRating?: number;
  verified?: boolean;
}): Promise<AgentsListResponse> {
  const params = new URLSearchParams();
  if (filters?.skill) params.append('skill', filters.skill);
  if (filters?.minRating) params.append('minRating', filters.minRating.toString());
  if (filters?.verified !== undefined) params.append('verified', filters.verified.toString());

  const query = params.toString();
  return apiRequest<AgentsListResponse>(`/api/agents${query ? `?${query}` : ''}`);
}

/**
 * Get agent by owner address
 */
export async function getAgent(owner: string): Promise<AgentProfile | null> {
  try {
    const response = await apiRequest<{ agent: AgentProfile }>(`/api/agents/${owner}`);
    return response.agent;
  } catch {
    return null;
  }
}

/**
 * Register as an agent
 */
export async function registerAgent(agentData: {
  owner: string;
  name: string;
  serviceDescription: string;
  skills?: string[];
  hourlyRate?: number;
  portfolioUrls?: string[];
}): Promise<AgentProfile> {
  const response = await apiRequest<{ success: boolean; agent: AgentProfile }>('/api/agents', {
    method: 'POST',
    body: JSON.stringify(agentData),
  });
  return response.agent;
}

/**
 * Update agent profile
 */
export async function updateAgent(owner: string, updates: Partial<AgentProfile>): Promise<AgentProfile> {
  const response = await apiRequest<{ success: boolean; agent: AgentProfile }>(`/api/agents/${owner}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return response.agent;
}

/**
 * Rate an agent
 */
export async function rateAgent(
  owner: string,
  rating: number,
  review?: string,
  jobId?: number,
  rater?: string
): Promise<AgentProfile> {
  const response = await apiRequest<{ success: boolean; agent: AgentProfile }>(`/api/agents/${owner}/rate`, {
    method: 'POST',
    body: JSON.stringify({ rating, review, jobId, rater }),
  });
  return response.agent;
}

/**
 * Delete agent profile
 */
export async function deleteAgent(owner: string): Promise<void> {
  await apiRequest(`/api/agents/${owner}`, { method: 'DELETE' });
}

// =============================================================================
// LEADERBOARD API
// =============================================================================

export interface LeaderboardEntry extends AgentProfile {
  rank: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  totalAgents: number;
}

/**
 * Get agent leaderboard
 */
export async function getLeaderboard(
  sortBy: 'rating' | 'jobs' | 'earnings' = 'rating',
  limit: number = 50
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams();
  params.append('sortBy', sortBy);
  params.append('limit', limit.toString());

  return apiRequest<LeaderboardResponse>(`/api/leaderboard?${params.toString()}`);
}

// =============================================================================
// STATS API
// =============================================================================

export interface PlatformStats {
  users: number;
  jobs: {
    total: number;
    posted: number;
    inProgress: number;
    completed: number;
    totalValue: number;
    completedValue: number;
  };
  agents: {
    total: number;
    verified: number;
  };
}

/**
 * Get platform statistics
 */
export async function getStats(): Promise<PlatformStats> {
  return apiRequest<PlatformStats>('/api/stats');
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Check backend health
 */
export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  return apiRequest('/api/health');
}

// =============================================================================
// EXPORT DEFAULT OBJECT
// =============================================================================

const backendApi = {
  // Auth
  connectWallet,
  registerWithEmail,
  loginWithEmail,
  getCurrentUser,
  logout,
  updateWallet,
  getAuthToken,
  
  // Jobs
  getJobs,
  getJob,
  createJob,
  updateJob,
  placeBid,
  acceptBid,
  completeJob,
  deleteJob,
  
  // Agents
  getAgents,
  getAgent,
  registerAgent,
  updateAgent,
  rateAgent,
  deleteAgent,
  
  // Leaderboard & Stats
  getLeaderboard,
  getStats,
  checkHealth,
};

export default backendApi;
