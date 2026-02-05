import React from 'react';
import { Job, JobStatus, EscrowStatus } from '../types';

interface EscrowStatusDisplayProps {
  job: Job;
  className?: string;
}

// Normalize job status for comparison
const normalizeStatus = (status: string): string => {
  return String(status).toUpperCase().replace(/_/g, '');
};

/**
 * Visual component showing escrow payment status timeline
 */
export const EscrowStatusDisplay: React.FC<EscrowStatusDisplayProps> = ({ job, className = '' }) => {
  // Determine escrow state based on job status
  const getEscrowState = (): {
    status: 'pending' | 'locked' | 'submitted' | 'released' | 'refunded' | 'disputed';
    progress: number;
    label: string;
    color: string;
  } => {
    const jobStatus = normalizeStatus(job.status);
    
    if (jobStatus === 'POSTED' || !job.agent) {
      return { status: 'pending', progress: 0, label: 'Awaiting Bid Acceptance', color: 'mc-text-dark' };
    }
    
    if (jobStatus === 'CANCELLED') {
      return { status: 'refunded', progress: 100, label: 'Refunded to Client', color: 'mc-gold' };
    }
    
    if (jobStatus === 'DISPUTED') {
      return { status: 'disputed', progress: 50, label: 'Under Dispute', color: 'mc-redstone' };
    }
    
    if (jobStatus === 'COMPLETED') {
      return { status: 'released', progress: 100, label: 'Released to Agent', color: 'mc-emerald' };
    }
    
    if (jobStatus === 'PENDINGAPPROVAL' || jobStatus === 'PENDING_APPROVAL') {
      return { status: 'submitted', progress: 75, label: 'Deliverable Submitted - Awaiting Approval', color: 'mc-gold' };
    }
    
    // IN_PROGRESS
    return { status: 'locked', progress: 50, label: 'Locked in Escrow', color: 'mc-diamond' };
  };

  const escrowState = getEscrowState();
  const paymentAmount = typeof job.payment === 'string' ? parseFloat(job.payment) : job.payment;
  const acceptedAmount = job.acceptedBidAmount 
    ? (typeof job.acceptedBidAmount === 'string' ? parseFloat(job.acceptedBidAmount) : job.acceptedBidAmount)
    : paymentAmount;

  const steps = [
    { 
      id: 'posted', 
      label: 'Job Posted', 
      icon: '📝',
      active: true,
      completed: true
    },
    { 
      id: 'locked', 
      label: 'Payment Locked', 
      icon: '🔒',
      active: escrowState.status !== 'pending',
      completed: ['locked', 'submitted', 'released', 'refunded', 'disputed'].includes(escrowState.status)
    },
    { 
      id: 'work', 
      label: escrowState.status === 'submitted' ? 'Deliverable Submitted' : 'Work in Progress', 
      icon: escrowState.status === 'submitted' ? '📦' : '⚡',
      active: ['locked', 'submitted', 'released'].includes(escrowState.status),
      completed: ['submitted', 'released'].includes(escrowState.status)
    },
    { 
      id: 'released', 
      label: escrowState.status === 'refunded' ? 'Refunded' : 'Payment Released', 
      icon: escrowState.status === 'refunded' ? '↩️' : '✅',
      active: ['released', 'refunded'].includes(escrowState.status),
      completed: ['released', 'refunded'].includes(escrowState.status)
    },
  ];

  return (
    <div className={`bg-mc-ui-bg-dark border-2 border-mc-stone p-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-mc-text-light text-xs uppercase tracking-wider flex items-center gap-2">
            <span>💰</span>
            Escrow Status
          </h4>
          <p className={`text-${escrowState.color} text-sm font-bold mt-1`}>
            {escrowState.label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-mc-text-dark text-[8px] uppercase">Amount</p>
          <p className="text-mc-emerald text-lg font-bold flex items-center gap-1">
            💎 {acceptedAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute top-4 left-4 right-4 h-1 bg-mc-stone/50 rounded-full" />
        
        {/* Progress bar fill */}
        <div 
          className={`absolute top-4 left-4 h-1 bg-${escrowState.color} rounded-full transition-all duration-500`}
          style={{ width: `calc(${escrowState.progress}% - 32px)` }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center w-1/4">
              <div 
                className={`w-8 h-8 rounded-sm flex items-center justify-center border-2 transition-all ${
                  step.completed
                    ? `bg-${escrowState.color}/20 border-${escrowState.color} text-${escrowState.color}`
                    : step.active
                    ? 'bg-mc-diamond/20 border-mc-diamond text-mc-diamond animate-pulse'
                    : 'bg-mc-stone/30 border-mc-stone text-mc-text-dark'
                }`}
              >
                <span className="text-sm">{step.icon}</span>
              </div>
              <p className={`text-[8px] mt-2 text-center ${
                step.completed || step.active ? 'text-mc-text-light' : 'text-mc-text-dark'
              }`}>
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Disputed status warning */}
      {escrowState.status === 'disputed' && (
        <div className="mt-4 p-3 bg-mc-redstone/20 border-2 border-mc-redstone">
          <p className="text-mc-redstone text-[10px] flex items-center gap-2">
            <span>⚠️</span>
            This job is under dispute. Funds remain locked until resolution.
          </p>
        </div>
      )}

      {/* Info for locked state */}
      {escrowState.status === 'locked' && (
        <div className="mt-4 p-3 bg-mc-diamond/10 border border-mc-diamond/30">
          <p className="text-mc-text-dark text-[9px]">
            💡 Payment is secured in escrow. Funds will be released to the agent upon job completion and client approval.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Compact escrow badge for job cards
 */
export const EscrowBadge: React.FC<{ job: Job }> = ({ job }) => {
  const jobStatus = normalizeStatus(job.status);
  const hasEscrow = job.escrowId !== undefined || (job.agent && jobStatus !== 'POSTED');

  if (!hasEscrow) return null;

  const isCompleted = jobStatus === 'COMPLETED';
  const isDisputed = jobStatus === 'DISPUTED';
  const isCancelled = jobStatus === 'CANCELLED';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[8px] uppercase tracking-wider rounded-sm ${
      isCompleted ? 'bg-mc-emerald/20 text-mc-emerald' :
      isDisputed ? 'bg-mc-redstone/20 text-mc-redstone' :
      isCancelled ? 'bg-mc-gold/20 text-mc-gold' :
      'bg-mc-diamond/20 text-mc-diamond'
    }`}>
      {isCompleted ? '✅ Paid' :
       isDisputed ? '⚠️ Disputed' :
       isCancelled ? '↩️ Refunded' :
       '🔒 Escrow'}
    </span>
  );
};

export default EscrowStatusDisplay;
