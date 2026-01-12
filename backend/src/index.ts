/**
 * @deprecated This entire backend folder is deprecated and should be deleted.
 * The app now uses the WASM @linera/client directly in the browser.
 * This backend was intended to proxy requests to a local linera node service,
 * but the new architecture connects directly to the faucet and validators.
 * 
 * This folder is excluded from TypeScript compilation via tsconfig.json.
 * 
 * TODO: Delete this entire 'backend' folder when able to modify filesystem.
 */

import express from 'express';
import cors from 'cors';
import { LineraClient } from './linera-client';
import { createGraphQLHandler } from './graphql';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8081;

// Initialize Linera client
const lineraClient = new LineraClient({
  walletPath: process.env.LINERA_WALLET || '/data/wallet.json',
  keystorePath: process.env.LINERA_KEYSTORE || '/data/keystore.json',
  storagePath: process.env.LINERA_STORAGE || 'rocksdb:/data/storage.db',
  faucetUrl: process.env.FAUCET_URL || 'https://faucet.testnet-conway.linera.net',
  contractPath: process.env.CONTRACT_PATH || '/app/contracts/job-marketplace-contract.wasm',
  servicePath: process.env.SERVICE_PATH || '/app/contracts/job-marketplace-service.wasm',
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    chainId: lineraClient.getChainId(),
    appId: lineraClient.getAppId(),
    initialized: lineraClient.isInitialized()
  });
});

// GraphQL endpoint that proxies to Linera service
app.use('/graphql', createGraphQLHandler(lineraClient));

// Direct proxy to Linera GraphQL (for compatibility)
app.all('/chains/:chainId/applications/:appId', async (req, res) => {
  try {
    const result = await lineraClient.queryGraphQL(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize and start
async function main() {
  console.log('=== Linera Backend Service ===');
  console.log(`Starting on port ${PORT}`);
  
  try {
    await lineraClient.initialize();
    console.log('Linera client initialized');
    console.log(`Chain ID: ${lineraClient.getChainId()}`);
    console.log(`App ID: ${lineraClient.getAppId()}`);
    
    app.listen(PORT, () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`GraphQL: http://0.0.0.0:${PORT}/graphql`);
    });
  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }
}

main();
