# Linera Integration Guide

## Overview

This application integrates with the Linera blockchain to provide decentralized job marketplace functionality. This guide explains how to set up and use the Linera integration.

## Architecture

```
Frontend (React/TypeScript)
    ↓
services/linera.ts (GraphQL Client)
    ↓
Linera Node Service (Port 8080)
    ↓
Linera Blockchain (Microchains)
```

## Quick Start

### 1. Install Linera

```bash
# Install correct Rust version
rustup install 1.86.0
rustup default 1.86.0
rustup target add wasm32-unknown-unknown

# Install Linera
cargo install --locked linera-service@0.15.6
```

### 2. Start Local Network

```bash
# Start local test network with faucet
linera net up --with-faucet --faucet-port 8080

# Keep this terminal running
```

### 3. Initialize Wallet

In a new terminal:

```bash
# Create wallet and get test tokens
linera wallet init --faucet http://localhost:8080

# View your chains
linera wallet show
```

### 4. Configure Frontend

Create `.env.local`:

```bash
VITE_USE_LINERA=true
VITE_LINERA_GRAPHQL_URL=http://localhost:8080/graphql
VITE_LINERA_CHAIN_ID=<your-chain-id-from-wallet-show>
```

### 5. Start Frontend

```bash
npm run dev
```

## GraphQL API

### Available Queries

#### Get Chains
```graphql
query {
  chains {
    list
  }
}
```

#### Get Chain Info
```graphql
query($chainId: ChainId!) {
  chain(chainId: $chainId) {
    chainId
    tipState {
      blockHash
      nextBlockHeight
    }
  }
}
```

#### Get Applications
```graphql
query($chainId: ChainId!) {
  applications(chainId: $chainId) {
    id
    description
    link
  }
}
```

## Application Development

### Next Steps: Deploy Your Job Marketplace Contract

1. **Create Linera Application**
   ```bash
   # Clone the Linera examples
   git clone https://github.com/linera-io/linera-protocol
   cd linera-protocol
   git checkout testnet_conway
   ```

2. **Build Your Application**
   
   Create a new application based on the job marketplace requirements:
   - Define Operations (PostJob, AcceptBid, CompleteJob)
   - Define Messages (JobPosted, BidAccepted, PaymentTransferred)
   - Implement contract logic
   - Implement service (GraphQL) interface

3. **Compile to WASM**
   ```bash
   cd examples/your-app
   cargo build --release --target wasm32-unknown-unknown
   ```

4. **Publish and Deploy**
   ```bash
   linera publish-and-create \
     target/wasm32-unknown-unknown/release/your_app_{contract,service}.wasm \
     --json-argument '{"initial_config": {}}'
   ```

5. **Query Your Application**
   
   Your application will be available at:
   `http://localhost:8080/chains/<chain-id>/applications/<app-id>`

## Using the TypeScript Client

### Basic Usage

```typescript
import * as Linera from './services/linera';

// Health check
const isHealthy = await Linera.healthCheck();

// Get chains
const chains = await Linera.getChains();

// Get applications on a chain
const apps = await Linera.getApplications(chainId);

// Query application state
const jobData = await Linera.queryApplicationState(
  chainId,
  applicationId,
  `query { jobs { id description payment status } }`
);
```

### Integration with React Components

```typescript
// In your component
useEffect(() => {
  const loadJobs = async () => {
    if (USE_LINERA) {
      const data = await Linera.queryApplicationState(
        chainId,
        appId,
        `query { jobs { id description payment status } }`
      );
      setJobs(data.jobs);
    } else {
      // Fall back to mock data
      const mockJobs = await getJobs();
      setJobs(mockJobs);
    }
  };
  
  loadJobs();
}, []);
```

## GraphiQL IDE

Access the GraphiQL IDE for interactive queries:

**System API**: http://localhost:8080/  
**Application API**: http://localhost:8080/chains/{chain-id}/applications/{app-id}

## Troubleshooting

### Network Not Starting

```bash
# Clean up and restart
pkill -f linera
rm -rf ~/.linera* /tmp/linera_*
linera net up --with-faucet --faucet-port 8080
```

### Connection Refused

Make sure:
1. Linera network is running
2. Port 8080 is not in use
3. GraphQL URL in `.env.local` is correct

### No Data Returned

1. Check if application is deployed
2. Verify chain ID and application ID
3. Check GraphQL query syntax in GraphiQL

## Resources

- [Linera Documentation](https://linera.dev/)
- [Linera GitHub](https://github.com/linera-io/linera-protocol)
- [GraphQL Learn](https://graphql.org/learn/)
- [Linera Examples](https://github.com/linera-io/linera-protocol/tree/main/examples)

## Development Workflow

### Recommended Setup

1. Terminal 1: Linera network (`linera net up`)
2. Terminal 2: Frontend dev server (`npm run dev`)
3. Browser Tab 1: Your app (http://localhost:5173)
4. Browser Tab 2: GraphiQL IDE (http://localhost:8080)

### Testing Locally

```bash
# Test with mock data
VITE_USE_LINERA=false npm run dev

# Test with Linera
VITE_USE_LINERA=true npm run dev
```

## Production Deployment

### Using Linera Testnet

```bash
# Connect to testnet
linera wallet init --faucet https://faucet.testnet-conway.linera.net

# Deploy your application
linera publish-and-create <paths> --json-argument '{}'

# Update frontend config
VITE_LINERA_GRAPHQL_URL=https://your-node-url/graphql
VITE_USE_LINERA=true
```

## Next Steps

1. ✅ Linera CLI installed
2. ✅ Local network running
3. ✅ Frontend GraphQL client ready
4. 🔲 Create job marketplace Rust application
5. 🔲 Deploy to local network
6. 🔲 Wire frontend to application GraphQL API
7. 🔲 Test end-to-end
8. 🔲 Deploy to testnet

---

**Status**: Local network running at http://localhost:8080  
**GraphiQL**: http://localhost:8080  
**Frontend**: http://localhost:5173 (when dev server running)
