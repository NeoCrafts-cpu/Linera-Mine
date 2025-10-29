import React, { useState, useEffect, useCallback } from 'react';
import { getJobById, acceptJob, getAgents } from '../services/api';
import { Job, Owner, AgentProfile } from '../types';
import { AgentCard } from './AgentCard';
import { Spinner } from './Spinner';
import { JobStatusBadge } from './JobStatusBadge';

interface JobDetailsProps {
  jobId: number;
  onBack: () => void;
}

const JobDetails: React.FC<JobDetailsProps> = ({ jobId, onBack }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAccepting, setIsAccepting] = useState<Owner | null>(null);

  const fetchJobDetails = useCallback(async () => {
    try {
        setLoading(true);
        const [jobData, agentsData] = await Promise.all([
            getJobById(jobId),
            getAgents()
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
      await acceptJob(job.id, agentOwner);
      await fetchJobDetails();
    } catch (error) {
      console.error("Failed to accept bid:", error);
    } finally {
        setIsAccepting(null);
    }
  };


  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  if (!job) {
    return <p className="text-center text-mc-text-dark">Job not found.</p>;
  }

  const assignedAgentProfile = job.agent ? agents.find(a => a.owner === job.agent) : null;

  return (
    <div>
      <button onClick={onBack} className="flex items-center text-mc-diamond hover:underline mb-6 text-xs">
        &lt;&lt; Back to Market
      </button>

      <div className="bg-mc-ui-bg-dark/70 border-2 border-mc-ui-border-dark p-6 md:p-8 mb-8">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
            <div>
                <h2 className="text-xl font-bold text-mc-text-light" style={{textShadow: '2px 2px #373737'}}>{job.description}</h2>
                <p className="text-mc-text-dark mt-1 text-xs">Job #{job.id}</p>
            </div>
            <JobStatusBadge status={job.status} />
        </div>
        <div className="flex items-center space-x-6 text-mc-text-light">
          <div className="flex items-center">
            <img src="https://minecraft-heads.com/media/k rojara/attachment_161314959_emerald.png" alt="Emerald" className="w-6 h-6 mr-2" />
            <span className="text-xl">${job.payment.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <h3 className="text-xl text-mc-text-light mb-4 bg-mc-ui-bg-dark/50 inline-block p-2 border-2 border-mc-ui-border-dark" style={{textShadow: '2px 2px #373737'}}>
        {job.status === 'Posted' ? 'Bids from Agents' : 'Assigned Agent'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedAgentProfile ? (
            <AgentCard agent={assignedAgentProfile} />
        ) : job.bids.length > 0 ? (
          job.bids.map(({ agent, bidId }) => (
            <div key={bidId} className="relative">
              <AgentCard agent={agent} />
              <button 
                onClick={() => handleAcceptBid(agent.owner)}
                disabled={isAccepting !== null}
                className="absolute top-2 right-2 bg-mc-emerald text-white font-bold py-2 px-3 border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark text-xs disabled:bg-mc-stone disabled:cursor-wait"
              >
                {isAccepting === agent.owner ? '...' : 'Accept'}
              </button>
            </div>
          ))
        ) : (
          <p className="text-mc-text-dark md:col-span-2 lg:col-span-3">
             {job.status === 'Posted' ? 'No bids on this job yet.' : 'Agent details not found.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default JobDetails;