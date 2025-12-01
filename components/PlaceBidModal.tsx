import React, { useState } from 'react';
import { placeBidOnChain, isLineraEnabled, getCurrentUserAddress } from '../services/api';
import { Job } from '../types';
import { Spinner } from './Spinner';

interface PlaceBidModalProps {
  job: Job;
  onClose: () => void;
  onBidPlaced: () => void;
}

export const PlaceBidModal: React.FC<PlaceBidModalProps> = ({ job, onClose, onBidPlaced }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const currentUser = getCurrentUserAddress();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isLineraEnabled()) {
        await placeBidOnChain(job.id);
      } else {
        // Mock bid for demo mode
        console.log('Mock bid placed on job:', job.id);
      }
      setSuccess(true);
      setTimeout(() => {
        onBidPlaced();
      }, 1500);
    } catch (err) {
      console.error('Failed to place bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to place bid. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user already bid on this job
  const hasAlreadyBid = job.bids.some(bid => {
    const bidAgent = typeof bid.agent === 'string' ? bid.agent : bid.agent?.owner;
    return bidAgent === currentUser;
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-mc-ui-bg-dark border-4 border-mc-stone w-full max-w-lg relative animate-fadeIn">
        {/* Header */}
        <div className="bg-mc-diamond px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-sm font-bold flex items-center gap-2" style={{textShadow: '2px 2px #1B1B2F'}}>
            <span>💬</span> Place Your Bid
          </h2>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4 animate-bounce">✅</div>
            <h3 className="text-mc-emerald text-lg font-bold mb-2" style={{textShadow: '2px 2px #1B1B2F'}}>
              Bid Placed!
            </h3>
            <p className="text-mc-text-dark text-[10px]">
              Your bid has been submitted to the blockchain.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {/* Job Info */}
            <div className="bg-mc-stone/30 p-4 border-2 border-mc-stone mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-mc-text-dark text-[9px] bg-mc-stone px-2 py-1 rounded-sm">
                  JOB #{job.id}
                </span>
              </div>
              <p className="text-mc-text-light text-xs mb-3">
                {job.description}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-mc-text-dark text-[10px]">Payment:</span>
                <span className="text-mc-emerald text-sm font-bold">💎 {job.payment.toLocaleString()}</span>
              </div>
            </div>

            {/* Already bid warning */}
            {hasAlreadyBid && (
              <div className="bg-mc-gold/20 border-2 border-mc-gold p-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-mc-gold text-xs font-bold">Already Bidding</p>
                    <p className="text-mc-text-dark text-[10px]">
                      You have already placed a bid on this job.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info about bidding */}
            <div className="bg-mc-stone/20 p-4 border-2 border-mc-stone mb-6">
              <h4 className="text-mc-text-light text-xs font-bold mb-2">📋 What happens next?</h4>
              <ul className="text-mc-text-dark text-[10px] space-y-1">
                <li>• Your bid will be recorded on the Linera blockchain</li>
                <li>• The job client will see your agent profile</li>
                <li>• If selected, the job status changes to "In Progress"</li>
                <li>• Complete the job to receive payment</li>
              </ul>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-mc-redstone/20 border-2 border-mc-redstone p-3 mb-6">
                <p className="text-mc-redstone text-[10px] flex items-center gap-2">
                  <span>❌</span> {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 bg-mc-stone text-mc-text-light py-3 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-ui-border-dark border-r-mc-ui-border-dark text-[10px] uppercase tracking-wider disabled:opacity-50 hover:brightness-110 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || hasAlreadyBid}
                className="flex-1 bg-mc-diamond text-white py-3 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-blue-800 border-r-blue-800 text-[10px] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    <span>Submitting...</span>
                  </>
                ) : hasAlreadyBid ? (
                  <>
                    <span>✓</span>
                    <span>Already Bid</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Place Bid</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
