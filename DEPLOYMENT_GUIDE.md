# Linera Job Marketplace - Deployment Guide

## Overview

This guide covers deploying your Linera job marketplace to production. You have several options depending on your infrastructure preferences.

---

## 🚀 Quick Deploy Options

### Option 1: Deploy to Linera Devnet (Easiest)
Deploy your contract to Linera's official test network.

### Option 2: Self-Hosted Validator (Full Control)
Run your own Linera validator node with public access.

### Option 3: Cloud Deployment (Scalable)
Deploy to AWS/GCP/Azure with managed infrastructure.

---

## 📋 Prerequisites

- Rust 1.86.0 (for SDK 0.15.6 compatibility)
- Node.js 18+ and npm
- Linera CLI installed
- Domain name (optional, for custom domains)
- SSL certificate (for production HTTPS)

---

## Option 1: Deploy to Linera Devnet

### Step 1: Connect to Devnet

```bash
# Set devnet endpoint
export LINERA_DEVNET=https://devnet.linera.io

# Create wallet for devnet
linera wallet init --with-new-chain --faucet $LINERA_DEVNET/faucet

# This will give you tokens on devnet
```

### Step 2: Deploy Contract

```bash
cd linera-contracts/job-marketplace

# Build contract
cargo build --release --target wasm32-unknown-unknown

# Deploy to devnet
linera publish-and-create \
  target/wasm32-unknown-unknown/release/job-marketplace-contract.wasm \
  target/wasm32-unknown-unknown/release/job-marketplace-service.wasm \
  --json-argument 'null'

# Note the App ID output
```

### Step 3: Start GraphQL Service

```bash
# Start service pointing to devnet
linera service --port 8081
```

### Step 4: Deploy Frontend

**Option A: Vercel (Recommended)**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
cd /path/to/linera-mine
vercel

# Follow prompts, set environment variables:
# VITE_USE_LINERA=true
# VITE_LINERA_CHAIN_ID=<your-chain-id>
# VITE_LINERA_APP_ID=<your-app-id>
# VITE_LINERA_GRAPHQL_URL=<your-graphql-url>
# VITE_LINERA_WALLET_OWNER=<your-owner-address>
```

**Option B: Netlify**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build frontend
npm run build

# Deploy
netlify deploy --prod --dir=dist

# Set environment variables in Netlify dashboard
```

---

## Option 2: Self-Hosted Validator

### Step 1: Server Setup

**Requirements:**
- Ubuntu 22.04 LTS
- 4+ CPU cores
- 8GB+ RAM
- 100GB+ SSD
- Public IP address
- Domain name (optional)

```bash
# SSH into your server
ssh user@your-server.com

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y build-essential pkg-config libssl-dev git curl

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup default 1.86.0

# Install Linera CLI
cargo install linera-cli@0.15.6
```

### Step 2: Run Validator Node

```bash
# Create validator directory
mkdir -p ~/linera-validator
cd ~/linera-validator

# Start validator node
linera net up --validators 1 --extra-wallets 0

# This creates a local network you can expose publicly
```

### Step 3: Expose GraphQL Service

**Using Nginx as Reverse Proxy:**

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/linera-graphql
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or use IP address

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/linera-graphql /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Step 4: Deploy Contract

```bash
# Export wallet paths
export LINERA_WALLET="$HOME/linera-validator/wallet_0.json"
export LINERA_KEYSTORE="$HOME/linera-validator/keystore_0.json"
export LINERA_STORAGE="rocksdb:$HOME/linera-validator/client_0.db"

# Clone your repo
git clone https://github.com/NeoCrafts-cpu/Linera-Mine.git
cd Linera-Mine/linera-contracts/job-marketplace

# Build contract
cargo build --release --target wasm32-unknown-unknown

# Deploy contract
linera publish-and-create \
  target/wasm32-unknown-unknown/release/job-marketplace-contract.wasm \
  target/wasm32-unknown-unknown/release/job-marketplace-service.wasm \
  --json-argument 'null'

# Note the Chain ID and App ID
```

### Step 5: Start GraphQL as System Service

```bash
# Create systemd service
sudo nano /etc/systemd/system/linera-graphql.service
```

Add this configuration:

```ini
[Unit]
Description=Linera GraphQL Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/linera-validator
Environment="LINERA_WALLET=/home/your-username/linera-validator/wallet_0.json"
Environment="LINERA_KEYSTORE=/home/your-username/linera-validator/keystore_0.json"
Environment="LINERA_STORAGE=rocksdb:/home/your-username/linera-validator/client_0.db"
ExecStart=/home/your-username/.cargo/bin/linera service --port 8081
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable linera-graphql
sudo systemctl start linera-graphql
sudo systemctl status linera-graphql
```

### Step 6: Deploy Frontend

```bash
# On your server
cd ~/Linera-Mine

# Create .env.local with production values
cat > .env.local << EOF
VITE_USE_LINERA=true
VITE_LINERA_CHAIN_ID=<your-chain-id>
VITE_LINERA_APP_ID=<your-app-id>
VITE_LINERA_WALLET_OWNER=<your-owner-address>
VITE_LINERA_PORT=443
VITE_LINERA_GRAPHQL_URL=https://your-domain.com
EOF

# Install dependencies and build
npm install
npm run build

# Serve with Nginx
sudo nano /etc/nginx/sites-available/linera-frontend
```

Frontend Nginx config:

```nginx
server {
    listen 80;
    server_name app.your-domain.com;

    root /home/your-username/Linera-Mine/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/linera-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d app.your-domain.com
```

---

## Option 3: Cloud Deployment (AWS Example)

### Architecture

- **EC2 Instance**: Runs Linera validator + GraphQL service
- **S3 + CloudFront**: Hosts frontend static files
- **Route53**: DNS management
- **ACM**: SSL certificates

### Step 1: Launch EC2 Instance

```bash
# Launch Ubuntu 22.04 t3.medium instance
# Security Groups:
# - Port 22 (SSH)
# - Port 80 (HTTP)
# - Port 443 (HTTPS)
# - Port 8081 (GraphQL - internal only)

# SSH into instance
ssh -i your-key.pem ubuntu@ec2-instance-ip
```

### Step 2: Setup Validator (Same as Option 2 Steps 1-5)

### Step 3: Deploy Frontend to S3 + CloudFront

```bash
# On your local machine
cd /path/to/linera-mine

# Create production .env.local
cat > .env.local << EOF
VITE_USE_LINERA=true
VITE_LINERA_CHAIN_ID=<your-chain-id>
VITE_LINERA_APP_ID=<your-app-id>
VITE_LINERA_WALLET_OWNER=<your-owner-address>
VITE_LINERA_PORT=443
VITE_LINERA_GRAPHQL_URL=https://api.your-domain.com
EOF

# Build frontend
npm run build

# Install AWS CLI
pip install awscli

# Create S3 bucket
aws s3 mb s3://linera-marketplace-frontend

# Upload files
aws s3 sync dist/ s3://linera-marketplace-frontend --delete

# Configure bucket for static website hosting
aws s3 website s3://linera-marketplace-frontend \
  --index-document index.html \
  --error-document index.html

# Create CloudFront distribution (via AWS Console)
# Point to S3 bucket
# Setup custom domain
# Enable HTTPS with ACM certificate
```

---

## 🔒 Security Considerations

### 1. Environment Variables
Never commit sensitive data. Use:
- `.env.local` for local development
- Environment variables in hosting platform for production
- Secrets manager for cloud deployments

### 2. CORS Configuration

Update your GraphQL service to allow frontend domain:

```bash
# When starting service, add allowed origins
linera service --port 8081 --allowed-origin https://your-frontend-domain.com
```

### 3. Rate Limiting

Add rate limiting in Nginx:

```nginx
limit_req_zone $binary_remote_addr zone=graphql_limit:10m rate=10r/s;

location / {
    limit_req zone=graphql_limit burst=20 nodelay;
    proxy_pass http://127.0.0.1:8081;
}
```

### 4. Firewall

```bash
# UFW on Ubuntu
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 5. Regular Backups

```bash
# Backup wallet and database
tar -czf linera-backup-$(date +%Y%m%d).tar.gz \
  ~/.linera-validator/wallet_0.json \
  ~/.linera-validator/keystore_0.json \
  ~/.linera-validator/client_0.db

# Upload to S3 or backup service
```

---

## 🎯 Production Checklist

- [ ] Smart contract tested on local network
- [ ] Frontend tested with test wallet
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Monitoring setup (logs, metrics)
- [ ] Backup strategy implemented
- [ ] Domain DNS configured
- [ ] Firewall rules applied
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Analytics configured (optional)

---

## 📊 Monitoring

### View Logs

```bash
# GraphQL service logs
sudo journalctl -u linera-graphql -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check blockchain status
linera wallet show
```

### Health Checks

```bash
# Check GraphQL service
curl http://localhost:8081/health

# Check blockchain
export LINERA_WALLET="path/to/wallet_0.json"
export LINERA_KEYSTORE="path/to/keystore_0.json"
export LINERA_STORAGE="rocksdb:path/to/client_0.db"
linera wallet show
```

---

## 🔄 Updates & Maintenance

### Update Smart Contract

```bash
# Build new version
cd linera-contracts/job-marketplace
cargo build --release --target wasm32-unknown-unknown

# Deploy new version
linera publish-and-create \
  target/wasm32-unknown-unknown/release/job-marketplace-contract.wasm \
  target/wasm32-unknown-unknown/release/job-marketplace-service.wasm \
  --json-argument 'null'

# Update frontend .env.local with new App ID
# Rebuild and redeploy frontend
```

### Update Frontend Only

```bash
cd ~/Linera-Mine
git pull origin main
npm install
npm run build

# If using Vercel/Netlify, it auto-deploys on push
# If self-hosted, files are already in place (dist/)
```

---

## 💡 Cost Estimates

### Linera Devnet
- **Cost**: Free (testnet only)
- **Good for**: Testing, demos, hackathons

### Self-Hosted (VPS)
- **DigitalOcean Droplet**: $24/month (4GB RAM)
- **Cloudflare**: Free (DNS + CDN)
- **Total**: ~$25/month
- **Good for**: Small to medium projects

### AWS Cloud
- **EC2 t3.medium**: ~$30/month
- **S3 + CloudFront**: ~$5-20/month
- **Route53**: $0.50/month
- **Total**: ~$40-60/month
- **Good for**: Production with scaling needs

---

## 🆘 Troubleshooting

### GraphQL Service Won't Start

```bash
# Check if port is in use
sudo lsof -i :8081

# Check wallet paths
echo $LINERA_WALLET
echo $LINERA_KEYSTORE
echo $LINERA_STORAGE

# View detailed logs
linera service --port 8081 --verbose
```

### Frontend Can't Connect

```bash
# Check CORS in browser console
# Verify GraphQL URL in .env.local
# Test GraphQL endpoint
curl https://your-domain.com/graphql

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Contract Deploy Fails

```bash
# Verify wallet has tokens
linera wallet show

# Check contract compiles
cargo build --release --target wasm32-unknown-unknown

# Try with verbose output
linera publish-and-create --verbose ...
```

---

## 📞 Support

- **Linera Docs**: https://linera.dev
- **GitHub Issues**: https://github.com/NeoCrafts-cpu/Linera-Mine/issues
- **Discord**: Join Linera Discord for community support

---

## 🎉 Quick Production Deploy (TL;DR)

**For fastest deployment to production:**

1. **Deploy contract to Devnet** (5 minutes)
2. **Deploy frontend to Vercel** (2 minutes)
3. **Done!**

```bash
# Connect to devnet
linera wallet init --with-new-chain --faucet https://devnet.linera.io/faucet

# Deploy contract
cd linera-contracts/job-marketplace
cargo build --release --target wasm32-unknown-unknown
linera publish-and-create target/wasm32-unknown-unknown/release/*.wasm --json-argument 'null'

# Deploy frontend
cd ../..
vercel  # Follow prompts, add env vars from .env.local
```

**Your app is now live! 🚀**
