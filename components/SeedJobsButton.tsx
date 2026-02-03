import React, { useState } from 'react';
import { postJobOnChain, isLineraEnabled, isAdapterConnected } from '../services/api';
import { SEED_JOBS } from '../scripts/seed-jobs';

interface SeedJobsButtonProps {
  onComplete?: () => void;
}

/**
 * Admin button to seed example jobs to the blockchain
 * Only visible when connected and in Linera mode
 */
export const SeedJobsButton: React.FC<SeedJobsButtonProps> = ({ onComplete }) => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSeedJobs = async () => {
    if (!isLineraEnabled() || !isAdapterConnected()) {
      setError('Please connect to Linera first');
      return;
    }

    setIsSeeding(true);
    setError(null);
    setProgress(0);

    try {
      for (let i = 0; i < SEED_JOBS.length; i++) {
        const job = SEED_JOBS[i];
        setProgress(i + 1);
        
        console.log(`📝 Seeding job ${i + 1}/${SEED_JOBS.length}: ${job.title}`);
        
        await postJobOnChain(
          job.title,
          job.description,
          Number(job.payment),
          job.category,
          job.tags,
          job.milestones
        );
        
        // Small delay to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setSuccess(true);
      console.log('✅ All seed jobs posted successfully!');
      
      if (onComplete) {
        setTimeout(onComplete, 1500);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Failed to seed jobs:', err);
      setError(`Failed at job ${progress}: ${message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  if (!isLineraEnabled()) {
    return null;
  }

  return (
    <div className="bg-mc-ui-bg-dark border-2 border-mc-amethyst p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-mc-text-light text-sm flex items-center gap-2">
            <span>🌱</span>
            Seed Example Jobs
          </h3>
          <p className="text-mc-text-dark text-[9px] mt-1">
            Add {SEED_JOBS.length} realistic AI agent jobs to demonstrate the marketplace
          </p>
        </div>
        
        <button
          onClick={handleSeedJobs}
          disabled={isSeeding || success}
          className={`px-4 py-2 text-[10px] uppercase tracking-wider border-2 transition-all ${
            success
              ? 'bg-mc-emerald text-white border-mc-emerald-dark cursor-default'
              : isSeeding
              ? 'bg-mc-stone text-mc-text-dark border-mc-ui-border-dark cursor-wait'
              : 'bg-mc-amethyst text-white border-mc-amethyst hover:bg-mc-amethyst/80'
          }`}
        >
          {success ? (
            <span className="flex items-center gap-2">✅ Seeded!</span>
          ) : isSeeding ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              {progress}/{SEED_JOBS.length}
            </span>
          ) : (
            <span className="flex items-center gap-2">🌱 Seed Jobs</span>
          )}
        </button>
      </div>
      
      {isSeeding && (
        <div className="mt-3">
          <div className="h-2 bg-mc-stone rounded-sm overflow-hidden">
            <div 
              className="h-full bg-mc-amethyst transition-all duration-300"
              style={{ width: `${(progress / SEED_JOBS.length) * 100}%` }}
            />
          </div>
          <p className="text-mc-text-dark text-[8px] mt-1">
            Posting: {SEED_JOBS[progress - 1]?.title || '...'}
          </p>
        </div>
      )}
      
      {error && (
        <p className="text-mc-redstone text-[9px] mt-2">❌ {error}</p>
      )}
    </div>
  );
};

export default SeedJobsButton;
