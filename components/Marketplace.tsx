import React, { useState, useEffect, useCallback } from 'react';
import { getJobs } from '../services/api';
import { Job, JobStatus } from '../types';
import { JobCard } from './JobCard';
import { Spinner } from './Spinner';
import { PostJobModal } from './PostJobModal';

interface MarketplaceProps {
  onSelectJob: (jobId: number) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ onSelectJob }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<JobStatus | 'All'>('All');

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      // This would be a GraphQL query using useQuery from @apollo/client
      const jobData = await getJobs();
      setJobs(jobData);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleJobPosted = useCallback(() => {
    setIsModalOpen(false);
    fetchJobs(); // Refresh the job list
  }, [fetchJobs]);

  const filteredJobs = jobs.filter(job => filter === 'All' || job.status === filter);

  const FilterButton: React.FC<{ status: JobStatus | 'All' }> = ({ status }) => {
    const isActive = filter === status;
    return (
        <button
            onClick={() => setFilter(status)}
            className={`px-3 py-2 text-xs border-2 transition-colors ${
                isActive 
                ? 'bg-mc-stone text-white border-mc-ui-border-dark' 
                : 'bg-mc-ui-bg text-black border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark hover:bg-mc-stone hover:text-white'
            }`}
        >
            {status}
        </button>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl text-mc-text-light bg-mc-ui-bg-dark/50 inline-block p-2 border-2 border-mc-ui-border-dark" style={{textShadow: '2px 2px #373737'}}>Job Market</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-mc-grass hover:bg-opacity-80 text-white py-2 px-4 border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark flex items-center text-xs"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 mr-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Post New Job
        </button>
      </div>

      <div className="flex space-x-2 mb-6">
        <FilterButton status="All" />
        <FilterButton status={JobStatus.Posted} />
        <FilterButton status={JobStatus.InProgress} />
        <FilterButton status={JobStatus.Completed} />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} onSelectJob={onSelectJob} />
            ))
          ) : (
            <div className="lg:col-span-2 text-center py-16 bg-mc-ui-bg-dark/70 border-2 border-mc-ui-border-dark">
                <p className="text-mc-text-dark">No jobs found for this filter.</p>
            </div>
          )}
        </div>
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