# 🚀 Linera Testnet Deployment Guide

This guide will walk you through deploying your Job Marketplace to the **Linera Testnet (Conway)**.

## 📋 Prerequisites

### 1. Install Required Tools

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Set Rust version (required for SDK 0.15.6)
rustup default 1.86.0
rustup target add wasm32-unknown-unknown

# Install Protoc
curl -LO https://github.com/protocolbuffers/protobuf/releases/download/v21.11/protoc-21.11-linux-x86_64.zip
unzip protoc-21.11-linux-x86_64.zip -d $HOME/.local
export PATH="$HOME/.local/bin:$PATH"

# Install Linera CLI (version 0.15.6 for testnet)
cargo install --locked linera-storage-service@0.15.6
cargo install --locked linera-service@0.15.6
```

### 2. Verify Installation

```bash
linera --version
# Should output: linera-service 0.15.6
```

---

## 🔐 Step 1: Create Testnet Wallet

The Linera testnet provides a **faucet** to get free tokens and create a microchain.

```bash
# Initialize wallet and get tokens from testnet faucet
linera wallet init --faucet https://faucet.testnet-conway.linera.net

# Request an additional chain (optional, gives you more chains)
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
```

### Verify Your Wallet

```bash
# Check your wallet and chains
linera wallet show

# Sync with the network
linera sync

# Check your balance
linera query-balance
```

You should see output showing your:
- **Chain ID** - Your microchain identifier
- **Owner** - Your wallet address (public key)
- **Balance** - Should be ~10 tokens from faucet

---

## 🔨 Step 2: Build the Smart Contract

```bash
cd /mnt/e/AKINDO/linera-mine/linera-contracts/job-marketplace

# Build the contract for WASM
cargo build --release --target wasm32-unknown-unknown

# Verify the build produced WASM files
ls -la target/wasm32-unknown-unknown/release/*.wasm
```

You should see:
- `job-marketplace-contract.wasm` (~184KB)
- `job-marketplace-service.wasm` (~979KB)

---

## 📦 Step 3: Deploy to Testnet

```bash
# Deploy the contract
linera publish-and-create \
  target/wasm32-unknown-unknown/release/job-marketplace-contract.wasm \
  target/wasm32-unknown-unknown/release/job-marketplace-service.wasm \
  --json-argument 'null'
```

**Save the output!** You'll get:
- **Application ID** - Needed for frontend configuration

Example output:
```
Created application 11f8be3380b54f2748170bf3eca54c5ecda3dd90ac67e87498ffe1f19db1d28d on chain 10d2c087f4b527eb46c2ed8eae940113c393fb8fe539659c49d0c71499b2b457
```

---

## 🌐 Step 4: Start the Node Service

The node service provides GraphQL access to your application:

```bash
# Start the service (runs in foreground)
linera service --port 8081

# Or run in background
linera service --port 8081 &
```

### Test the GraphQL Endpoint

Open in browser: http://localhost:8081

You should see the GraphiQL IDE. Test with:

```graphql
query {
  chains {
    list
  }
}
```

---

## ⚙️ Step 5: Configure Frontend

Update your `.env.local` with testnet values:

```bash
# Get your chain ID and owner
linera wallet show
```

Then update `/mnt/e/AKINDO/linera-mine/.env.local`:

```env
GEMINI_API_KEY=PLACEHOLDER_API_KEY

# Linera Testnet Configuration
VITE_USE_LINERA=true
VITE_LINERA_CHAIN_ID=<YOUR_CHAIN_ID>
VITE_LINERA_APP_ID=<YOUR_APPLICATION_ID>
VITE_LINERA_WALLET_OWNER=<YOUR_OWNER_ADDRESS>
VITE_LINERA_PORT=8081
VITE_LINERA_GRAPHQL_URL=http://localhost:8081
```

---

## 🎨 Step 6: Start Frontend

```bash
cd /mnt/e/AKINDO/linera-mine

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 (or the port shown)

---

## ✅ Step 7: Test the Integration

### Test via GraphQL

Navigate to: `http://localhost:8081/chains/<CHAIN_ID>/applications/<APP_ID>`

Run queries:
```graphql
# Get all jobs
query {
  jobs {
    id
    description
    payment
    status
  }
}

# Get all agents
query {
  agents {
    name
    serviceDescription
    jobsCompleted
  }
}
```

### Test via Frontend

1. Click "Connect to Linera" button
2. You should see your wallet address displayed
3. Try posting a job (if connected)

---

## 🔄 Common Commands Reference

```bash
# Check wallet status
linera wallet show

# Sync with network
linera sync

# Check balance
linera query-balance

# View deployed applications
linera wallet show  # Lists apps under your chain

# Request more tokens from faucet
linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
```

---

## 🚨 Troubleshooting

### "Failed to connect to faucet"
- Check your internet connection
- Verify the faucet URL: `https://faucet.testnet-conway.linera.net`
- The testnet may be temporarily down - check [Linera Discord](https://discord.gg/linera)

### "Version mismatch"
- Ensure you're using Linera SDK 0.15.6
- Run: `cargo install --locked linera-service@0.15.6`

### "GraphQL errors"
- Make sure `linera service` is running
- Check that CHAIN_ID and APP_ID are correct in `.env.local`
- Verify the GraphQL URL matches your service port

### "Wallet not found"
The wallet files are stored in:
- Linux: `~/.config/linera/`
- macOS: `~/Library/Application Support/linera/`

To use a custom location:
```bash
export LINERA_WALLET="$HOME/linera/wallet.json"
export LINERA_KEYSTORE="$HOME/linera/keystore.json"
export LINERA_STORAGE="rocksdb:$HOME/linera/wallet.db"
```

---

## 📊 Testnet Information

| Property | Value |
|----------|-------|
| **Network Name** | Conway Testnet |
| **Faucet URL** | https://faucet.testnet-conway.linera.net |
| **SDK Version** | 0.15.6 |
| **Rust Version** | 1.86.0 |

---

## 🔗 Useful Links

- [Linera Documentation](https://linera.dev)
- [Linera GitHub](https://github.com/linera-io/linera-protocol)
- [Linera Discord](https://discord.gg/linera)
- [Testnet Branch](https://github.com/linera-io/linera-protocol/tree/testnet_conway)

---

## 📝 Quick Deploy Script

Save and run this script:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Job Marketplace to Linera Testnet..."

# Step 1: Initialize wallet
echo "📝 Step 1: Initializing wallet..."
linera wallet init --faucet https://faucet.testnet-conway.linera.net || echo "Wallet may already exist"

# Step 2: Build contract
echo "🔨 Step 2: Building contract..."
cd linera-contracts/job-marketplace
cargo build --release --target wasm32-unknown-unknown

# Step 3: Deploy
echo "📦 Step 3: Deploying to testnet..."
APP_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/job-marketplace-contract.wasm \
  target/wasm32-unknown-unknown/release/job-marketplace-service.wasm \
  --json-argument 'null' 2>&1)

echo "$APP_OUTPUT"

# Extract values
CHAIN_ID=$(linera wallet show | grep "Chain ID:" | head -1 | awk '{print $3}')
OWNER=$(linera wallet show | grep "Owner:" | head -1 | awk '{print $2}')

echo ""
echo "✅ Deployment Complete!"
echo "========================"
echo "Chain ID: $CHAIN_ID"
echo "Owner: $OWNER"
echo ""
echo "Now update your .env.local with these values!"
```

---

Happy building on Linera! 🎉
