import React, { useState } from 'react';
import { postJob, postJobOnChain, isLineraEnabled } from '../services/api';

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobPosted: () => void;
}

export const PostJobModal: React.FC<PostJobModalProps> = ({ isOpen, onClose, onJobPosted }) => {
  const [description, setDescription] = useState('');
  const [payment, setPayment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !payment || Number(payment) <= 0) {
      setError('Provide description and payment.');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    
    try {
      if (isLineraEnabled()) {
        // Post to blockchain
        await postJobOnChain(description, Number(payment));
        setSuccess('Job posted to blockchain! Transaction confirmed.');
      } else {
        // Use mock data
        await postJob(description, Number(payment));
        setSuccess('Job posted (mock mode)');
      }
      onJobPosted();
      
      // Clear form after short delay to show success message
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity" onClick={onClose}>
      <div className="bg-mc-ui-bg p-1 w-full max-w-lg mx-4 border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark" onClick={e => e.stopPropagation()}>
        <div className="bg-mc-ui-bg p-6 border-2 border-mc-ui-border-dark">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl text-black">Post a New Job</h2>
                <button onClick={onClose} className="text-mc-ui-border-dark hover:text-black text-2xl">
                    &times;
                </button>
            </div>
            <form onSubmit={handleSubmit}>
            <div className="mb-4">
                <label htmlFor="description" className="block text-black text-xs mb-2">
                Job Description
                </label>
                <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-mc-ui-bg-dark border-2 border-t-mc-ui-border-dark border-l-mc-ui-border-dark border-b-mc-ui-border-light border-r-mc-ui-border-light p-2 text-mc-text-light text-xs focus:outline-none"
                rows={4}
                placeholder="e.g., Mine 100 diamonds..."
                required
                />
            </div>
            <div className="mb-6">
                <label htmlFor="payment" className="block text-black text-xs mb-2">
                Payment (Emeralds)
                </label>
                <input
                id="payment"
                type="number"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="w-full bg-mc-ui-bg-dark border-2 border-t-mc-ui-border-dark border-l-mc-ui-border-dark border-b-mc-ui-border-light border-r-mc-ui-border-light p-2 text-mc-text-light text-xs focus:outline-none"
                placeholder="e.g., 64"
                required
                min="1"
                />
            </div>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 text-xs mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 text-xs mb-4">
                ✅ {success}
              </div>
            )}
            <div className="flex justify-end">
                <button
                type="submit"
                disabled={isSubmitting}
                className="bg-mc-grass text-white py-2 px-6 border-2 border-l-mc-ui-border-light border-t-mc-ui-border-light border-r-mc-ui-border-dark border-b-mc-ui-border-dark disabled:bg-mc-stone disabled:cursor-not-allowed text-xs"
                >
                {isSubmitting ? 'Posting...' : 'Post Job'}
                </button>
            </div>
            </form>
        </div>
      </div>
    </div>
  );
};