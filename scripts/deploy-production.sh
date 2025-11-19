#!/bin/bash

# Deploy Linera Job Marketplace to Production VPS
# Usage: ./scripts/deploy-production.sh <server-ip> <domain>
# Example: ./scripts/deploy-production.sh 192.168.1.100 marketplace.mydomain.com

set -e

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <server-ip> <domain>"
    echo "Example: $0 192.168.1.100 marketplace.mydomain.com"
    exit 1
fi

SERVER_IP=$1
DOMAIN=$2
SSH_USER="ubuntu"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Deploying to Production Server..."
echo "Server: $SERVER_IP"
echo "Domain: $DOMAIN"
echo ""

# Check SSH connection
echo "🔑 Checking SSH connection..."
if ! ssh -o ConnectTimeout=5 $SSH_USER@$SERVER_IP exit 2>/dev/null; then
    echo -e "${RED}❌ Cannot connect to $SERVER_IP${NC}"
    echo "Make sure:"
    echo "  1. Server is running"
    echo "  2. SSH key is added: ssh-copy-id $SSH_USER@$SERVER_IP"
    exit 1
fi

echo -e "${GREEN}✅ SSH connection OK${NC}"
echo ""

# Build contract locally
echo "🔨 Building contract locally..."
cd linera-contracts/job-marketplace
cargo build --release --target wasm32-unknown-unknown
cd ../..

echo -e "${GREEN}✅ Contract built${NC}"
echo ""

# Build frontend locally
echo "🎨 Building frontend..."
npm install
npm run build

echo -e "${GREEN}✅ Frontend built${NC}"
echo ""

# Deploy to server
echo "📦 Deploying to server..."

ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
set -e

# Update system
echo "📦 Updating system..."
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev git curl nginx certbot python3-certbot-nginx

# Install Rust if not present
if ! command -v rustup &> /dev/null; then
    echo "🦀 Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    rustup default 1.86.0
fi

# Install Linera if not present
if ! command -v linera &> /dev/null; then
    echo "⛓️ Installing Linera CLI..."
    cargo install linera-cli@0.15.6
fi

# Create directory
mkdir -p ~/linera-marketplace
ENDSSH

echo -e "${GREEN}✅ Server prepared${NC}"
echo ""

# Copy files to server
echo "📤 Uploading files..."
scp -r linera-contracts $SSH_USER@$SERVER_IP:~/linera-marketplace/
scp -r dist $SSH_USER@$SERVER_IP:~/linera-marketplace/frontend

echo -e "${GREEN}✅ Files uploaded${NC}"
echo ""

# Setup validator and deploy contract
echo "⛓️ Setting up validator and deploying contract..."

ssh $SSH_USER@$SERVER_IP << 'ENDSSH'
set -e
source $HOME/.cargo/env

cd ~/linera-marketplace

# Start validator if not running
if ! pgrep -f "linera net" > /dev/null; then
    echo "🔄 Starting validator..."
    linera net up --validators 1 > /tmp/linera-network.log 2>&1 &
    sleep 5
fi

# Get wallet paths
export LINERA_WALLET=$(grep "LINERA_WALLET=" /tmp/linera-network.log | cut -d'=' -f2 | tr -d '"')
export LINERA_KEYSTORE=$(grep "LINERA_KEYSTORE=" /tmp/linera-network.log | cut -d'=' -f2 | tr -d '"')
export LINERA_STORAGE=$(grep "LINERA_STORAGE=" /tmp/linera-network.log | cut -d'=' -f2 | tr -d '"')

# Deploy contract
cd linera-contracts/job-marketplace
linera publish-and-create \
    target/wasm32-unknown-unknown/release/job-marketplace-contract.wasm \
    target/wasm32-unknown-unknown/release/job-marketplace-service.wasm \
    --json-argument 'null' > /tmp/deploy-output.txt 2>&1

# Extract info
CHAIN_ID=$(linera wallet show | grep "Chain ID:" | head -1 | awk '{print $3}')
OWNER=$(linera wallet show | grep "Default owner:" | head -1 | awk '{print $3}')
APP_ID=$(grep -o 'application [a-f0-9]*' /tmp/deploy-output.txt | awk '{print $2}')

# Save to file
cat > ~/linera-marketplace/deployment-info.txt << EOF
CHAIN_ID=$CHAIN_ID
APP_ID=$APP_ID
OWNER=$OWNER
LINERA_WALLET=$LINERA_WALLET
LINERA_KEYSTORE=$LINERA_KEYSTORE
LINERA_STORAGE=$LINERA_STORAGE
EOF

echo "Deployment info saved"
ENDSSH

# Get deployment info
echo "📋 Getting deployment info..."
scp $SSH_USER@$SERVER_IP:~/linera-marketplace/deployment-info.txt /tmp/deployment-info.txt
source /tmp/deployment-info.txt

echo -e "${GREEN}✅ Contract deployed${NC}"
echo "Chain ID: $CHAIN_ID"
echo "App ID: $APP_ID"
echo ""

# Setup GraphQL service as systemd service
echo "🔧 Setting up GraphQL service..."

ssh $SSH_USER@$SERVER_IP << ENDSSH
set -e
source ~/linera-marketplace/deployment-info.txt

# Create systemd service
sudo tee /etc/systemd/system/linera-graphql.service > /dev/null << EOF
[Unit]
Description=Linera GraphQL Service
After=network.target

[Service]
Type=simple
User=$SSH_USER
WorkingDirectory=$HOME/linera-marketplace
Environment="LINERA_WALLET=\$LINERA_WALLET"
Environment="LINERA_KEYSTORE=\$LINERA_KEYSTORE"
Environment="LINERA_STORAGE=\$LINERA_STORAGE"
ExecStart=$HOME/.cargo/bin/linera service --port 8081
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable linera-graphql
sudo systemctl restart linera-graphql
ENDSSH

echo -e "${GREEN}✅ GraphQL service running${NC}"
echo ""

# Setup Nginx for GraphQL API
echo "🌐 Configuring Nginx for API..."

ssh $SSH_USER@$SERVER_IP << ENDSSH
# GraphQL API config
sudo tee /etc/nginx/sites-available/linera-api > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# Frontend config
sudo tee /etc/nginx/sites-available/linera-frontend > /dev/null << 'EOF'
server {
    listen 80;
    server_name $DOMAIN;

    root $HOME/linera-marketplace/frontend;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Enable sites
sudo ln -sf /etc/nginx/sites-available/linera-api /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/linera-frontend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
ENDSSH

echo -e "${GREEN}✅ Nginx configured${NC}"
echo ""

# Setup SSL
echo "🔒 Setting up SSL certificates..."
echo -e "${YELLOW}Please ensure DNS records point to $SERVER_IP:${NC}"
echo "  A record: $DOMAIN -> $SERVER_IP"
echo "  A record: api.$DOMAIN -> $SERVER_IP"
echo ""
read -p "Press Enter when DNS is configured..."

ssh $SSH_USER@$SERVER_IP << ENDSSH
sudo certbot --nginx -d $DOMAIN -d api.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || echo "SSL setup failed, continuing..."
ENDSSH

echo ""

# Summary
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 Production Deployment Complete!${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "🌐 Your application is live at:"
echo "  Frontend:  https://$DOMAIN"
echo "  API:       https://api.$DOMAIN"
echo ""
echo "📊 Deployment Details:"
echo "  Server:    $SERVER_IP"
echo "  Chain ID:  $CHAIN_ID"
echo "  App ID:    $APP_ID"
echo "  Owner:     $OWNER"
echo ""
echo "🔧 Server Management:"
echo "  SSH:       ssh $SSH_USER@$SERVER_IP"
echo "  Logs:      sudo journalctl -u linera-graphql -f"
echo "  Restart:   sudo systemctl restart linera-graphql"
echo ""
echo "📚 See DEPLOYMENT_GUIDE.md for maintenance instructions"
echo "════════════════════════════════════════════════════════"

# Save deployment info locally
cat > deployment-production.txt << EOF
DEPLOYMENT_DATE=$(date)
SERVER=$SERVER_IP
DOMAIN=$DOMAIN
CHAIN_ID=$CHAIN_ID
APP_ID=$APP_ID
OWNER=$OWNER
FRONTEND_URL=https://$DOMAIN
API_URL=https://api.$DOMAIN
EOF

echo ""
echo "💾 Deployment info saved to deployment-production.txt"
