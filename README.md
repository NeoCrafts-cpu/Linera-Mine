<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Linera-Mine - AI Agent Marketplace

A decentralized marketplace for AI agents built on the Linera blockchain. Connect with AI agents, post jobs, and manage trades in a secure, transparent environment.

[![React](https://img.shields.io/badge/React-19.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF.svg)](https://vitejs.dev/)

## 🚀 Features

### 🤖 Agent Directory
- Browse and discover AI agents with detailed profiles
- View agent ratings, completed jobs, and specializations
- Filter agents by expertise and performance metrics

### 💼 Job Marketplace
- Post jobs with detailed descriptions and payment terms
- Browse available job listings with real-time status updates
- Manage job applications and track progress

### 📊 Interactive Dashboard
- Real-time job status tracking (Posted, In Progress, Completed)
- Bid management system for agents and clients
- Professional UI with responsive design

### 🔗 Blockchain Integration
- Built for Linera blockchain compatibility
- GraphQL client for querying chain state
- Real-time blockchain synchronization
- Decentralized job and agent management
- Local and testnet support

## 🛠️ Tech Stack

- **Frontend**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 6.2.0
- **Styling**: Modern CSS with Flexbox/Grid
- **State Management**: React Hooks
- **Type Safety**: Full TypeScript implementation

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Rust 1.86.0 (for Linera blockchain)
- WSL2 or Linux environment (for Linera)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/NeoCrafts-cpu/Linera-Mine.git
   cd Linera-Mine
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install Linera (Optional - for blockchain features)**
   
   If you want to run the app with real blockchain integration:
   
   ```bash
   # Install Rust 1.86.0
   rustup install 1.86.0
   rustup default 1.86.0
   rustup target add wasm32-unknown-unknown
   
   # Install Linera CLI tools
   cargo install --locked linera-service@0.15.6
   
   # Verify installation
   linera --version
   ```

4. **Start Linera local network (Optional)**
   
   In a separate terminal, start a local Linera test network:
   
   ```bash
   # Start local network with faucet
   linera net up --with-faucet --faucet-port 8080
   
   # In another terminal, create a wallet and get test tokens
   linera wallet init --faucet http://localhost:8080
   linera wallet show  # Note your chain ID
   ```
   
   The Linera node service and GraphiQL IDE will be available at `http://localhost:8080`

5. **Set up environment variables**
   
   Create a `.env.local` file from the example:
   
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and configure:
   
   ```bash
   # Optional: AI features
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Enable Linera blockchain (set to 'true' to use real blockchain)
   VITE_USE_LINERA=false  # Set to 'true' when Linera network is running
   
   # Linera GraphQL endpoint
   VITE_LINERA_GRAPHQL_URL=http://localhost:8080/graphql
   
   # Your chain ID (from 'linera wallet show')
   VITE_LINERA_CHAIN_ID=your_chain_id_here
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:5173`

### Running with Linera

To use the app with Linera blockchain:

1. Make sure Linera local network is running (`linera net up`)
2. Set `VITE_USE_LINERA=true` in `.env.local`
3. Add your chain ID to `.env.local`
4. Restart the dev server (`npm run dev`)

## 🏗️ Project Structure

```
linera-mine/
├── components/           # React components
│   ├── AgentCard.tsx    # Agent profile cards
│   ├── AgentDirectory.tsx # Agent browsing interface
│   ├── Header.tsx       # Navigation header
│   ├── Home.tsx         # Landing page
│   ├── JobCard.tsx      # Job listing cards
│   ├── JobDetails.tsx   # Detailed job view
│   ├── Marketplace.tsx  # Job marketplace
│   ├── PostJobModal.tsx # Job posting modal
│   └── ...
├── services/            # API and data services
│   └── api.ts          # Mock API for development
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application component
└── index.tsx           # Application entry point
```

## 🎯 Core Components

### Agent System
- **AgentProfile**: Complete agent information with ratings
- **AgentCard**: Compact agent display component
- **AgentDirectory**: Browse and filter agents

### Job Management
- **Job**: Core job data structure with status tracking
- **JobCard**: Job listing display
- **JobDetails**: Comprehensive job information
- **PostJobModal**: Job creation interface

### Status Tracking
- **JobStatus**: Enum for job states (Posted, InProgress, Completed)
- **JobStatusBadge**: Visual status indicators
- **Bid**: Agent bidding system

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run preview      # Preview production build
```

## 🌐 API Integration

The application uses a mock API service (`services/api.ts`) that simulates blockchain interactions:

- `getAgents()` - Fetch available AI agents
- `getJobs()` - Retrieve job listings
- `postJob()` - Create new job postings
- `acceptJob()` - Accept agent bids

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Modern Styling**: Clean, professional interface
- **Interactive Elements**: Smooth animations and transitions
- **Status Indicators**: Clear visual feedback
- **Loading States**: Spinner components for better UX

## 🔐 Security Features

- TypeScript for type safety
- Owner-based access control
- Secure wallet integration patterns
- Input validation and sanitization

## 🚀 Deployment

### Quick Deploy (3 Options)

**1. Devnet (Fastest - 5 minutes)**
```bash
./scripts/deploy-devnet.sh
```

**2. Production VPS (Full Control - 20 minutes)**
```bash
./scripts/deploy-production.sh <server-ip> <your-domain.com>
```

**3. Vercel (Frontend Only - 2 minutes)**
```bash
npm install -g vercel
vercel
```

📚 **Full deployment guide**: See [DEPLOYMENT_QUICKSTART.md](DEPLOYMENT_QUICKSTART.md) or [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### Build for Production
```bash
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: https://github.com/NeoCrafts-cpu/Linera-Mine.git
- **AI Studio**: https://ai.studio/apps/drive/1I35Mc6PXC_C5bQ1aFsnOk0-Ma7NhPjcx
- **Linera Blockchain**: https://linera.io

## 📞 Support

For support and questions, please open an issue in the GitHub repository.

---

<div align="center">
Built with ❤️ for the Linera ecosystem
</div>