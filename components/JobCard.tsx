import React from 'react';
import { Job } from '../types';
import { JobStatusBadge } from './JobStatusBadge';

interface JobCardProps {
  job: Job;
  onSelectJob: (jobId: number) => void;
}

// Pixel art emerald SVG
const EmeraldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 16 16" className="pixel-art">
    <rect x="6" y="0" width="4" height="2" fill="#50C878"/>
    <rect x="4" y="2" width="2" height="2" fill="#3CB371"/>
    <rect x="6" y="2" width="4" height="2" fill="#98FB98"/>
    <rect x="10" y="2" width="2" height="2" fill="#50C878"/>
    <rect x="2" y="4" width="2" height="2" fill="#3CB371"/>
    <rect x="4" y="4" width="2" height="2" fill="#50C878"/>
    <rect x="6" y="4" width="4" height="2" fill="#98FB98"/>
    <rect x="10" y="4" width="2" height="2" fill="#50C878"/>
    <rect x="12" y="4" width="2" height="2" fill="#228B22"/>
    <rect x="2" y="6" width="2" height="4" fill="#3CB371"/>
    <rect x="4" y="6" width="2" height="4" fill="#50C878"/>
    <rect x="6" y="6" width="4" height="4" fill="#98FB98"/>
    <rect x="10" y="6" width="2" height="4" fill="#50C878"/>
    <rect x="12" y="6" width="2" height="4" fill="#228B22"/>
    <rect x="4" y="10" width="2" height="2" fill="#3CB371"/>
    <rect x="6" y="10" width="4" height="2" fill="#50C878"/>
    <rect x="10" y="10" width="2" height="2" fill="#228B22"/>
    <rect x="6" y="12" width="4" height="2" fill="#3CB371"/>
    <rect x="6" y="14" width="4" height="2" fill="#228B22"/>
  </svg>
);

export const JobCard: React.FC<JobCardProps> = ({ job, onSelectJob }) => {
  return (
    <div 
      onClick={() => onSelectJob(job.id)}
      className="group bg-mc-ui-bg-dark cursor-pointer border-4 border-mc-stone hover:border-mc-diamond transition-all duration-200 hover:transform hover:-translate-y-1"
    >
      {/* Top accent bar based on status */}
      <div className={`h-1 ${
        job.status === 'COMPLETED' ? 'bg-mc-emerald' :
        job.status === 'IN_PROGRESS' ? 'bg-mc-diamond' :
        job.status === 'CANCELLED' ? 'bg-mc-redstone' :
        'bg-mc-gold'
      }`}></div>
      
      <div className="p-5">
        {/* Header with job ID and status */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-[9px] text-mc-text-dark bg-mc-stone px-2 py-1 rounded-sm">
            JOB #{job.id}
          </span>
          <JobStatusBadge status={job.status} />
        </div>

        {/* Job description */}
        <p className="text-mc-text-light text-xs leading-relaxed mb-4 min-h-[40px]" style={{textShadow: '1px 1px #1B1B2F'}}>
          {job.description.length > 80 ? job.description.substring(0, 80) + '...' : job.description}
        </p>

        {/* Footer with payment and bids */}
        <div className="flex justify-between items-center pt-3 border-t border-mc-stone">
          <div className="flex items-center gap-2">
            <div className="group-hover:animate-float">
              <EmeraldIcon />
            </div>
            <span className="text-mc-emerald text-sm font-bold" style={{textShadow: '1px 1px #1B1B2F'}}>
              {job.payment.toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-mc-text-dark">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"/>
              </svg>
              <span className="text-[10px]">{job.bids.length}</span>
            </div>
            
            <div className="text-mc-diamond text-[10px] group-hover:underline">
              View →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};