#!/bin/bash
# Deploy Job Marketplace to Linera Testnet

set -e

echo "🚀 Deploying Job Marketplace to Linera Testnet..."

# Check if linera CLI is available
if ! command -v linera &> /dev/null; then
    echo "❌ linera CLI not found. Please install it first:"
    echo "   cargo install linera-service"
    exit 1
fi

# Get chain from faucet if needed
echo "📥 Getting chain from faucet..."
FAUCET_URL="https://faucet.testnet-conway.linera.net"

# Initialize wallet and get chain
linera wallet init --with-new-chain --faucet "$FAUCET_URL" 2>/dev/null || echo "Wallet may already exist"

# Show current chain
echo "📋 Current chain info:"
linera wallet show

# Path to WASM files
CONTRACT_WASM="linera-contracts/job-marketplace/target/wasm32-unknown-unknown/release/job_marketplace_contract.wasm"
SERVICE_WASM="linera-contracts/job-marketplace/target/wasm32-unknown-unknown/release/job_marketplace_service.wasm"

# Check WASM files exist
if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
    echo "❌ WASM files not found. Building..."
    cd linera-contracts/job-marketplace
    cargo build --release --target wasm32-unknown-unknown
    cd ../..
fi

echo "📦 Publishing and creating application..."
APP_OUTPUT=$(linera publish-and-create \
  "$CONTRACT_WASM" \
  "$SERVICE_WASM" \
  --json-argument '{}' 2>&1)

echo "$APP_OUTPUT"

# Extract application ID
APP_ID=$(echo "$APP_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)

if [ -n "$APP_ID" ]; then
    echo ""
    echo "✅ Application deployed successfully!"
    echo "📋 Application ID: $APP_ID"
    echo ""
    echo "🔧 Update your .env file with:"
    echo "VITE_LINERA_APP_ID=$APP_ID"
else
    echo "⚠️ Could not extract application ID from output"
fi
