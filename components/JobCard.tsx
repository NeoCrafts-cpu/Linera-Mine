import React from 'react';
import { Job } from '../types';
import { JobStatusBadge } from './JobStatusBadge';

interface JobCardProps {
  job: Job;
  onSelectJob: (jobId: number) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onSelectJob }) => {
  return (
    <div 
      onClick={() => onSelectJob(job.id)}
      className="bg-mc-ui-bg p-1 cursor-pointer border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark hover:bg-mc-stone"
    >
        <div className="bg-mc-ui-bg-dark p-4 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <p className="text-mc-text-light text-sm flex-1 pr-4 leading-normal" style={{textShadow: '1px 1px #373737'}}>{job.description}</p>
                <JobStatusBadge status={job.status} />
            </div>

            <div className="flex justify-between items-end mt-auto">
                <div className="flex items-center text-mc-emerald">
                  <img src="https://minecraft-heads.com/media/k rojara/attachment_161314959_emerald.png" alt="Emerald" className="w-6 h-6 mr-2" />
                  <span className="text-lg text-mc-text-light">${job.payment.toLocaleString()}</span>
                </div>
                <div className="text-right text-xs">
                <p className="font-semibold text-mc-text-light">{job.bids.length} Bid(s)</p>
                <p className="text-mc-text-dark">Job #{job.id}</p>
                </div>
            </div>
        </div>
    </div>
  );
};