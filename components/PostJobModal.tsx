import React, { useState } from 'react';
import { postJob, postJobOnChain, isLineraEnabled } from '../services/api';

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobPosted: () => void;
}

// Pixel art emerald SVG for payment field
const EmeraldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" className="pixel-art">
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

export const PostJobModal: React.FC<PostJobModalProps> = ({ isOpen, onClose, onJobPosted }) => {
  const [description, setDescription] = useState('');
  const [payment, setPayment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !payment || Number(payment) <= 0) {
      setError('Please provide a description and valid payment amount.');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    
    try {
      if (isLineraEnabled()) {
        await postJobOnChain(description, Number(payment));
        setSuccess('Job posted to blockchain! Transaction confirmed.');
      } else {
        await postJob(description, Number(payment));
        setSuccess('Job posted (mock mode)');
      }
      onJobPosted();
      
      setTimeout(() => {
        setDescription('');
        setPayment('');
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(`Failed to post job: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-mc-obsidian w-full max-w-lg border-4 border-mc-stone shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-mc-stone px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg text-mc-text-light flex items-center gap-3" style={{textShadow: '2px 2px #1B1B2F'}}>
            <span className="text-xl">📝</span>
            Post a New Job
          </h2>
          <button 
            onClick={onClose} 
            className="text-mc-text-dark hover:text-mc-text-light text-xl transition-colors w-8 h-8 flex items-center justify-center bg-mc-ui-bg-dark border-2 border-mc-ui-border-dark hover:border-mc-redstone"
          >
            ✕
          </button>
        </div>

        {/* Connection indicator */}
        <div className={`px-6 py-2 text-[9px] flex items-center gap-2 ${isLineraEnabled() ? 'bg-mc-emerald/20' : 'bg-mc-gold/20'}`}>
          <span className={`w-2 h-2 rounded-full ${isLineraEnabled() ? 'bg-mc-emerald animate-pulse' : 'bg-mc-gold'}`}></span>
          <span className={isLineraEnabled() ? 'text-mc-emerald' : 'text-mc-gold'}>
            {isLineraEnabled() ? 'Connected to Linera Testnet' : 'Mock Mode (No Blockchain)'}
          </span>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Description Field */}
          <div className="mb-5">
            <label htmlFor="description" className="block text-mc-text-light text-[10px] uppercase tracking-wider mb-2">
              Job Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-mc-ui-bg-dark border-4 border-mc-stone focus:border-mc-diamond p-4 text-mc-text-light text-xs focus:outline-none transition-colors placeholder-mc-text-dark"
              rows={4}
              placeholder="Describe the task you need completed...&#10;Example: Build a DeFi dashboard with real-time price feeds"
              required
            />
            <div className="flex justify-between mt-1">
              <span className="text-mc-text-dark text-[8px]">Be specific about requirements</span>
              <span className={`text-[8px] ${description.length > 500 ? 'text-mc-redstone' : 'text-mc-text-dark'}`}>
                {description.length}/500
              </span>
            </div>
          </div>

          {/* Payment Field */}
          <div className="mb-6">
            <label htmlFor="payment" className="block text-mc-text-light text-[10px] uppercase tracking-wider mb-2">
              Payment Amount
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <EmeraldIcon />
              </div>
              <input
                id="payment"
                type="number"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="w-full bg-mc-ui-bg-dark border-4 border-mc-stone focus:border-mc-emerald pl-12 pr-4 py-3 text-mc-text-light text-sm focus:outline-none transition-colors placeholder-mc-text-dark"
                placeholder="0"
                required
                min="1"
              />
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-mc-emerald text-[10px]">
                EMERALDS
              </span>
            </div>
            <span className="text-mc-text-dark text-[8px] block mt-1">
              Funds will be locked in escrow until job completion
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-mc-redstone/20 border-2 border-mc-redstone px-4 py-3 text-[10px] mb-4 flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span className="text-mc-text-light">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-mc-emerald/20 border-2 border-mc-emerald px-4 py-3 text-[10px] mb-4 flex items-center gap-2">
              <span className="text-lg">✅</span>
              <span className="text-mc-text-light">{success}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-mc-stone text-mc-text-light py-3 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-ui-border-dark border-r-mc-ui-border-dark text-[10px] uppercase tracking-wider hover:brightness-110 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-mc-emerald text-white py-3 px-4 border-4 border-t-mc-ui-border-light border-l-mc-ui-border-light border-b-mc-emerald-dark border-r-mc-emerald-dark text-[10px] uppercase tracking-wider hover:brightness-110 transition-all disabled:bg-mc-stone disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Posting...
                </>
              ) : (
                <>
                  <span>⛏️</span>
                  Post Job
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};