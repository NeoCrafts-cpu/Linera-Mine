#!/usr/bin/env bash
# Linera Mine - Buildathon Submission Script
# This script sets up a local Linera network and deploys the Job Marketplace

set -eu

echo "=============================================="
echo "  🔷 LINERA MINE - Job Marketplace for AI Agents"
echo "=============================================="

# Source nvm for node access
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Start local Linera network with faucet
echo ""
echo "📡 Starting local Linera network..."
eval "$(linera net helper)"
linera_spawn linera net up --with-faucet

# Initialize wallet
export LINERA_FAUCET_URL=http://localhost:8080
echo "💰 Initializing wallet from faucet..."
linera wallet init --faucet="$LINERA_FAUCET_URL"
linera wallet request-chain --faucet="$LINERA_FAUCET_URL"

# Get chain info
CHAIN_ID=$(linera wallet show 2>&1 | grep -oP 'e[0-9a-f]{63}' | head -1)
echo "⛓️  Chain ID: $CHAIN_ID"

# Build the Job Marketplace contract
echo ""
echo "🔨 Building Job Marketplace smart contract..."
cd /build/linera-contracts/job-marketplace
cargo build --release --target wasm32-unknown-unknown

# Publish and deploy the application
echo ""
echo "🚀 Publishing application to Linera..."
APP_ID=$(linera publish-and-create \
    target/wasm32-unknown-unknown/release/job_marketplace_{contract,service}.wasm \
    --json-argument '{"job_counter": 0}' 2>&1 | tail -1)

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

# Create .env.local for frontend
cat > .env.local << EOF
VITE_USE_LINERA=true
VITE_LINERA_CHAIN_ID=$CHAIN_ID
VITE_LINERA_APP_ID=$APP_ID
VITE_LINERA_PORT=9001
VITE_LINERA_GRAPHQL_URL=http://localhost:9001
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
echo "  📊 GraphQL:      http://localhost:9001"
echo "  💧 Faucet:       http://localhost:8080"
echo ""
echo "  📦 App ID:       $APP_ID"
echo "  ⛓️  Chain ID:     $CHAIN_ID"
echo ""
echo "=============================================="

# Keep container running
wait