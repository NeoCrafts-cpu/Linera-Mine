#!/bin/bash

# Deploy Linera Job Marketplace to Devnet
# Usage: ./scripts/deploy-devnet.sh

set -e

echo "🚀 Deploying Linera Job Marketplace to Devnet..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v linera &> /dev/null; then
    echo -e "${RED}❌ Linera CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Cargo not found. Please install Rust.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Connect to devnet
echo "🌐 Connecting to Linera Devnet..."
export LINERA_DEVNET="https://devnet.linera.io"

# Initialize wallet with devnet
echo "💼 Initializing wallet on devnet..."
linera wallet init --with-new-chain --faucet $LINERA_DEVNET/faucet || {
    echo -e "${YELLOW}⚠️  Wallet already initialized, continuing...${NC}"
}

# Get chain ID
CHAIN_ID=$(linera wallet show | grep "Chain ID:" | head -1 | awk '{print $3}')
OWNER=$(linera wallet show | grep "Default owner:" | head -1 | awk '{print $3}')

echo -e "${GREEN}✅ Wallet initialized${NC}"
echo "Chain ID: $CHAIN_ID"
echo "Owner: $OWNER"
echo ""

# Build contract
echo "🔨 Building smart contract..."
cd linera-contracts/job-marketplace
cargo build --release --target wasm32-unknown-unknown

if [ ! -f "target/wasm32-unknown-unknown/release/job-marketplace-contract.wasm" ]; then
    echo -e "${RED}❌ Contract build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract built successfully${NC}"
echo ""

# Deploy contract
echo "📦 Deploying contract to devnet..."
DEPLOY_OUTPUT=$(linera publish-and-create \
    target/wasm32-unknown-unknown/release/job-marketplace-contract.wasm \
    target/wasm32-unknown-unknown/release/job-marketplace-service.wasm \
    --json-argument 'null' 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract App ID
APP_ID=$(echo "$DEPLOY_OUTPUT" | grep -o 'application [a-f0-9]*' | awk '{print $2}')

if [ -z "$APP_ID" ]; then
    echo -e "${RED}❌ Failed to extract App ID${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract deployed successfully${NC}"
echo "App ID: $APP_ID"
echo ""

# Create .env.local for frontend
cd ../..
echo "📝 Creating .env.local configuration..."

cat > .env.local << EOF
# Linera Blockchain Configuration (Devnet)
VITE_USE_LINERA=true
VITE_LINERA_CHAIN_ID=$CHAIN_ID
VITE_LINERA_APP_ID=$APP_ID
VITE_LINERA_WALLET_OWNER=$OWNER
VITE_LINERA_PORT=8081
VITE_LINERA_GRAPHQL_URL=http://localhost:8081
EOF

echo -e "${GREEN}✅ Configuration saved to .env.local${NC}"
echo ""

# Start GraphQL service
echo "🔄 Starting GraphQL service..."
echo "Run this command in a separate terminal:"
echo -e "${YELLOW}linera service --port 8081${NC}"
echo ""

# Frontend instructions
echo "🎨 To start the frontend:"
echo -e "${YELLOW}npm install${NC}"
echo -e "${YELLOW}npm run dev${NC}"
echo ""

# Summary
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Deployment Summary:"
echo "  Network:     Linera Devnet"
echo "  Chain ID:    $CHAIN_ID"
echo "  App ID:      $APP_ID"
echo "  Owner:       $OWNER"
echo ""
echo "🔗 Next Steps:"
echo "  1. Start GraphQL service: linera service --port 8081"
echo "  2. Start frontend: npm run dev"
echo "  3. Open http://localhost:3000"
echo ""
echo "📚 Documentation: See DEPLOYMENT_GUIDE.md for more options"
echo "════════════════════════════════════════════════════════"
