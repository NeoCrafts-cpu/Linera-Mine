#!/bin/bash

# Deploy Job Marketplace to Linera Testnet (Conway)
# Usage: ./scripts/deploy-testnet.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FAUCET_URL="https://faucet.testnet-conway.linera.net"

echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}🚀 Linera Testnet Deployment - Job Marketplace${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v linera &> /dev/null; then
    echo -e "${RED}❌ Linera CLI not found.${NC}"
    echo ""
    echo "Install with:"
    echo "  cargo install --locked linera-storage-service@0.15.6"
    echo "  cargo install --locked linera-service@0.15.6"
    exit 1
fi

LINERA_VERSION=$(linera --version 2>&1 | head -1)
echo -e "${GREEN}✅ Linera CLI: $LINERA_VERSION${NC}"

if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Cargo/Rust not found. Please install Rust first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Cargo installed${NC}"

# Check for wasm target
if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo -e "${YELLOW}⚠️  Adding wasm32-unknown-unknown target...${NC}"
    rustup target add wasm32-unknown-unknown
fi
echo -e "${GREEN}✅ WASM target available${NC}"
echo ""

# Step 1: Initialize wallet
echo -e "${YELLOW}📝 Step 1: Setting up testnet wallet...${NC}"
echo ""

# Check if wallet already exists
WALLET_EXISTS=false
if linera wallet show &>/dev/null; then
    WALLET_EXISTS=true
    echo -e "${GREEN}✅ Wallet already exists${NC}"
    linera wallet show | head -15
    echo ""
    read -p "Use existing wallet? (y/n): " USE_EXISTING
    if [[ "$USE_EXISTING" != "y" ]]; then
        echo -e "${YELLOW}Creating new wallet...${NC}"
        # Backup old wallet
        BACKUP_DIR="$HOME/.linera-backup-$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp -r ~/.config/linera/* "$BACKUP_DIR/" 2>/dev/null || true
        echo "Old wallet backed up to: $BACKUP_DIR"
        rm -rf ~/.config/linera/*
        WALLET_EXISTS=false
    fi
fi

if [ "$WALLET_EXISTS" = false ]; then
    echo "Requesting wallet from testnet faucet..."
    if ! linera wallet init --faucet "$FAUCET_URL"; then
        echo -e "${RED}❌ Failed to initialize wallet from faucet${NC}"
        echo "The testnet may be temporarily unavailable. Try again later or check:"
        echo "  - Your internet connection"
        echo "  - Linera Discord for testnet status"
        exit 1
    fi
    echo -e "${GREEN}✅ Wallet initialized from testnet${NC}"
fi

# Get chain info
CHAIN_ID=$(linera wallet show | grep "Chain ID:" | head -1 | awk '{print $3}')
OWNER=$(linera wallet show | grep "Owner:" | head -1 | awk '{print $2}')

if [ -z "$CHAIN_ID" ]; then
    echo -e "${RED}❌ Failed to get chain ID${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Chain ID: ${CHAIN_ID}${NC}"
echo -e "${GREEN}Owner: ${OWNER}${NC}"
echo ""

# Sync with network
echo -e "${YELLOW}🔄 Syncing with testnet...${NC}"
linera sync
BALANCE=$(linera query-balance 2>/dev/null || echo "unknown")
echo -e "${GREEN}✅ Synced. Balance: $BALANCE${NC}"
echo ""

# Step 2: Build contract
echo -e "${YELLOW}🔨 Step 2: Building smart contract...${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTRACT_DIR="$PROJECT_DIR/linera-contracts/job-marketplace"

if [ ! -d "$CONTRACT_DIR" ]; then
    echo -e "${RED}❌ Contract directory not found: $CONTRACT_DIR${NC}"
    exit 1
fi

cd "$CONTRACT_DIR"

echo "Building in: $CONTRACT_DIR"
cargo build --release --target wasm32-unknown-unknown

CONTRACT_WASM="target/wasm32-unknown-unknown/release/job-marketplace-contract.wasm"
SERVICE_WASM="target/wasm32-unknown-unknown/release/job-marketplace-service.wasm"

if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
    echo -e "${RED}❌ WASM files not found after build${NC}"
    exit 1
fi

CONTRACT_SIZE=$(du -h "$CONTRACT_WASM" | awk '{print $1}')
SERVICE_SIZE=$(du -h "$SERVICE_WASM" | awk '{print $1}')

echo -e "${GREEN}✅ Contract built: $CONTRACT_SIZE${NC}"
echo -e "${GREEN}✅ Service built: $SERVICE_SIZE${NC}"
echo ""

# Step 3: Deploy to testnet
echo -e "${YELLOW}📦 Step 3: Deploying to testnet...${NC}"
echo ""

DEPLOY_OUTPUT=$(linera publish-and-create \
    "$CONTRACT_WASM" \
    "$SERVICE_WASM" \
    --json-argument 'null' 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract application ID
APP_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'application \K[a-f0-9]+' | head -1)

if [ -z "$APP_ID" ]; then
    # Try alternative parsing
    APP_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Created application \K[a-f0-9]+' | head -1)
fi

if [ -z "$APP_ID" ]; then
    echo -e "${RED}❌ Failed to extract Application ID${NC}"
    echo "Check the output above for errors"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Application deployed!${NC}"
echo -e "${GREEN}Application ID: $APP_ID${NC}"
echo ""

# Step 4: Update .env.local
echo -e "${YELLOW}⚙️  Step 4: Updating frontend configuration...${NC}"
echo ""

cd "$PROJECT_DIR"

# Create or update .env.local
cat > .env.local << EOF
GEMINI_API_KEY=PLACEHOLDER_API_KEY

# Linera Testnet Configuration (Conway)
# Generated by deploy-testnet.sh on $(date)
VITE_USE_LINERA=true
VITE_LINERA_CHAIN_ID=$CHAIN_ID
VITE_LINERA_APP_ID=$APP_ID
VITE_LINERA_WALLET_OWNER=$OWNER
VITE_LINERA_PORT=8081
VITE_LINERA_GRAPHQL_URL=http://localhost:8081
EOF

echo -e "${GREEN}✅ .env.local updated${NC}"
echo ""

# Save deployment info
DEPLOY_INFO="$PROJECT_DIR/deployment-testnet.json"
cat > "$DEPLOY_INFO" << EOF
{
  "network": "testnet-conway",
  "deployedAt": "$(date -Iseconds)",
  "chainId": "$CHAIN_ID",
  "applicationId": "$APP_ID",
  "owner": "$OWNER",
  "faucetUrl": "$FAUCET_URL",
  "graphqlUrl": "http://localhost:8081",
  "applicationUrl": "http://localhost:8081/chains/$CHAIN_ID/applications/$APP_ID"
}
EOF

echo -e "${GREEN}✅ Deployment info saved to: deployment-testnet.json${NC}"
echo ""

# Summary
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo "  Network:        Testnet Conway"
echo "  Chain ID:       $CHAIN_ID"
echo "  Application ID: $APP_ID"
echo "  Owner:          $OWNER"
echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"
echo ""
echo "  1. Start the node service:"
echo "     ${YELLOW}linera service --port 8081${NC}"
echo ""
echo "  2. Test GraphQL at:"
echo "     ${YELLOW}http://localhost:8081${NC}"
echo ""
echo "  3. Access your application at:"
echo "     ${YELLOW}http://localhost:8081/chains/$CHAIN_ID/applications/$APP_ID${NC}"
echo ""
echo "  4. Start the frontend:"
echo "     ${YELLOW}cd $PROJECT_DIR && npm run dev${NC}"
echo ""
echo "════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}Happy building on Linera! 🚀${NC}"
