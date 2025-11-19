# Quick Deployment Reference

## 🚀 Three Ways to Deploy

### 1️⃣ Linera Devnet (Fastest - 5 minutes)
**Best for:** Testing, demos, hackathons
**Cost:** Free

```bash
./scripts/deploy-devnet.sh
```

Then in separate terminals:
```bash
# Terminal 1: Start GraphQL
linera service --port 8081

# Terminal 2: Start frontend
npm run dev
```

---

### 2️⃣ Production VPS (Full Control - 20 minutes)
**Best for:** Real applications with moderate traffic
**Cost:** ~$25/month (DigitalOcean, Linode, etc.)

**Prerequisites:**
- VPS with Ubuntu 22.04
- Domain name with DNS configured
- SSH access configured

```bash
./scripts/deploy-production.sh <server-ip> <your-domain.com>
```

**Example:**
```bash
./scripts/deploy-production.sh 192.168.1.100 marketplace.linera.app
```

**What it does:**
- ✅ Installs all dependencies
- ✅ Starts Linera validator
- ✅ Deploys smart contract
- ✅ Configures Nginx
- ✅ Sets up SSL certificates
- ✅ Runs as systemd service

**Access your app:**
- Frontend: `https://your-domain.com`
- API: `https://api.your-domain.com`

---

### 3️⃣ Vercel (Easiest Frontend - 2 minutes)
**Best for:** Quick frontend deployment
**Cost:** Free tier available

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# VITE_USE_LINERA=true
# VITE_LINERA_CHAIN_ID=<your-chain-id>
# VITE_LINERA_APP_ID=<your-app-id>
# VITE_LINERA_WALLET_OWNER=<your-owner>
# VITE_LINERA_GRAPHQL_URL=<your-api-url>
```

---

## 🎯 Which One Should I Use?

| Scenario | Recommendation |
|----------|---------------|
| Just testing | Devnet |
| Hackathon/Demo | Devnet |
| MVP/Beta | Production VPS |
| Production App | Production VPS + Vercel |
| Need Scaling | AWS/GCP (see DEPLOYMENT_GUIDE.md) |

---

## 📞 Need Help?

See detailed guides:
- Full deployment options: `DEPLOYMENT_GUIDE.md`
- Testing guide: `TESTING_GUIDE.md`
- Quick start: `README.md`

---

## ⚡ Quick Commands

### Check deployment status:
```bash
# GraphQL service
curl http://localhost:8081/

# Blockchain status
linera wallet show

# Check blocks
linera wallet show | grep "Blocks:"
```

### View logs:
```bash
# Local development
tail -f /tmp/linera-network.log

# Production (systemd)
sudo journalctl -u linera-graphql -f
```

### Restart services:
```bash
# Local
pkill linera && linera net up

# Production
sudo systemctl restart linera-graphql
```

---

## 🔄 Update Deployed App

### Update contract:
```bash
cd linera-contracts/job-marketplace
cargo build --release --target wasm32-unknown-unknown
linera publish-and-create target/wasm32-unknown-unknown/release/*.wasm --json-argument 'null'
# Update .env.local with new APP_ID
```

### Update frontend:
```bash
npm run build
# Upload dist/ to your server or redeploy to Vercel
```

---

## 💰 Cost Comparison

| Option | Setup Time | Monthly Cost | Good For |
|--------|-----------|--------------|----------|
| Devnet | 5 min | $0 | Testing |
| VPS (DigitalOcean) | 20 min | $24 | Production |
| VPS + Vercel | 25 min | $24 | Production + CDN |
| AWS Full Stack | 1 hour | $50-100 | Enterprise |

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Smart contract tested locally
- [ ] Frontend tested with test data
- [ ] Environment variables configured
- [ ] Domain DNS configured (for VPS)
- [ ] SSL certificates (auto-handled by scripts)
- [ ] Backup strategy (see DEPLOYMENT_GUIDE.md)
- [ ] Monitoring setup
- [ ] Error tracking (optional: Sentry)

---

## 🎉 That's It!

Your Linera job marketplace is now deployed and ready to use!

For advanced configurations, see `DEPLOYMENT_GUIDE.md`
