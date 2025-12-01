import React from 'react';
import { JobStatus } from '../types';

interface JobStatusBadgeProps {
  status: JobStatus;
}

export const JobStatusBadge: React.FC<JobStatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case JobStatus.Posted:
        return { 
          bg: 'bg-mc-gold', 
          text: 'text-mc-ui-bg-dark', 
          border: 'border-mc-gold',
          icon: '📋',
          label: 'POSTED'
        };
      case JobStatus.InProgress:
        return { 
          bg: 'bg-mc-diamond', 
          text: 'text-mc-ui-bg-dark', 
          border: 'border-mc-diamond',
          icon: '⚡',
          label: 'IN PROGRESS'
        };
      case JobStatus.Completed:
        return { 
          bg: 'bg-mc-emerald', 
          text: 'text-white', 
          border: 'border-mc-emerald',
          icon: '✅',
          label: 'COMPLETED'
        };
      case JobStatus.Cancelled:
        return { 
          bg: 'bg-mc-redstone', 
          text: 'text-white', 
          border: 'border-mc-redstone',
          icon: '❌',
          label: 'CANCELLED'
        };
      default:
        return { 
          bg: 'bg-mc-stone', 
          text: 'text-mc-text-light', 
          border: 'border-mc-stone',
          icon: '❓',
          label: status
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${config.bg} ${config.text} border-2 ${config.border}`}>
      <span className="text-[10px]">{config.icon}</span>
      {config.label}
    </span>
  );
};