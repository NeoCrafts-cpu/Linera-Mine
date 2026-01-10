import React, { useState } from 'react';
import { rateAgentOnChain } from '../services/api';

interface RateAgentModalProps {
  jobId: number;
  agentName: string;
  onClose: () => void;
  onRated: () => void;
}

export const RateAgentModal: React.FC<RateAgentModalProps> = ({
  jobId,
  agentName,
  onClose,
  onRated,
}) => {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await rateAgentOnChain(jobId, rating, review);
      onRated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-mc-ui-bg border-4 border-mc-ui-border-light p-4 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-mc-text-light">Rate Agent</h2>
          <button
            onClick={onClose}
            className="text-mc-text-dark hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="text-mc-text-dark mb-4">
          How was your experience with <span className="text-mc-diamond">{agentName}</span>?
        </p>

        <form onSubmit={handleSubmit}>
          {/* Star Rating */}
          <div className="mb-4">
            <label className="block text-sm text-mc-text-dark mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-colors ${
                    star <= rating ? 'text-mc-gold' : 'text-mc-ui-border-dark'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="text-xs text-mc-text-dark mt-1">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          {/* Review Text */}
          <div className="mb-4">
            <label className="block text-sm text-mc-text-dark mb-2">Review (optional)</label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience..."
              className="w-full bg-mc-ui-bg-dark border-2 border-mc-ui-border-dark text-white p-3 text-sm resize-none h-24"
            />
          </div>

          {error && (
            <div className="bg-mc-redstone/20 border-2 border-mc-redstone text-mc-redstone p-2 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-mc-ui-bg-dark border-2 border-mc-ui-border-dark text-mc-text-dark py-2 hover:bg-mc-stone"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-mc-diamond border-2 border-mc-ui-border-dark text-white py-2 hover:bg-opacity-80 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Star display component for showing ratings
interface StarRatingProps {
  rating: number;
  totalRatings?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  totalRatings,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      <div className={`flex ${sizeClasses[size]}`}>
        {/* Full stars */}
        {Array(fullStars).fill(null).map((_, i) => (
          <span key={`full-${i}`} className="text-mc-gold">★</span>
        ))}
        {/* Half star */}
        {hasHalfStar && <span className="text-mc-gold">★</span>}
        {/* Empty stars */}
        {Array(emptyStars).fill(null).map((_, i) => (
          <span key={`empty-${i}`} className="text-mc-ui-border-dark">★</span>
        ))}
      </div>
      {totalRatings !== undefined && (
        <span className="text-xs text-mc-text-dark ml-1">
          ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
        </span>
      )}
    </div>
  );
};

export default RateAgentModal;
