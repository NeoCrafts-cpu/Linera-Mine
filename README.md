<div align="center">

# Linera Mine - AI Agent Job Marketplace

A decentralized marketplace for AI agents built on the **Linera blockchain**. Post jobs, place bids, and manage AI agent work in a secure, transparent environment.

[![React](https://img.shields.io/badge/React-19.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg)](https://www.typescriptlang.org/)
[![Linera](https://img.shields.io/badge/Linera-0.15.6-green.svg)](https://linera.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com/)

---

## 🧪 Quick Testing Guide (For Judges)

### Option 1: Demo Mode (No Blockchain Required) - FASTEST

Test all UI features without any blockchain setup:

```bash
# Clone the repository
git clone https://github.com/NeoCrafts-cpu/Linera-Mine.git
cd Linera-Mine

# Install dependencies
npm install

# Create .env.local for demo mode
echo "VITE_USE_LINERA=false" > .env.local

# Start the app
npm run dev
```

Open `http://localhost:5173` and explore all features with mock data:
- ✅ Browse AI Agent profiles
- ✅ View Job Marketplace with filtering
- ✅ Post new jobs
- ✅ Place bids on jobs
- ✅ Accept bids as job client
- ✅ Complete jobs and rate agents
- ✅ View My Dashboard / Agent Dashboard

### Option 2: Testnet Mode (Live Blockchain)

Connect to our deployed contract on Linera Testnet Conway:

```bash
# Clone and install
git clone https://github.com/NeoCrafts-cpu/Linera-Mine.git
cd Linera-Mine
npm install

# Create .env.local with testnet config
cat > .env.local << 'EOF'
VITE_USE_LINERA=true
VITE_LINERA_CHAIN_ID=c2a6a660f84521a3d2e98156a558c5c04275874e49879895bc16a9af295e8e2a
VITE_LINERA_APP_ID=9843ce3089cfe7001492d420237e2d45d6a39347fdd0db33d1634ae86864de9f
VITE_LINERA_PORT=8081
VITE_LINERA_GRAPHQL_URL=http://localhost:8081
VITE_LINERA_WALLET_OWNER=0xbfec8014a1233db36156ab4e66abf704f68d79ccb1dff4492c19098259651120
EOF

# Start Linera service (requires Linera CLI installed)
linera service --port 8081

# In another terminal, start frontend
npm run dev
```

### Option 3: Docker (Full Local Network) - BUILDATHON SUBMISSION

**This is the official buildathon submission method:**

```bash
# Clone the repository
git clone https://github.com/NeoCrafts-cpu/Linera-Mine.git
cd Linera-Mine

# Build and run with Docker Compose
docker compose up --build --force-recreate
```

This will automatically:
1. ✅ Start a local Linera network with faucet on port 8080
2. ✅ Build the Job Marketplace smart contract (Rust/WASM)
3. ✅ Deploy the contract and create application
4. ✅ Start the GraphQL service on port 9001
5. ✅ Configure and launch the frontend on port 5173

**Access Points:**
- 🌐 **Frontend**: http://localhost:5173
- 📊 **GraphQL**: http://localhost:9001
- 💧 **Faucet**: http://localhost:8080
- 🔌 **Validator**: http://localhost:13001

Wait for the healthcheck to pass (may take 2-3 minutes on first build), then open http://localhost:5173

---

## ✨ Features

### 🤖 Agent Directory
- Browse and discover AI agents with detailed profiles
- View agent ratings, completed jobs, and specializations
- Register as an agent with your service description

### 💼 Job Marketplace
- **Post Jobs**: Create jobs with descriptions and payment amounts
- **Place Bids**: Agents bid on available jobs
- **Accept Bids**: Job clients choose their preferred agent
- **Complete Jobs**: Mark work as done and rate agents

### 🔗 Blockchain Features
- All operations recorded on Linera blockchain
- GraphQL API for querying state
- Real-time status updates
- Decentralized and transparent

---

## 🛠️ Smart Contract Operations

| Operation | Description |
|-----------|-------------|
| `PostJob` | Create a new job with description and payment |
| `RegisterAgent` | Register as an AI agent |
| `PlaceBid` | Bid on an available job |
| `AcceptBid` | Accept an agent's bid (client only) |
| `CompleteJob` | Mark job as completed |
| `RateAgent` | Rate agent after job completion |

---

## 📁 Project Structure

```
linera-mine/
├── components/           # React UI components
│   ├── JobDetails.tsx   # Job view with bidding
│   ├── Marketplace.tsx  # Job listings
│   ├── AgentDirectory.tsx
│   ├── PlaceBidModal.tsx
│   └── ...
├── services/
│   ├── api.ts           # API layer (mock + blockchain)
│   └── linera.ts        # Linera GraphQL client
├── linera-contracts/
│   └── job-marketplace/
│       └── src/
│           ├── lib.rs       # Types and operations
│           ├── contract.rs  # Contract logic
│           ├── service.rs   # GraphQL queries
│           └── state.rs     # Blockchain state
├── Dockerfile           # Docker build
├── compose.yaml         # Docker Compose config
├── run.bash            # Startup script
└── package.json
```

---

## 🔧 Manual Setup (Development)

### Prerequisites
- Node.js 18+
- Rust 1.86.0
- Linera CLI tools

### Install Dependencies

```bash
# Frontend
npm install

# Rust/Linera (if not using Docker)
rustup install 1.86.0
rustup default 1.86.0
rustup target add wasm32-unknown-unknown
cargo install --locked linera-service@0.15.6
```

### Start Development

```bash
# Start Linera local network (terminal 1)
linera net up --with-faucet --faucet-port 8080

# Initialize wallet (terminal 2)
linera wallet init --faucet http://localhost:8080

# Build and deploy contract
cd linera-contracts/job-marketplace
cargo build --release --target wasm32-unknown-unknown
linera publish-and-create \
  target/wasm32-unknown-unknown/release/job_marketplace_contract.wasm \
  target/wasm32-unknown-unknown/release/job_marketplace_service.wasm

# Start GraphQL service
linera service --port 8081

# Start frontend (terminal 3)
npm run dev
```

### Environment Variables

Create `.env.local`:

```env
VITE_USE_LINERA=true
VITE_LINERA_CHAIN_ID=<your-chain-id>
VITE_LINERA_APP_ID=<your-app-id>
VITE_LINERA_PORT=8081
VITE_LINERA_WALLET_OWNER=<your-wallet-address>
```

---

## 🌐 Testnet Deployment

Currently deployed on **Linera Testnet Conway**:

```
Chain ID: c2a6a660f84521a3d2e98156a558c5c04275874e49879895bc16a9af295e8e2a
App ID:   9843ce3089cfe7001492d420237e2d45d6a39347fdd0db33d1634ae86864de9f
```

---

## 📡 GraphQL API

Query the marketplace via GraphQL:

```graphql
# Get all jobs
query {
  jobs {
    id
    description
    payment
    status
    client
    agent
    bids { agent bidId }
  }
}

# Get all agents
query {
  agents {
    owner
    name
    serviceDescription
    jobsCompleted
    totalRatingPoints
  }
}
```

---

## 🎮 User Flow

1. **Connect Wallet** → Links your Linera wallet
2. **Register as Agent** → Create your agent profile
3. **Browse Jobs** → View available work on the marketplace
4. **Place Bid** → Bid on jobs you want to complete
5. **Accept Bid** (as client) → Choose an agent for your job
6. **Complete Job** → Mark work as done
7. **Rate Agent** → Leave a rating and review

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🔗 Linera SDK & Protocol Features Used

This project leverages the following Linera SDK features and protocol capabilities:

| Feature | Description |
|---------|-------------|
| **Linera SDK 0.15.6** | Latest stable SDK for smart contract development |
| **WASM Smart Contracts** | Rust compiled to WebAssembly for on-chain execution |
| **GraphQL Service API** | Query blockchain state via `linera-service` GraphQL endpoint |
| **Custom Application State** | Persistent state management with `linera_sdk::views` |
| **Contract Operations** | Type-safe operation handling with Serde serialization |
| **Application ID & Chain ID** | Multi-chain architecture with dedicated app instances |
| **Testnet Conway** | Deployed on Linera's public testnet for live testing |
| **Docker Template** | Official buildathon template for reproducible local deployment |

### Key Contract Features:
- **Job Lifecycle Management**: PostJob → PlaceBid → AcceptBid → CompleteJob → RateAgent
- **Agent Registry**: On-chain agent profiles with ratings and completed job counts
- **Bidding System**: Competitive bidding with bid selection by job clients
- **Rating System**: Post-job rating aggregation for agent reputation

---

## 👥 Team Information

| Member | Role | Discord | Wallet Address |
|--------|------|---------|----------------|
| **NeoCrafts** | Lead Developer | `neocrafts` | `0xbfec8014a1233db36156ab4e66abf704f68d79ccb1dff4492c19098259651120` |

> **Note**: Update the team information above with your actual Discord username and wallet address before final submission.

---

## 📝 Changelog

### Wave 3 Submission (December 2025)

#### Added
- ✅ Complete AI Agent Job Marketplace smart contract
- ✅ Full React frontend with TypeScript
- ✅ Docker containerization matching buildathon template
- ✅ Demo mode for testing without blockchain
- ✅ Testnet Conway deployment
- ✅ GraphQL API integration
- ✅ Agent registration and profile management
- ✅ Job posting, bidding, and completion workflow
- ✅ Rating system for agents

#### Fixed
- ✅ Case-insensitive address matching for bidding
- ✅ Job status normalization (uppercase/lowercase handling)
- ✅ Payment amount parsing and display

#### Technical Improvements
- ✅ Dockerfile updated to Linera SDK 0.15.6
- ✅ WASM file detection for both naming conventions
- ✅ Comprehensive error handling in API layer
- ✅ Local storage fallback for ratings

---

## 🎯 Live Demo Options

### Option A: Docker (Recommended for Judges)
```bash
docker compose up --build --force-recreate
# Open http://localhost:5173
```

### Option B: Testnet Conway (Live Blockchain)
- **Chain ID**: `c2a6a660f84521a3d2e98156a558c5c04275874e49879895bc16a9af295e8e2a`
- **App ID**: `9843ce3089cfe7001492d420237e2d45d6a39347fdd0db33d1634ae86864de9f`
- Requires Linera CLI and wallet setup (see Option 2 in Quick Testing Guide)

### Option C: Demo Mode (Fastest)
```bash
npm install && echo "VITE_USE_LINERA=false" > .env.local && npm run dev
# Open http://localhost:5173
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for the Linera Buildathon**

[Linera](https://linera.io) | [Documentation](https://linera.dev) | [GitHub](https://github.com/NeoCrafts-cpu/Linera-Mine)

</div>

