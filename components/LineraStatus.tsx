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
    // Check connection every 10 seconds
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [useLinera, chainId]);

  if (!useLinera) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-yellow-800">
            Mock Mode - Using test data (Set VITE_USE_LINERA=true to enable blockchain)
          </span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 animate-pulse">
        <div className="flex items-center">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-sm text-blue-800">Connecting to Linera blockchain...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <span className="text-sm font-medium text-red-800 block">Linera Connection Error</span>
            <span className="text-xs text-red-600">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (chainInfo?.connected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <div className="text-sm font-medium text-green-800 mb-1">Connected to Linera Blockchain</div>
            <div className="text-xs text-green-700 space-y-1">
              <div className="flex items-center">
                <span className="font-semibold mr-2">Chain:</span>
                <code className="bg-green-100 px-2 py-0.5 rounded font-mono text-[10px]">
                  {chainInfo.chainId.substring(0, 16)}...
                </code>
              </div>
              <div className="flex items-center">
                <span className="font-semibold mr-2">App:</span>
                <code className="bg-green-100 px-2 py-0.5 rounded font-mono text-[10px]">
                  {appId?.substring(0, 16)}...
                </code>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                <span>Real-time blockchain data</span>
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
