import React, { useState } from 'react';
import { placeBidOnChain, placeBid, isLineraEnabled, getCurrentUserAddress } from '../services/api';
import { Job } from '../types';
import { Spinner } from './Spinner';

interface PlaceBidModalProps {
  job: Job;
  onClose: () => void;
  onBidPlaced: () => void;
}

// Helper function for case-insensitive address comparison
const addressMatch = (addr1: string | null | undefined, addr2: string | null | undefined): boolean => {
  if (!addr1 || !addr2) return false;
  return addr1.toLowerCase() === addr2.toLowerCase();
};

export const PlaceBidModal: React.FC<PlaceBidModalProps> = ({ job, onClose, onBidPlaced }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bidAmount, setBidAmount] = useState(job.payment.toString());
  const [proposal, setProposal] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('7');

  const currentUser = getCurrentUserAddress();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const amount = parseFloat(bidAmount);
    const days = parseInt(estimatedDays);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }
    
    if (!proposal.trim()) {
      setError('Please provide a proposal explaining your approach');
      return;
    }
    
    if (isNaN(days) || days < 1) {
      setError('Please enter a valid number of days');
      return;
    }
    
    setIsSubmitting(true);

    try {
      if (isLineraEnabled()) {
        await placeBidOnChain(job.id, amount, proposal.trim(), days);
      } else {
        // Mock bid for demo mode
        await placeBid(job.id);
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
    return addressMatch(bidAgent, currentUser);
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-mc-ui-bg-dark border-4 border-mc-stone w-full max-w-lg relative animate-fadeIn max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-mc-diamond px-4 py-3 flex justify-between items-center flex-shrink-0">
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
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1">
            {/* Job Info */}
            <div className="bg-mc-stone/30 p-3 border-2 border-mc-stone mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-mc-text-dark text-[9px] bg-mc-stone px-2 py-1 rounded-sm">
                  JOB #{job.id}
                </span>
              </div>
              <p className="text-mc-text-light text-xs mb-3">
                {job.description}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-mc-text-dark text-[10px]">Client Budget:</span>
                <span className="text-mc-emerald text-sm font-bold">💎 {job.payment.toLocaleString()}</span>
              </div>
            </div>

            {/* Bid Amount Field */}
            <div className="mb-3">
              <label className="block text-mc-text-light text-[10px] uppercase tracking-wider mb-1">
                Your Bid Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full bg-mc-ui-bg-dark border-3 border-mc-stone focus:border-mc-diamond p-2.5 pr-20 text-mc-text-light text-xs focus:outline-none transition-colors"
                  placeholder="Enter your bid"
                  required
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-mc-emerald text-[9px] font-bold">
                  💎 LINERA
                </span>
              </div>
            </div>

            {/* Estimated Days Field */}
            <div className="mb-3">
              <label className="block text-mc-text-light text-[10px] uppercase tracking-wider mb-1">
                Estimated Days to Complete
              </label>
              <input
                type="number"
                min="1"
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(e.target.value)}
                className="w-full bg-mc-ui-bg-dark border-3 border-mc-stone focus:border-mc-diamond p-2.5 text-mc-text-light text-xs focus:outline-none transition-colors"
                placeholder="Number of days"
                required
              />
            </div>

            {/* Proposal Field */}
            <div className="mb-4">
              <label className="block text-mc-text-light text-[10px] uppercase tracking-wider mb-1">
                Your Proposal
              </label>
              <textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                rows={3}
                className="w-full bg-mc-ui-bg-dark border-3 border-mc-stone focus:border-mc-diamond p-2.5 text-mc-text-light text-xs focus:outline-none transition-colors placeholder-mc-text-dark"
                placeholder="Explain your approach and why you're the best fit..."
                required
                maxLength={1000}
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[8px] ${proposal.length > 900 ? 'text-mc-gold' : 'text-mc-text-dark'}`}>
                  {proposal.length}/1000
                </span>
              </div>
            </div>

            {/* Already bid warning */}
            {hasAlreadyBid && (
              <div className="bg-mc-gold/20 border-2 border-mc-gold p-2 mb-3">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <p className="text-mc-gold text-[10px]">You have already placed a bid on this job.</p>
                </div>
              </div>
            )}

            {/* Info about bidding */}
            <div className="bg-mc-stone/20 p-2 border-2 border-mc-stone mb-3">
              <h4 className="text-mc-text-light text-[10px] font-bold mb-1">📋 What happens next?</h4>
              <ul className="text-mc-text-dark text-[9px] space-y-0.5">
                <li>• Your bid will be recorded on the blockchain</li>
                <li>• If selected, the job status changes to "In Progress"</li>
              </ul>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-mc-redstone/20 border-2 border-mc-redstone p-2 mb-3">
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
                className="flex-1 bg-mc-stone text-mc-text-light py-2.5 px-3 border-3 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-ui-border-dark border-r-mc-ui-border-dark text-[10px] uppercase tracking-wider disabled:opacity-50 hover:brightness-110 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || hasAlreadyBid}
                className="flex-1 bg-mc-diamond text-white py-2.5 px-3 border-3 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-blue-800 border-r-blue-800 text-[10px] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all flex items-center justify-center gap-2"
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
