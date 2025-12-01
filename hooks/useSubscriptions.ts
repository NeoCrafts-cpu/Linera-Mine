import { useState, useEffect, useCallback } from 'react';
import { Job, AgentProfile, MarketplaceStats, JobFilter, AgentFilter, JobSortField, AgentSortField, SortDirection } from '../types';
import { 
  subscribeToJobs, 
  subscribeToJob, 
  subscribeToAgents, 
  subscribeToStats,
  getJobsFiltered,
  getAgentsFiltered,
  getMarketplaceStats,
} from '../services/api';

/**
 * Hook for subscribing to all jobs with real-time updates
 */
export function useJobs(pollInterval: number = 5000) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const subscription = subscribeToJobs((data) => {
      setJobs(data);
      setLoading(false);
      setError(null);
    }, pollInterval);

    return () => {
      subscription.unsubscribe();
    };
  }, [pollInterval]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJobsFiltered();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch jobs'));
    } finally {
      setLoading(false);
    }
  }, []);

  return { jobs, loading, error, refetch };
}

/**
 * Hook for subscribing to a specific job
 */
export function useJob(jobId: number, pollInterval: number = 3000) {
  const [job, setJob] = useState<Job | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!jobId) return;
    
    setLoading(true);
    
    const subscription = subscribeToJob(jobId, (data) => {
      setJob(data);
      setLoading(false);
      setError(null);
    }, pollInterval);

    return () => {
      subscription.unsubscribe();
    };
  }, [jobId, pollInterval]);

  return { job, loading, error };
}

/**
 * Hook for subscribing to all agents with real-time updates
 */
export function useAgents(pollInterval: number = 5000) {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const subscription = subscribeToAgents((data) => {
      setAgents(data);
      setLoading(false);
      setError(null);
    }, pollInterval);

    return () => {
      subscription.unsubscribe();
    };
  }, [pollInterval]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAgentsFiltered();
      setAgents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
    } finally {
      setLoading(false);
    }
  }, []);

  return { agents, loading, error, refetch };
}

/**
 * Hook for marketplace statistics with real-time updates
 */
export function useMarketplaceStats(pollInterval: number = 10000) {
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const subscription = subscribeToStats((data) => {
      setStats(data);
      setLoading(false);
      setError(null);
    }, pollInterval);

    return () => {
      subscription.unsubscribe();
    };
  }, [pollInterval]);

  return { stats, loading, error };
}

/**
 * Hook for filtered and sorted jobs
 */
export function useFilteredJobs(
  filter?: JobFilter,
  sortBy?: JobSortField,
  sortDir?: SortDirection,
  limit?: number,
  offset?: number
) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJobsFiltered(filter, sortBy, sortDir, limit, offset);
      setJobs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch jobs'));
    } finally {
      setLoading(false);
    }
  }, [filter, sortBy, sortDir, limit, offset]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { jobs, loading, error, refetch: fetch };
}

/**
 * Hook for filtered and sorted agents
 */
export function useFilteredAgents(
  filter?: AgentFilter,
  sortBy?: AgentSortField,
  sortDir?: SortDirection,
  limit?: number,
  offset?: number
) {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAgentsFiltered(filter, sortBy, sortDir, limit, offset);
      setAgents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
    } finally {
      setLoading(false);
    }
  }, [filter, sortBy, sortDir, limit, offset]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { agents, loading, error, refetch: fetch };
}
