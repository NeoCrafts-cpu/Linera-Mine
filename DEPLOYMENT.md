# Linera Mine - Deployment Guide

This guide explains how to deploy Linera Mine with:
- **Frontend**: Vercel (React/Vite app)
- **Backend**: Render (Linera node with GraphQL API)

## Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────────────┐
│   Vercel (Frontend) │────▶│   Render (Linera Node)      │
│   React/Vite App    │     │   - GraphQL API             │
│   linera-mine.vercel│     │   - Smart Contract          │
│                     │     │   - Blockchain State        │
└─────────────────────┘     └─────────────────────────────┘
```

## Step 1: Deploy Linera Node on Render

### 1.1 Create Render Account
1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account

### 1.2 Create New Web Service
1. Click **New** → **Web Service**
2. Connect your `linera-mine` repository
3. Configure the service:

| Setting | Value |
|---------|-------|
| Name | `linera-node` |
| Region | Choose closest to users |
| Branch | `main` |
| Runtime | Docker |
| Dockerfile Path | `./Dockerfile.render` |
| Instance Type | Standard ($25/mo) or higher |

### 1.3 Add Persistent Disk
1. In service settings, go to **Disks**
2. Add a disk:
   - Name: `linera-data`
   - Mount Path: `/data`
   - Size: 10 GB

### 1.4 Environment Variables
Add these environment variables in Render dashboard:

| Variable | Value |
|----------|-------|
| `RUST_LOG` | `info` |
| `LINERA_PORT` | `8081` |
| `FAUCET_URL` | `https://faucet.conway.linera.net` |

### 1.5 Deploy
1. Click **Create Web Service**
2. Wait for the build (takes ~10-15 minutes first time)
3. Check the logs for:
   - Chain ID
   - App ID
   - GraphQL endpoint URL

Save these values - you'll need them for Vercel!

### 1.6 Verify Deployment
Test the GraphQL endpoint:
```bash
curl -X POST https://your-linera-node.onrender.com/chains/YOUR_CHAIN_ID/applications/YOUR_APP_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "{ stats { totalJobs totalAgents } }"}'
```

## Step 2: Deploy Frontend on Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com) and sign up
2. Connect your GitHub account

### 2.2 Import Project
1. Click **Add New** → **Project**
2. Import your `linera-mine` repository
3. Vercel auto-detects Vite framework

### 2.3 Configure Environment Variables
In Vercel project settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_USE_LINERA` | `true` |
| `VITE_LINERA_GRAPHQL_URL` | `https://your-linera-node.onrender.com` |
| `VITE_LINERA_CHAIN_ID` | Your Chain ID from Render logs |
| `VITE_LINERA_APP_ID` | Your App ID from Render logs |
| `VITE_LINERA_PORT` | `8081` |

### 2.4 Deploy
1. Click **Deploy**
2. Wait for build to complete
3. Access your app at the Vercel URL

## Step 3: Verify Everything Works

### 3.1 Test the Frontend
1. Open your Vercel deployment URL
2. Check browser console for "Linera Integration: enabled: true"
3. Try these actions:
   - Register as an agent
   - Post a job
   - Place a bid

### 3.2 Check Blockchain Connection
Open browser DevTools → Network tab and look for GraphQL requests to your Render service.

## Troubleshooting

### "Linera service not available"
- Check Render service is running
- Verify CORS is not blocking requests
- Check the GraphQL URL is correct

### "Network error" on frontend
- Ensure Render service URL uses HTTPS
- Check environment variables are set correctly
- Redeploy Vercel after changing env vars

### Render build fails
- Check Rust version compatibility
- Ensure Docker resources are sufficient
- Review build logs for specific errors

### Data not persisting
- Verify Render disk is mounted at `/data`
- Check deployment.env is being created
- Review Render service logs

## Updating the Deployment

### Update Smart Contract
1. Modify contract code in `linera-contracts/job-marketplace/`
2. Push to GitHub
3. Render will auto-redeploy
4. Note: This creates a new App ID!

### Update Frontend
1. Modify React components
2. Push to GitHub
3. Vercel will auto-redeploy

## Cost Estimates

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Render | Standard | ~$25 |
| Render Disk | 10 GB | ~$2.50 |
| Vercel | Hobby | Free |
| **Total** | | ~$27.50/mo |

## Local Development

For local development, use the included script:
```bash
./start-local.sh
```

This starts a local Linera network and deploys the contract automatically.

## Security Notes

1. **Never commit** `.env.local` to git
2. Use Vercel/Render secrets for sensitive values
3. The smart contract handles all payment logic on-chain
4. Frontend only reads/writes through GraphQL

## Support

- Linera Documentation: https://linera.dev
- GitHub Issues: Open an issue in the repository
