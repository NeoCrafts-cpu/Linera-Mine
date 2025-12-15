import React, { useState, useEffect, useCallback } from 'react';
import { getJobs, getJobsFromChain, getJobsFiltered, isLineraEnabled } from '../services/api';
import { Job, JobStatus, JobFilter, JobSortField, SortDirection } from '../types';
import { JobCard } from './JobCard';
import { Spinner } from './Spinner';
import { PostJobModal } from './PostJobModal';
import { JobFilters } from './JobFilters';
import LineraStatus from './LineraStatus';

interface MarketplaceProps {
  onSelectJob: (jobId: number) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ onSelectJob }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<JobFilter>({});
  const [sortBy, setSortBy] = useState<JobSortField>('CreatedAt');
  const [sortDir, setSortDir] = useState<SortDirection>('Desc');
  const [quickFilter, setQuickFilter] = useState<JobStatus | 'All'>('All');

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      let jobData: Job[];
      
      if (isLineraEnabled()) {
        // Use filtered query for blockchain
        const queryFilter = quickFilter !== 'All' ? { ...filter, status: quickFilter } : filter;
        jobData = await getJobsFiltered(queryFilter, sortBy, sortDir);
      } else {
        jobData = await getJobs();
      }
      
      setJobs(jobData);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }, [filter, sortBy, sortDir, quickFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleJobPosted = useCallback(() => {
    setIsModalOpen(false);
    fetchJobs();
  }, [fetchJobs]);

  // Helper function to compare status (case-insensitive) - defined early for use in filters
  const matchStatus = (jobStatus: string, targetStatus: JobStatus | string): boolean => {
    if (!jobStatus || !targetStatus) return false;
    const normalizedJob = String(jobStatus).toUpperCase().replace('_', '');
    const normalizedTarget = String(targetStatus).toUpperCase().replace('_', '');
    return normalizedJob === normalizedTarget;
  };

  // Apply filters and sorting (for mock data - blockchain uses server-side filtering)
  const filteredAndSortedJobs = !isLineraEnabled() ? jobs
    .filter(job => quickFilter === 'All' || matchStatus(job.status, quickFilter))
    .filter(job => !filter.minPayment || job.payment >= filter.minPayment)
    .filter(job => !filter.maxPayment || job.payment <= filter.maxPayment)
    .sort((a, b) => {
      switch (sortBy) {
        case 'Payment': return sortDir === 'Desc' ? b.payment - a.payment : a.payment - b.payment;
        case 'Id': return sortDir === 'Desc' ? b.id - a.id : a.id - b.id;
        case 'CreatedAt':
        default: return sortDir === 'Desc' ? b.id - a.id : a.id - b.id;
      }
    }) : jobs; // For Linera, jobs are already filtered/sorted server-side

  const handleFilterChange = (newFilter: JobFilter) => {
    setFilter(newFilter);
  };

  const handleSortChange = (newSortBy: JobSortField, newSortDir: SortDirection) => {
    setSortBy(newSortBy);
    setSortDir(newSortDir);
  };

  const statusCounts = {
    all: jobs.length,
    posted: jobs.filter(j => matchStatus(j.status, JobStatus.Posted)).length,
    inProgress: jobs.filter(j => matchStatus(j.status, JobStatus.InProgress)).length,
    completed: jobs.filter(j => matchStatus(j.status, JobStatus.Completed)).length,
  };

  const FilterButton: React.FC<{ status: JobStatus | 'All'; count: number }> = ({ status, count }) => {
    const isActive = quickFilter === status;
    const colorClass = status === 'All' ? 'bg-mc-stone' :
      status === JobStatus.Posted ? 'bg-mc-gold' :
      status === JobStatus.InProgress ? 'bg-mc-diamond' :
      'bg-mc-emerald';
    
    return (
      <button
        onClick={() => setQuickFilter(status)}
        className={`group relative px-4 py-2 text-[10px] uppercase tracking-wider transition-all duration-200 border-2 ${
          isActive 
            ? `${colorClass} text-white border-transparent shadow-lg transform scale-105` 
            : 'bg-mc-ui-bg-dark text-mc-text-dark border-mc-stone hover:border-mc-ui-border-light hover:text-mc-text-light'
        }`}
      >
        <span className="flex items-center gap-2">
          {status === 'All' && '📋'}
          {status === JobStatus.Posted && '📝'}
          {status === JobStatus.InProgress && '⚡'}
          {status === JobStatus.Completed && '✅'}
          {status === 'All' ? 'All Jobs' : status}
          <span className={`px-1.5 py-0.5 rounded-sm text-[8px] ${
            isActive ? 'bg-white/20' : 'bg-mc-stone/50'
          }`}>
            {count}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="py-4">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl text-mc-text-light flex items-center gap-3" style={{textShadow: '3px 3px #1B1B2F'}}>
              <span className="text-3xl">⚔️</span>
              Job Marketplace
            </h1>
            <p className="text-mc-text-dark text-[10px] mt-1">
              Browse and bid on jobs from across the Linera network
            </p>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="mc-btn bg-mc-emerald hover:bg-mc-emerald-dark text-white py-3 px-6 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-emerald-dark border-r-mc-emerald-dark text-xs font-bold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Post New Job
          </button>
        </div>

        {/* Connection Status Bar */}
        <LineraStatus />
      </div>

      {/* Filter & Sort Controls */}
      <div className="bg-mc-ui-bg-dark border-2 border-mc-stone p-4 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            <FilterButton status="All" count={statusCounts.all} />
            <FilterButton status={JobStatus.Posted} count={statusCounts.posted} />
            <FilterButton status={JobStatus.InProgress} count={statusCounts.inProgress} />
            <FilterButton status={JobStatus.Completed} count={statusCounts.completed} />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-mc-text-dark text-[9px] uppercase">Sort by:</span>
            <select 
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split('-') as [JobSortField, SortDirection];
                setSortBy(field);
                setSortDir(dir);
              }}
              className="bg-mc-stone text-mc-text-light text-[10px] px-3 py-2 border-2 border-mc-ui-border-dark focus:outline-none focus:border-mc-diamond cursor-pointer"
            >
              <option value="CreatedAt-Desc">Newest First</option>
              <option value="CreatedAt-Asc">Oldest First</option>
              <option value="Payment-Desc">Highest Payment</option>
              <option value="Payment-Asc">Lowest Payment</option>
              <option value="Id-Desc">ID (High to Low)</option>
              <option value="Id-Asc">ID (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <JobFilters
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        currentFilter={filter}
        currentSortBy={sortBy}
        currentSortDir={sortDir}
      />

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 bg-mc-ui-bg-dark/50 border-2 border-mc-stone">
          <Spinner />
          <p className="text-mc-text-dark text-[10px] mt-4 animate-pulse">Loading jobs from chain...</p>
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-mc-text-dark text-[10px]">
              Showing <span className="text-mc-diamond">{filteredAndSortedJobs.length}</span> of {jobs.length} jobs
            </p>
            <button 
              onClick={fetchJobs}
              className="text-mc-text-dark hover:text-mc-diamond text-[10px] flex items-center gap-1 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAndSortedJobs.length > 0 ? (
              filteredAndSortedJobs.map((job) => (
                <JobCard key={job.id} job={job} onSelectJob={onSelectJob} />
              ))
            ) : (
              <div className="md:col-span-2 xl:col-span-3 text-center py-16 bg-mc-ui-bg-dark border-4 border-mc-stone">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-mc-text-light text-sm mb-2">No Jobs Found</p>
                <p className="text-mc-text-dark text-[10px]">
                  {quickFilter === 'All' && !filter.minPayment && !filter.maxPayment
                    ? "Be the first to post a job on the marketplace!" 
                    : `No jobs matching your filters.`}
                </p>
                {(quickFilter !== 'All' || filter.minPayment || filter.maxPayment) && (
                  <button 
                    onClick={() => {
                      setQuickFilter('All');
                      setFilter({});
                    }}
                    className="mt-4 text-mc-diamond text-[10px] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
      
      <PostJobModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onJobPosted={handleJobPosted}
      />
    </div>
  );
};

export default Marketplace;