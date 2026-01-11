#!/bin/bash
# ===================================
# Linera Node Startup Script for Render
# ===================================
# This script initializes and runs the Linera node service
# for production deployment on Render.com

set -e

echo "=== Linera Node Service ==="
echo "Starting at $(date)"
echo "Linera version: $(linera --version 2>&1 || echo 'unknown')"
echo ""

# Configuration
LINERA_PORT=${LINERA_PORT:-8081}
DATA_DIR=${DATA_DIR:-/data}
WALLET_DIR="$DATA_DIR/wallet"
CONTRACTS_DIR="/contracts"
FAUCET_URL=${FAUCET_URL:-"https://faucet.testnet-conway.linera.net"}

mkdir -p "$WALLET_DIR"

export LINERA_WALLET="$WALLET_DIR/wallet.json"
export LINERA_KEYSTORE="$WALLET_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$WALLET_DIR/storage.db"

# Function to check if wallet exists
wallet_exists() {
    [ -f "$LINERA_WALLET" ] && [ -f "$LINERA_KEYSTORE" ]
}

# Function to check if app is deployed
app_deployed() {
    [ -f "$DATA_DIR/deployment.env" ]
}

echo "1. Checking wallet..."
if wallet_exists; then
    echo "   Wallet found at $WALLET_DIR"
else
    echo "   Initializing new wallet from faucet: $FAUCET_URL"
    linera wallet init --faucet "$FAUCET_URL" || {
        echo "   ERROR: Failed to initialize wallet"
        exit 1
    }
    echo "   Wallet initialized!"
fi

echo ""
echo "2. Checking chain..."
# Get chain ID from wallet
CHAIN_ID=""
if linera wallet show 2>/dev/null | grep -q "Chain ID"; then
    CHAIN_ID=$(linera wallet show 2>/dev/null | grep "Chain ID:" | head -1 | awk '{print $3}')
fi

if [ -z "$CHAIN_ID" ]; then
    echo "   Requesting new chain from faucet..."
    linera wallet request-chain --faucet "$FAUCET_URL" > /tmp/chain_info.txt 2>&1 || {
        echo "   ERROR: Failed to request chain"
        cat /tmp/chain_info.txt
        exit 1
    }
    # Extract chain ID (64 hex chars)
    CHAIN_ID=$(grep -oE '[a-f0-9]{64}' /tmp/chain_info.txt | head -1)
    echo "   New chain obtained: $CHAIN_ID"
else
    echo "   Using existing chain: $CHAIN_ID"
fi

if [ -z "$CHAIN_ID" ]; then
    echo "   ERROR: Could not determine chain ID"
    exit 1
fi

echo ""
echo "3. Checking application deployment..."
APP_ID=""
if app_deployed; then
    echo "   Loading existing deployment..."
    source "$DATA_DIR/deployment.env"
    echo "   App ID: $APP_ID"
else
    echo "   Deploying application..."
    
    # Find contract files
    CONTRACT_WASM="$CONTRACTS_DIR/job-marketplace-contract.wasm"
    SERVICE_WASM="$CONTRACTS_DIR/job-marketplace-service.wasm"
    
    if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
        echo "   ERROR: Contract WASM files not found!"
        ls -la "$CONTRACTS_DIR" || true
        exit 1
    fi
    
    echo "   Publishing and creating application..."
    DEPLOY_OUTPUT=$(linera publish-and-create \
        "$CONTRACT_WASM" \
        "$SERVICE_WASM" \
        --json-argument "null" 2>&1) || {
        echo "   ERROR: Deployment failed"
        echo "$DEPLOY_OUTPUT"
        exit 1
    }
    
    # Extract App ID (64 hex chars from last line)
    APP_ID=$(echo "$DEPLOY_OUTPUT" | grep -oE '[a-f0-9]{64}' | tail -1)
    
    if [ -z "$APP_ID" ]; then
        echo "   ERROR: Could not extract App ID"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    echo "   Application deployed!"
    echo "   App ID: $APP_ID"
    
    # Save deployment info
    cat > "$DATA_DIR/deployment.env" << EOF
CHAIN_ID=$CHAIN_ID
APP_ID=$APP_ID
DEPLOYED_AT=$(date -Iseconds)
EOF
fi

echo ""
echo "============================================"
echo "=== DEPLOYMENT INFO (SAVE THESE VALUES) ==="
echo "============================================"
echo ""
echo "CHAIN_ID=$CHAIN_ID"
echo "APP_ID=$APP_ID"
echo ""
echo "GraphQL Endpoint:"
echo "  https://YOUR_RENDER_URL/chains/$CHAIN_ID/applications/$APP_ID"
echo ""
echo "============================================"
echo ""
echo "4. Starting GraphQL service on port $LINERA_PORT..."

# Start the GraphQL service
exec linera service --port "$LINERA_PORT" --listen-address 0.0.0.0
