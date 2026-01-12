import React, { useEffect, useState } from 'react';
import { initializeApp } from '../services/api';
import { checkFaucetConnection, getFaucetVersion } from '../services/faucet';
import { getEndpointConfig, isLiveMode, isConnecting } from '../services/endpointConfig';

type ConnectionMode = 'live' | 'connecting';

interface ConnectionStatus {
  mode: ConnectionMode;
  faucetConnected: boolean;
  faucetVersion?: string;
  chainId?: string;
}

export const ConnectionStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    mode: isLiveMode() ? 'live' : 'connecting',
    faucetConnected: false,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const faucetConnected = await checkFaucetConnection();
      let faucetVersion: string | undefined;
      
      if (faucetConnected) {
        const version = await getFaucetVersion();
        faucetVersion = version.version;
      }
      
      const config = getEndpointConfig();
      const mode: ConnectionMode = config.mode === 'live' ? 'live' : 'connecting';
      
      setStatus({
        mode,
        faucetConnected,
        faucetVersion,
        chainId: config.chainId,
      });
    } catch (error) {
      console.error('Failed to check connection:', error);
    }
  };

  const getModeColor = () => {
    switch (status.mode) {
      case 'live':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-blue-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };

  const getModeLabel = () => {
    switch (status.mode) {
      case 'live':
        return '🔗 Live on Linera';
      case 'connecting':
        return '⏳ Connecting...';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium ${getModeColor()} hover:opacity-90 transition-opacity`}
      >
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        {getModeLabel()}
      </button>

      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Connection Status
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Mode:</span>
              <span className={`font-medium ${status.mode === 'live' ? 'text-green-600' : 'text-blue-600'}`}>
                {status.mode.toUpperCase()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Faucet:</span>
              <span className={status.faucetConnected ? 'text-green-600' : 'text-red-600'}>
                {status.faucetConnected ? '✓ Connected' : '✗ Offline'}
              </span>
            </div>
            
            {status.faucetVersion && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Version:</span>
                <span className="text-gray-900 dark:text-white font-mono text-xs">
                  {status.faucetVersion}
                </span>
              </div>
            )}

            {status.chainId && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Chain:</span>
                <span className="text-gray-900 dark:text-white font-mono text-xs truncate max-w-[150px]" title={status.chainId}>
                  {status.chainId.substring(0, 16)}...
                </span>
              </div>
            )}
          </div>

          {status.mode === 'connecting' && (
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-200">
              <strong>Connecting:</strong> Attempting to connect to Linera blockchain...
            </div>
          )}

          {status.mode === 'live' && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-800 dark:text-green-200">
              <strong>Live Mode:</strong> Connected to Linera blockchain. 
              All actions are recorded on-chain.
            </div>
          )}

          <button
            onClick={checkConnection}
            className="mt-3 w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors"
          >
            Refresh Connection
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatusBadge;
