#!/bin/bash
# ===================================
# Linera Node Startup Script for Render
# ===================================
# This script initializes and runs the Linera node service
# for production deployment on Render.com

set -e

echo "=== Linera Node Service ==="
echo "Starting at $(date)"
echo ""

# Configuration
LINERA_PORT=${LINERA_PORT:-8081}
DATA_DIR=${DATA_DIR:-/data}
WALLET_DIR="$DATA_DIR/wallet"
CONTRACTS_DIR="/contracts"
FAUCET_URL=${FAUCET_URL:-"https://faucet.conway.linera.net"}

# Check for testnet mode
USE_TESTNET=${USE_TESTNET:-true}

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
    echo "   Initializing new wallet..."
    linera wallet init --faucet "$FAUCET_URL"
    echo "   Wallet initialized!"
fi

echo ""
echo "2. Checking chain..."
# Get or request a chain
if ! linera wallet show 2>/dev/null | grep -q "Chain"; then
    echo "   Requesting chain from faucet..."
    linera wallet request-chain --faucet "$FAUCET_URL" > /tmp/chain_info.txt 2>&1
    CHAIN_ID=$(head -1 /tmp/chain_info.txt)
    echo "   Chain obtained: $CHAIN_ID"
else
    CHAIN_ID=$(linera wallet show 2>/dev/null | grep -E "^[a-f0-9]{64}" | head -1)
    echo "   Using existing chain: $CHAIN_ID"
fi

echo ""
echo "3. Checking application deployment..."
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
        echo "   Looking for: $CONTRACT_WASM"
        echo "   Looking for: $SERVICE_WASM"
        ls -la "$CONTRACTS_DIR" || true
        exit 1
    fi
    
    # Deploy the application
    APP_ID=$(linera publish-and-create \
        "$CONTRACT_WASM" \
        "$SERVICE_WASM" \
        --json-argument "null" 2>&1 | tail -1)
    
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
echo "4. Starting GraphQL service on port $LINERA_PORT..."
echo ""
echo "=== Service Info ==="
echo "Chain ID: $CHAIN_ID"
echo "App ID:   $APP_ID"
echo "GraphQL:  http://0.0.0.0:$LINERA_PORT"
echo "Endpoint: http://0.0.0.0:$LINERA_PORT/chains/$CHAIN_ID/applications/$APP_ID"
echo "==================="
echo ""

# Start the GraphQL service
# The --listen-address makes it accessible externally
exec linera service --port "$LINERA_PORT" --listen-address 0.0.0.0
