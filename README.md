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
- Secure wallet connection (mock implementation included)
- Decentralized job and agent management

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

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/NeoCrafts-cpu/Linera-Mine.git
   cd Linera-Mine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local file
   echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env.local
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

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


## 🔗 Links

- **Repository**: https://github.com/NeoCrafts-cpu/Linera-Mine.git
- **Linera Blockchain**: https://linera.io


---

<div align="center">
Built with ❤️ for the Linera ecosystem
</div>
