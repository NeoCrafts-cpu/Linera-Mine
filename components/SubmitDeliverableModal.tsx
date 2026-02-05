import React, { useState } from 'react';
import { submitMilestoneOnChain, isLineraEnabled } from '../services/api';
import { Job, Milestone, MilestoneStatus } from '../types';
import * as backendApi from '../services/backendApi';

interface SubmitDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  job: Job;
}

export const SubmitDeliverableModal: React.FC<SubmitDeliverableModalProps> = ({
  isOpen,
  onClose,
  onSubmitted,
  job
}) => {
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryLink, setDeliveryLink] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get in-progress milestones that can be submitted
  const submittableMilestones = job.milestones?.filter(
    m => m.status === MilestoneStatus.InProgress || m.status === 'IN_PROGRESS'
  ) || [];

  // If no milestones, treat entire job as single deliverable
  const hasNoMilestones = !job.milestones || job.milestones.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deliveryNotes.trim()) {
      setError('Please provide delivery notes describing your work');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const fullNotes = deliveryLink 
        ? `${deliveryNotes}\n\n📎 Deliverable Link: ${deliveryLink}`
        : deliveryNotes;

      // Always update backend first (changes status to PENDING_APPROVAL)
      try {
        await backendApi.submitDeliverable(job.id, fullNotes, deliveryLink);
        console.log('✅ Deliverable submitted to backend');
      } catch (backendErr) {
        console.warn('Backend submit failed:', backendErr);
      }

      // Also submit to blockchain if enabled
      if (isLineraEnabled()) {
        try {
          if (hasNoMilestones) {
            // No milestones - submit as milestone 0
            await submitMilestoneOnChain(job.id, 0, fullNotes);
          } else if (selectedMilestoneId !== null) {
            await submitMilestoneOnChain(job.id, selectedMilestoneId, fullNotes);
          }
        } catch (chainErr) {
          console.warn('Blockchain submit failed:', chainErr);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onSubmitted();
        onClose();
        setSuccess(false);
        setDeliveryNotes('');
        setDeliveryLink('');
        setSelectedMilestoneId(null);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Submit deliverable failed:', err);
      setError(`Failed to submit: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-mc-obsidian w-full max-w-lg border-4 border-mc-stone shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-mc-emerald px-4 py-3 flex justify-between items-center flex-shrink-0">
          <h2 className="text-sm text-white flex items-center gap-2" style={{ textShadow: '2px 2px #1B1B2F' }}>
            <span>📦</span>
            Submit Deliverable
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-lg transition-colors w-7 h-7 flex items-center justify-center bg-mc-emerald-dark border-2 border-mc-ui-border-dark hover:border-mc-redstone"
          >
            ✕
          </button>
        </div>

        {/* Job Info */}
        <div className="px-4 py-2 bg-mc-stone/30 border-b border-mc-stone">
          <p className="text-mc-text-dark text-[9px] uppercase">Job #{job.id}</p>
          <p className="text-mc-text-light text-xs truncate">{job.title || job.description}</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-mc-emerald/20 border-b border-mc-emerald">
            <p className="text-mc-emerald text-sm text-center">
              ✅ Deliverable submitted successfully! Awaiting client approval.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1">
          {/* Milestone Selection (if job has milestones) */}
          {!hasNoMilestones && submittableMilestones.length > 0 && (
            <div className="mb-4">
              <label className="block text-mc-text-light text-[10px] uppercase tracking-wider mb-2">
                Select Milestone
              </label>
              <div className="space-y-2">
                {submittableMilestones.map(milestone => (
                  <button
                    key={milestone.id}
                    type="button"
                    onClick={() => setSelectedMilestoneId(milestone.id)}
                    className={`w-full p-3 text-left border-2 transition-all ${
                      selectedMilestoneId === milestone.id
                        ? 'bg-mc-diamond/20 border-mc-diamond'
                        : 'bg-mc-ui-bg-dark border-mc-stone hover:border-mc-diamond/50'
                    }`}
                  >
                    <p className="text-mc-text-light text-xs font-bold">{milestone.title}</p>
                    <p className="text-mc-text-dark text-[9px] mt-1">{milestone.description}</p>
                    <p className="text-mc-gold text-[8px] mt-1">{milestone.paymentPercentage}% of payment</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasNoMilestones && submittableMilestones.length === 0 && (
            <div className="mb-4 p-3 bg-mc-gold/20 border-2 border-mc-gold">
              <p className="text-mc-gold text-xs">
                ⚠️ No milestones available to submit. All milestones may already be submitted or approved.
              </p>
            </div>
          )}

          {/* Delivery Link */}
          <div className="mb-4">
            <label className="block text-mc-text-light text-[10px] uppercase tracking-wider mb-1">
              Deliverable Link (Optional)
            </label>
            <input
              type="url"
              value={deliveryLink}
              onChange={e => setDeliveryLink(e.target.value)}
              placeholder="https://github.com/... or https://drive.google.com/..."
              className="w-full bg-mc-ui-bg-dark border-3 border-mc-stone focus:border-mc-diamond p-2.5 text-mc-text-light text-xs focus:outline-none transition-colors placeholder-mc-text-dark"
            />
            <p className="text-mc-text-dark text-[8px] mt-1">
              Link to GitHub repo, Google Drive, Dropbox, or any hosted deliverable
            </p>
          </div>

          {/* Delivery Notes */}
          <div className="mb-4">
            <label className="block text-mc-text-light text-[10px] uppercase tracking-wider mb-1">
              Delivery Notes *
            </label>
            <textarea
              value={deliveryNotes}
              onChange={e => setDeliveryNotes(e.target.value)}
              placeholder="Describe what you've completed, any important notes for the client, and how to access/use the deliverables..."
              rows={5}
              required
              className="w-full bg-mc-ui-bg-dark border-3 border-mc-stone focus:border-mc-diamond p-2.5 text-mc-text-light text-xs focus:outline-none transition-colors placeholder-mc-text-dark"
            />
            <div className="flex justify-between mt-1">
              <span className="text-mc-text-dark text-[8px]">Be specific about what's included</span>
              <span className={`text-[8px] ${deliveryNotes.length > 1000 ? 'text-mc-redstone' : 'text-mc-text-dark'}`}>
                {deliveryNotes.length}/1000
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-mc-redstone/20 border-2 border-mc-redstone">
              <p className="text-mc-redstone text-xs">❌ {error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-[10px] uppercase tracking-wider bg-mc-stone text-mc-text-light border-2 border-mc-ui-border-dark hover:bg-mc-stone/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success || (!hasNoMilestones && submittableMilestones.length === 0)}
              className={`flex-1 py-3 text-[10px] uppercase tracking-wider border-2 transition-all ${
                isSubmitting || success
                  ? 'bg-mc-stone text-mc-text-dark border-mc-ui-border-dark cursor-wait'
                  : 'bg-mc-emerald text-white border-mc-emerald-dark hover:bg-mc-emerald/90'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Submitting...
                </span>
              ) : success ? (
                <span>✅ Submitted!</span>
              ) : (
                <span>📦 Submit Deliverable</span>
              )}
            </button>
          </div>
        </form>

        {/* Info Footer */}
        <div className="px-4 py-3 bg-mc-stone/20 border-t border-mc-stone">
          <p className="text-mc-text-dark text-[8px]">
            💡 After submission, the client will review your work. Once approved, payment will be released from escrow.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubmitDeliverableModal;
