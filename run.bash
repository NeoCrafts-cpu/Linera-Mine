#!/usr/bin/env bash
# Linera Mine - Buildathon Submission Script
# This script sets up a local Linera network and deploys the Job Marketplace

set -eu

echo "=============================================="
echo "  🔷 LINERA MINE - Job Marketplace for AI Agents"
echo "=============================================="
echo ""

# Source nvm for node access
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Start local Linera network with faucet
echo "📡 Starting local Linera network..."
eval "$(linera net helper)"
linera_spawn linera net up --with-faucet

# Initialize wallet
export LINERA_FAUCET_URL=http://localhost:8080
echo "💰 Initializing wallet from faucet..."
linera wallet init --faucet="$LINERA_FAUCET_URL"
linera wallet request-chain --faucet="$LINERA_FAUCET_URL"

# Get chain info
CHAIN_ID=$(linera wallet show 2>&1 | grep -oE '[a-f0-9]{64}' | head -1)
echo "⛓️  Chain ID: $CHAIN_ID"

# Get wallet owner
WALLET_OWNER=$(linera wallet show 2>&1 | grep -oE '0x[a-f0-9]{64}' | head -1)
echo "👤 Wallet Owner: $WALLET_OWNER"

# Build the Job Marketplace contract
echo ""
echo "🔨 Building Job Marketplace smart contract..."
cd /build/linera-contracts/job-marketplace
cargo build --release --target wasm32-unknown-unknown

# Find the WASM files (they could be in different locations depending on workspace setup)
CONTRACT_WASM=$(find /build -name "job_marketplace_contract.wasm" -path "*/release/*" 2>/dev/null | head -1)
SERVICE_WASM=$(find /build -name "job_marketplace_service.wasm" -path "*/release/*" 2>/dev/null | head -1)

if [ -z "$CONTRACT_WASM" ] || [ -z "$SERVICE_WASM" ]; then
    echo "❌ Error: Could not find WASM files"
    echo "Searching for any wasm files..."
    find /build -name "*.wasm" 2>/dev/null
    exit 1
fi

echo "📄 Contract WASM: $CONTRACT_WASM"
echo "📄 Service WASM: $SERVICE_WASM"

# Publish and deploy the application
echo ""
echo "🚀 Publishing application to Linera..."
cd /build/linera-contracts/job-marketplace
APP_ID=$(linera publish-and-create \
    "$CONTRACT_WASM" "$SERVICE_WASM" \
    --json-argument '{"job_counter": 0}' 2>&1 | grep -oE '[a-f0-9]{64}' | tail -1)

echo "📦 Application ID: $APP_ID"

# Start the GraphQL service
echo ""
echo "🌐 Starting GraphQL service on port 9001..."
linera service --port 9001 &
sleep 5

# Setup frontend environment
echo ""
echo "🎮 Setting up frontend..."
cd /build

# Create .env.local for frontend - include full GraphQL path
cat > .env.local << EOF
VITE_USE_LINERA=true
VITE_LINERA_CHAIN_ID=$CHAIN_ID
VITE_LINERA_APP_ID=$APP_ID
VITE_LINERA_PORT=9001
VITE_LINERA_GRAPHQL_URL=http://localhost:9001/chains/$CHAIN_ID/applications/$APP_ID
VITE_LINERA_WALLET_OWNER=$WALLET_OWNER
EOF

echo "📝 Frontend configuration:"
cat .env.local

# Install frontend dependencies and start dev server
echo ""
echo "📦 Installing frontend dependencies..."
npm install

echo ""
echo "🎯 Starting frontend on port 5173..."
npm run dev -- --port 5173 --host &

# Wait a bit for the server to start
sleep 5

echo ""
echo "=============================================="
echo "  ✅ LINERA MINE IS READY!"
echo "=============================================="
echo ""
echo "  🌐 Frontend:     http://localhost:5173"
echo "  📊 GraphQL:      http://localhost:9001/chains/$CHAIN_ID/applications/$APP_ID"
echo "  💧 Faucet:       http://localhost:8080"
echo ""
echo "  📦 App ID:       $APP_ID"
echo "  ⛓️  Chain ID:     $CHAIN_ID"
echo ""
echo "=============================================="

# Keep container running
wait