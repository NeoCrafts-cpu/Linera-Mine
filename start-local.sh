#!/bin/bash
# Linera Mine Local Development Startup Script

set -e

echo "=== Linera Mine Local Startup ==="
echo ""

# Configuration
WALLET_DIR="/tmp/linera-wallet"
NETWORK_LOG="/tmp/linera-network.log"
SERVICE_LOG="/tmp/linera-service.log"
WASM_DIR="/mnt/e/AKINDO/linera-mine/linera-contracts/job-marketplace/target/wasm32-unknown-unknown/release"

# Kill any existing linera processes
echo "1. Stopping existing processes..."
pkill -f linera 2>/dev/null || true
sleep 2

# Clean up old data
echo "2. Cleaning up old data..."
rm -rf /tmp/.tmp* /tmp/linera* 2>/dev/null || true
rm -rf "$WALLET_DIR" 2>/dev/null || true
mkdir -p "$WALLET_DIR"

# Start the network
echo "3. Starting Linera network..."
nohup linera net up --with-faucet --faucet-port 8079 > "$NETWORK_LOG" 2>&1 &
NETWORK_PID=$!
echo "   Network PID: $NETWORK_PID"

# Wait for network to be ready
echo "   Waiting for network..."
for i in {1..60}; do
    if grep -q "READY" "$NETWORK_LOG" 2>/dev/null; then
        echo "   Network is ready!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "   ERROR: Network failed to start!"
        cat "$NETWORK_LOG"
        exit 1
    fi
    sleep 1
done

# Get network temp directory
NETWORK_TMPDIR=$(grep "LINERA_WALLET" "$NETWORK_LOG" | sed 's/.*LINERA_WALLET="//;s/\/wallet_0.json"$//' | head -1)
echo "   Network temp dir: $NETWORK_TMPDIR"

# Initialize wallet
echo "4. Initializing wallet..."
export LINERA_WALLET="$WALLET_DIR/wallet.json"
export LINERA_KEYSTORE="$WALLET_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$WALLET_DIR/storage.db"

linera wallet init --faucet http://localhost:8079

# Request a chain
echo "5. Requesting chain..."
linera wallet request-chain --faucet http://localhost:8079 > /tmp/chain_info.txt 2>&1
CHAIN_ID=$(head -1 /tmp/chain_info.txt)
OWNER=$(tail -1 /tmp/chain_info.txt | grep -oE '0x[a-f0-9]+')
echo "   Chain ID: $CHAIN_ID"
echo "   Owner: $OWNER"

# Deploy the application
echo "6. Deploying application..."
APP_ID=$(linera publish-and-create \
    "$WASM_DIR/job-marketplace-contract.wasm" \
    "$WASM_DIR/job-marketplace-service.wasm" \
    --json-argument "null" 2>&1 | tail -1)
echo "   App ID: $APP_ID"

# Start the GraphQL service
echo "7. Starting GraphQL service on port 8081..."
nohup bash -c 'LINERA_WALLET="'$WALLET_DIR'/wallet.json" LINERA_KEYSTORE="'$WALLET_DIR'/keystore.json" LINERA_STORAGE="rocksdb:'$WALLET_DIR'/storage.db" linera service --port 8081' > "$SERVICE_LOG" 2>&1 &
SERVICE_PID=$!
echo "   Service PID: $SERVICE_PID"
sleep 3

# Verify service is running
if pgrep -f "linera service" > /dev/null; then
    echo "   Service started successfully!"
else
    echo "   ERROR: Service failed to start!"
    cat "$SERVICE_LOG"
    exit 1
fi

# Update .env.local
echo "8. Updating .env.local..."
cat > /mnt/e/AKINDO/linera-mine/.env.local << EOF
GEMINI_API_KEY=PLACEHOLDER_API_KEY

# Linera Blockchain Configuration (LOCAL DEVNET - DEPLOYED!)
VITE_USE_LINERA=true
VITE_LINERA_CHAIN_ID=$CHAIN_ID
VITE_LINERA_APP_ID=$APP_ID
VITE_LINERA_WALLET_OWNER=$OWNER
VITE_LINERA_PORT=8081
VITE_LINERA_GRAPHQL_URL=http://localhost:8081
EOF

# Test the endpoint
echo "9. Testing GraphQL endpoint..."
RESPONSE=$(curl -s -X POST "http://localhost:8081/chains/$CHAIN_ID/applications/$APP_ID" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ stats { totalJobs } }"}' 2>/dev/null)
echo "   Response: $RESPONSE"

echo ""
echo "=== Startup Complete ==="
echo ""
echo "Network running (PID: $NETWORK_PID)"
echo "Service running (PID: $SERVICE_PID)"
echo ""
echo "Chain ID: $CHAIN_ID"
echo "App ID:   $APP_ID"
echo "Owner:    $OWNER"
echo ""
echo "GraphQL IDE: http://localhost:8081"
echo "App endpoint: http://localhost:8081/chains/$CHAIN_ID/applications/$APP_ID"
echo ""
echo "To start the frontend: npm run dev"
echo ""
