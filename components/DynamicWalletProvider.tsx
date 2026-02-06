/**
 * Dynamic Wallet Provider
 * 
 * Integrates Dynamic wallet SDK for better UX:
 * - Social logins (Google, Twitter, Discord)
 * - Email-based wallets
 * - Embedded wallet (no browser extension needed)
 * - Better mobile experience
 * 
 * Get your environment ID from: https://app.dynamic.xyz/
 */

import React from 'react';
import { DynamicContextProvider, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';

// Get Dynamic environment ID from env
const DYNAMIC_ENVIRONMENT_ID = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || '';

interface DynamicWalletProviderProps {
  children: React.ReactNode;
}

/**
 * CSS styles for the Dynamic widget to match Minecraft theme
 */
const cssOverrides = `
  .dynamic-widget-card {
    background: #1a1a2e !important;
    border: 4px solid #373737 !important;
  }
  
  .dynamic-widget-inline-controls {
    background: #2d2d42 !important;
  }
  
  .dynamic-widget-inline-controls button {
    background: #55efc4 !important;
    color: #1a1a2e !important;
    font-family: 'MinecraftEvenings', 'Press Start 2P', monospace !important;
    font-size: 10px !important;
  }
  
  .dynamic-widget-inline-controls button:hover {
    background: #00b894 !important;
  }
`;

export const DynamicWalletProvider: React.FC<DynamicWalletProviderProps> = ({ children }) => {
  // If no Dynamic environment ID is set, just render children
  if (!DYNAMIC_ENVIRONMENT_ID) {
    return <>{children}</>;
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENVIRONMENT_ID,
        walletConnectors: [EthereumWalletConnectors],
        cssOverrides,
        // Disable social logins that don't work on sandbox/free tier
        // Only email + wallet connectors are supported
        socialProvidersFilter: () => [],
        // Enable these features for better UX
        eventsCallbacks: {
          onAuthSuccess: (args: any) => {
            console.log('🎉 Dynamic auth success:', args);
            // Store the wallet address for our app
            if (args.primaryWallet?.address) {
              localStorage.setItem('linera_mine_web3_address', args.primaryWallet.address);
              localStorage.setItem('linera_user_address', args.primaryWallet.address);
              localStorage.setItem('linera_client_address', args.primaryWallet.address);
            }
          },
          onLogout: () => {
            console.log('👋 Dynamic logout');
            localStorage.removeItem('linera_mine_web3_address');
            localStorage.removeItem('linera_user_address');
            localStorage.removeItem('linera_client_address');
            localStorage.removeItem('linera_mine_auth_token');
          },
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
};

/**
 * Dynamic Wallet Connect Button
 * 
 * A styled wrapper around the DynamicWidget that matches the Minecraft theme
 */
export const DynamicWalletButton: React.FC = () => {
  // If no Dynamic environment ID is set, return null
  if (!DYNAMIC_ENVIRONMENT_ID) {
    return null;
  }

  return (
    <div className="dynamic-wallet-button">
      <DynamicWidget />
    </div>
  );
};

export default DynamicWalletProvider;
