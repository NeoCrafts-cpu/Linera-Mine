import React from 'react';
import { JobStatus } from '../types';

interface JobStatusBadgeProps {
  status: JobStatus;
}

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case JobStatus.Posted:
        return 'bg-mc-diamond text-white';
      case JobStatus.InProgress:
        return 'bg-mc-gold text-black';
      case JobStatus.Completed:
        return 'bg-mc-grass text-white';
      default:
        return 'bg-mc-stone text-white';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark ${getStatusStyles()}`}>
      {status}
    </span>
  );
};
