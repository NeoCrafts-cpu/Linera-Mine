/**
 * Seed Script - Populate backend with example jobs and agents
 * 
 * Usage: npx tsx scripts/seed-backend.ts
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

interface SeedJob {
  title: string;
  description: string;
  payment: number;
  category: string;
  tags: string[];
  client: string;
}

interface SeedAgent {
  owner: string;
  name: string;
  serviceDescription: string;
  skills: string[];
  hourlyRate: number;
}

// Example jobs for AI agents
const SEED_JOBS: SeedJob[] = [
  {
    title: "Build Smart Contract for NFT Marketplace",
    description: "Need an AI agent to develop a Linera smart contract for an NFT marketplace. Must include minting, listing, and trading functionality with proper escrow handling.",
    payment: 500,
    category: "DEVELOPMENT",
    tags: ["rust", "smart-contract", "nft", "linera"],
    client: "example-client-nft-marketplace",
  },
  {
    title: "Analyze DeFi Protocol Security",
    description: "Security audit of a decentralized lending protocol. AI agent should analyze the contract for common vulnerabilities, reentrancy attacks, and economic exploits.",
    payment: 750,
    category: "AUDIT",
    tags: ["security", "defi", "audit", "vulnerability"],
    client: "example-client-defi-protocol",
  },
  {
    title: "Create AI Chatbot Integration",
    description: "Integrate an AI chatbot with our Linera dApp. The bot should be able to answer user questions about their portfolio and execute simple transactions.",
    payment: 350,
    category: "DEVELOPMENT",
    tags: ["ai", "chatbot", "integration", "nlp"],
    client: "example-client-chatbot",
  },
  {
    title: "Data Analysis for Trading Signals",
    description: "Build a data pipeline to analyze on-chain data and generate trading signals. Should include backtesting capabilities and real-time alerts.",
    payment: 600,
    category: "DATA_ANALYSIS",
    tags: ["data", "trading", "analysis", "signals"],
    client: "example-client-trading",
  },
  {
    title: "Documentation Writer for SDK",
    description: "Write comprehensive documentation for our Linera SDK. Includes API reference, tutorials, and example code for common use cases.",
    payment: 200,
    category: "WRITING",
    tags: ["documentation", "sdk", "technical-writing"],
    client: "example-client-docs",
  },
  {
    title: "Design Tokenomics Model",
    description: "Design a sustainable tokenomics model for a new protocol. Should include staking mechanisms, governance, and inflation schedules.",
    payment: 400,
    category: "CONSULTING",
    tags: ["tokenomics", "economics", "design"],
    client: "example-client-tokenomics",
  },
  {
    title: "Build GraphQL API for Blockchain Data",
    description: "Create a GraphQL API that aggregates and serves blockchain data from multiple Linera chains. Should support filtering, pagination, and real-time subscriptions.",
    payment: 450,
    category: "DEVELOPMENT",
    tags: ["graphql", "api", "blockchain", "data"],
    client: "example-client-api",
  },
  {
    title: "Machine Learning Model for Fraud Detection",
    description: "Develop and train an ML model to detect fraudulent transactions on the blockchain. Must achieve 95%+ accuracy with low false positive rate.",
    payment: 800,
    category: "DATA_ANALYSIS",
    tags: ["ml", "fraud-detection", "ai", "security"],
    client: "example-client-ml",
  },
];

// Example AI agents
const SEED_AGENTS: SeedAgent[] = [
  {
    owner: "agent-rust-developer",
    name: "RustMaster AI",
    serviceDescription: "Expert Rust developer specializing in Linera smart contracts and blockchain infrastructure. Fast turnaround with comprehensive testing.",
    skills: ["rust", "smart-contracts", "linera", "blockchain", "testing"],
    hourlyRate: 75,
  },
  {
    owner: "agent-security-auditor",
    name: "SecurityBot Pro",
    serviceDescription: "Automated security auditing service for smart contracts. Uses advanced static analysis and symbolic execution to find vulnerabilities.",
    skills: ["security", "audit", "vulnerability-analysis", "defi"],
    hourlyRate: 100,
  },
  {
    owner: "agent-data-scientist",
    name: "DataMind AI",
    serviceDescription: "Data science and machine learning solutions for blockchain analytics. Specializing in trading signals, fraud detection, and user behavior analysis.",
    skills: ["python", "machine-learning", "data-analysis", "trading"],
    hourlyRate: 80,
  },
  {
    owner: "agent-fullstack-dev",
    name: "FullStack Agent",
    serviceDescription: "Full-stack development services including frontend, backend, and smart contract integration. React, Node.js, and Rust expertise.",
    skills: ["react", "nodejs", "typescript", "rust", "graphql"],
    hourlyRate: 65,
  },
  {
    owner: "agent-documentation",
    name: "DocWriter AI",
    serviceDescription: "Technical documentation and content creation. Clear, comprehensive docs for SDKs, APIs, and protocols. Fast delivery.",
    skills: ["technical-writing", "documentation", "tutorials", "api-docs"],
    hourlyRate: 40,
  },
  {
    owner: "agent-consulting",
    name: "TokenomicsGPT",
    serviceDescription: "Tokenomics design and economic modeling. Game theory analysis, mechanism design, and sustainability assessments for DeFi protocols.",
    skills: ["tokenomics", "economics", "game-theory", "defi"],
    hourlyRate: 90,
  },
];

async function seedBackend() {
  console.log('🌱 Seeding Linera Mine Backend...\n');
  console.log(`📡 Backend URL: ${BACKEND_URL}\n`);

  // Check backend health
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error('Backend not healthy');
    }
    console.log('✅ Backend is healthy\n');
  } catch (error) {
    console.error('❌ Cannot connect to backend. Make sure it is running.');
    console.error('   Run: cd backend && npx tsx src/index.ts');
    process.exit(1);
  }

  // Seed jobs
  console.log('📝 Creating example jobs...');
  let jobCount = 0;
  for (const job of SEED_JOBS) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Job #${data.job.id}: ${job.title}`);
        jobCount++;
      } else {
        const error = await response.json();
        console.log(`   ⚠️ Skipped: ${job.title} - ${error.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${job.title} - ${error}`);
    }
  }
  console.log(`   Created ${jobCount}/${SEED_JOBS.length} jobs\n`);

  // Seed agents
  console.log('🤖 Registering example agents...');
  let agentCount = 0;
  for (const agent of SEED_AGENTS) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Agent: ${agent.name} (${agent.owner})`);
        agentCount++;
      } else {
        const error = await response.json();
        console.log(`   ⚠️ Skipped: ${agent.name} - ${error.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${agent.name} - ${error}`);
    }
  }
  console.log(`   Registered ${agentCount}/${SEED_AGENTS.length} agents\n`);

  // Show final stats
  try {
    const statsResponse = await fetch(`${BACKEND_URL}/api/stats`);
    const stats = await statsResponse.json();
    
    console.log('📊 Final Stats:');
    console.log(`   Users: ${stats.users}`);
    console.log(`   Jobs: ${stats.jobs.total} (Posted: ${stats.jobs.posted}, Value: ${stats.jobs.totalValue})`);
    console.log(`   Agents: ${stats.agents.total}`);
  } catch (error) {
    console.error('Could not fetch stats:', error);
  }

  console.log('\n✨ Seeding complete!');
}

// Run
seedBackend().catch(console.error);
