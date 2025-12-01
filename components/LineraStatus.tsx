import React, { useEffect, useState } from 'react';
import * as Linera from '../services/linera';

interface ChainInfo {
  chainId: string;
  connected: boolean;
  blockHeight?: number;
}

const LineraStatus: React.FC = () => {
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chainId = import.meta.env.VITE_LINERA_CHAIN_ID;
  const appId = import.meta.env.VITE_LINERA_APP_ID;
  const useLinera = import.meta.env.VITE_USE_LINERA === 'true';

  useEffect(() => {
    if (!useLinera) {
      setLoading(false);
      return;
    }

    const checkConnection = async () => {
      try {
        const healthy = await Linera.healthCheck();
        if (healthy) {
          const chains = await Linera.getChains();
          setChainInfo({
            chainId: chainId || 'Unknown',
            connected: true,
          });
        } else {
          setError('Cannot connect to Linera node');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [useLinera, chainId]);

  if (!useLinera) {
    return (
      <div className="bg-mc-gold/10 border-2 border-mc-gold p-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-xl">⚠️</div>
          <div>
            <div className="text-mc-gold text-[10px] uppercase font-bold">Mock Mode Active</div>
            <div className="text-mc-text-dark text-[9px]">
              Using test data • Set VITE_USE_LINERA=true to enable blockchain
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-mc-diamond/10 border-2 border-mc-diamond p-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-5 h-5 border-2 border-mc-diamond border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div>
            <div className="text-mc-diamond text-[10px] uppercase font-bold animate-pulse">Connecting...</div>
            <div className="text-mc-text-dark text-[9px]">Establishing connection to Linera blockchain</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-mc-redstone/10 border-2 border-mc-redstone p-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-xl">❌</div>
          <div className="flex-1">
            <div className="text-mc-redstone text-[10px] uppercase font-bold">Connection Failed</div>
            <div className="text-mc-text-dark text-[9px]">{error}</div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-mc-redstone text-[9px] hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (chainInfo?.connected) {
    return (
      <div className="bg-mc-emerald/10 border-2 border-mc-emerald p-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-xl">⛓️</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-mc-emerald text-[10px] uppercase font-bold">Connected to Linera</span>
              <span className="inline-block w-2 h-2 bg-mc-emerald rounded-full animate-pulse"></span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="bg-mc-ui-bg-dark/50 p-2 border border-mc-stone">
                <div className="text-mc-text-dark text-[8px] uppercase mb-1">Chain ID</div>
                <code className="text-mc-diamond text-[9px] font-mono block truncate">
                  {chainInfo.chainId.substring(0, 20)}...
                </code>
              </div>
              <div className="bg-mc-ui-bg-dark/50 p-2 border border-mc-stone">
                <div className="text-mc-text-dark text-[8px] uppercase mb-1">Application</div>
                <code className="text-mc-amethyst text-[9px] font-mono block truncate">
                  {appId?.substring(0, 20)}...
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LineraStatus;