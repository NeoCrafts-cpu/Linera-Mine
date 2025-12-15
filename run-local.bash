#!/usr/bin/env bash
# Linera Mine - Local Development Script (No Docker)
# Runs a local Linera network and deploys the Job Marketplace

set -eu

echo "=============================================="
echo "  🔷 LINERA MINE - Local Development"
echo "=============================================="
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Check for Linera CLI
if ! command -v linera &> /dev/null; then
    echo "❌ Linera CLI not found. Install with:"
    echo "   cargo install linera-service linera-client"
    exit 1
fi

echo "✅ Linera CLI: $(linera --version | head -1)"

# Start local Linera network
echo ""
echo "📡 Starting local Linera network..."

# Initialize network helper
eval "$(linera net helper 2>/dev/null || true)"

# Start local network with faucet
linera_spawn linera net up --with-faucet &
NETWORK_PID=$!
sleep 5

# Initialize wallet
export LINERA_FAUCET_URL=http://localhost:8080
echo "💰 Initializing wallet from faucet..."
linera wallet init --faucet="$LINERA_FAUCET_URL" 2>/dev/null || true
linera wallet request-chain --faucet="$LINERA_FAUCET_URL" 2>/dev/null || true

# Get chain info
CHAIN_ID=$(linera wallet show 2>&1 | grep -oE '[a-f0-9]{64}' | head -1)
echo "⛓️  Chain ID: $CHAIN_ID"

# Get wallet owner
WALLET_OWNER=$(linera wallet show 2>&1 | grep -oE '0x[a-f0-9]{64}' | head -1)
echo "👤 Wallet Owner: $WALLET_OWNER"

# Build the contract
echo ""
echo "🔨 Building Job Marketplace smart contract..."
cd "$PROJECT_DIR/linera-contracts/job-marketplace"
cargo build --release --target wasm32-unknown-unknown

# Find WASM files
CONTRACT_WASM=$(find "$PROJECT_DIR" -name "job_marketplace_contract.wasm" -path "*/release/*" 2>/dev/null | head -1)
SERVICE_WASM=$(find "$PROJECT_DIR" -name "job_marketplace_service.wasm" -path "*/release/*" 2>/dev/null | head -1)

if [ -z "$CONTRACT_WASM" ] || [ -z "$SERVICE_WASM" ]; then
    echo "❌ Error: Could not find WASM files"
    find "$PROJECT_DIR" -name "*.wasm" 2>/dev/null
    exit 1
fi

echo "📄 Contract WASM: $CONTRACT_WASM"
echo "📄 Service WASM: $SERVICE_WASM"

# Publish and deploy
echo ""
echo "🚀 Publishing application to Linera..."
APP_ID=$(linera publish-and-create "$CONTRACT_WASM" "$SERVICE_WASM" 2>&1 | grep -oE '[a-f0-9]{64}' | tail -1)
echo "📦 Application ID: $APP_ID"

# Start GraphQL service
echo ""
echo "🌐 Starting GraphQL service on port 9001..."
linera service --port 9001 &
SERVICE_PID=$!
sleep 3

# Setup frontend environment
echo ""
echo "🎮 Setting up frontend..."
cd "$PROJECT_DIR"

cat > .env.local << EOF
VITE_USE_LINERA=true
VITE_LINERA_CHAIN_ID=$CHAIN_ID
VITE_LINERA_APP_ID=$APP_ID
VITE_LINERA_WALLET_OWNER=$WALLET_OWNER
VITE_GRAPHQL_ENDPOINT=http://localhost:9001/chains/$CHAIN_ID/applications/$APP_ID
EOF

echo ""
echo "=============================================="
echo "  ✅ LINERA MINE IS READY!"
echo "=============================================="
echo ""
echo "📊 GraphQL Endpoint:"
echo "   http://localhost:9001/chains/$CHAIN_ID/applications/$APP_ID"
echo ""
echo "🎮 Starting frontend on port 3000..."
npm run dev

# Cleanup on exit
trap "kill $NETWORK_PID $SERVICE_PID 2>/dev/null" EXIT
