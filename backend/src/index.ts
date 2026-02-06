/**
 * Linera Mine Backend API
 * 
 * Backend for wallet persistence, job storage, agent profiles, and user management.
 * Uses file-based storage (similar to Linera-Dominion approach).
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// ==================== DATA FILES ====================

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const API_KEYS_FILE = path.join(DATA_DIR, 'api_keys.json');

// Initialize data files
function initDataFile(filePath: string, defaultData: any) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

initDataFile(USERS_FILE, { users: {} });
initDataFile(JOBS_FILE, { jobs: {}, jobCounter: 100 });
initDataFile(AGENTS_FILE, { agents: {} });
initDataFile(SESSIONS_FILE, { sessions: {} });
initDataFile(API_KEYS_FILE, { apiKeys: {} });

// ==================== SEED DATA ====================

const SEED_JOBS = [
  {
    id: 1,
    title: 'Build Smart Contract for NFT Marketplace',
    description: 'Need an AI agent to develop a Linera smart contract for an NFT marketplace. Must include minting, listing, and trading functionality with proper escrow handling.',
    payment: 500,
    category: 'DEVELOPMENT',
    tags: ['rust', 'smart-contract', 'nft', 'linera'],
    client: 'platform',
    agent: null,
    status: 'POSTED',
    bids: [],
    milestones: [],
    isSeed: true,
  },
  {
    id: 2,
    title: 'Security Audit for DeFi Protocol',
    description: 'Comprehensive security audit of a decentralized lending protocol. AI agent should analyze the contract for vulnerabilities, reentrancy attacks, and economic exploits.',
    payment: 750,
    category: 'AUDIT',
    tags: ['security', 'defi', 'audit', 'vulnerability'],
    client: 'platform',
    agent: null,
    status: 'POSTED',
    bids: [],
    milestones: [],
    isSeed: true,
  },
  {
    id: 3,
    title: 'AI Chatbot Integration for dApp',
    description: 'Integrate an AI chatbot with our Linera dApp. The bot should answer user questions about their portfolio and execute simple transactions via natural language.',
    payment: 350,
    category: 'DEVELOPMENT',
    tags: ['ai', 'chatbot', 'integration', 'nlp'],
    client: 'platform',
    agent: null,
    status: 'POSTED',
    bids: [],
    milestones: [],
    isSeed: true,
  },
  {
    id: 4,
    title: 'Trading Signal Analysis Pipeline',
    description: 'Build a data pipeline to analyze on-chain data and generate trading signals. Should include backtesting capabilities and real-time alerts.',
    payment: 600,
    category: 'DATA_ANALYSIS',
    tags: ['data', 'trading', 'analysis', 'signals'],
    client: 'platform',
    agent: null,
    status: 'POSTED',
    bids: [],
    milestones: [],
    isSeed: true,
  },
  {
    id: 5,
    title: 'Technical Documentation for SDK',
    description: 'Write comprehensive documentation for our Linera SDK. Includes API reference, tutorials, and example code for common use cases.',
    payment: 200,
    category: 'WRITING',
    tags: ['documentation', 'sdk', 'technical-writing'],
    client: 'platform',
    agent: null,
    status: 'POSTED',
    bids: [],
    milestones: [],
    isSeed: true,
  },
];

const SEED_AGENTS = [
  {
    owner: 'agent-rust-master',
    name: 'RustMaster AI',
    serviceDescription: 'Expert Rust developer specializing in Linera smart contracts and blockchain infrastructure. Fast turnaround with comprehensive testing.',
    skills: ['rust', 'smart-contracts', 'linera', 'blockchain', 'testing'],
    hourlyRate: 75,
    portfolioUrls: [],
    jobsCompleted: 12,
    rating: 4.8,
    totalRatingPoints: 58,
    totalRatings: 12,
    totalEarned: 4500,
    verified: true,
    availability: true,
    isAiAgent: true,
    isSeed: true,
  },
  {
    owner: 'agent-security-pro',
    name: 'SecurityBot Pro',
    serviceDescription: 'Automated security auditing service for smart contracts. Uses advanced static analysis and symbolic execution to find vulnerabilities.',
    skills: ['security', 'audit', 'vulnerability-analysis', 'defi'],
    hourlyRate: 100,
    portfolioUrls: [],
    jobsCompleted: 8,
    rating: 5.0,
    totalRatingPoints: 40,
    totalRatings: 8,
    totalEarned: 6000,
    verified: true,
    availability: true,
    isAiAgent: true,
    isSeed: true,
  },
  {
    owner: 'agent-data-mind',
    name: 'DataMind AI',
    serviceDescription: 'Data science and machine learning solutions for blockchain analytics. Specializing in trading signals, fraud detection, and user behavior analysis.',
    skills: ['python', 'machine-learning', 'data-analysis', 'trading'],
    hourlyRate: 80,
    portfolioUrls: [],
    jobsCompleted: 15,
    rating: 4.6,
    totalRatingPoints: 69,
    totalRatings: 15,
    totalEarned: 5200,
    verified: true,
    availability: true,
    isAiAgent: true,
    isSeed: true,
  },
];

// Initialize seed data on startup
function initSeedData() {
  const jobsData = loadJobs();
  const agentsData = loadAgents();
  let updated = false;

  // Add seed jobs if they don't exist
  for (const seedJob of SEED_JOBS) {
    if (!jobsData.jobs[seedJob.id]) {
      jobsData.jobs[seedJob.id] = {
        ...seedJob,
        createdAt: Date.now() - Math.random() * 86400000 * 7, // Random time in last 7 days
        updatedAt: Date.now(),
      };
      updated = true;
    }
  }

  // Add seed agents if they don't exist
  for (const seedAgent of SEED_AGENTS) {
    if (!agentsData.agents[seedAgent.owner]) {
      agentsData.agents[seedAgent.owner] = {
        ...seedAgent,
        registeredAt: Date.now() - Math.random() * 86400000 * 30, // Random time in last 30 days
        updatedAt: Date.now(),
      };
      updated = true;
    }
  }

  if (updated) {
    saveJobs(jobsData);
    saveAgents(agentsData);
    console.log('✅ Seed data initialized');
  }
}

// Call on startup
initSeedData();

// ==================== DATA HELPERS ====================

function loadData<T>(filePath: string, defaultData: T): T {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return defaultData;
  }
}

function saveData(filePath: string, data: any): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error);
  }
}

// Type-safe loaders
const loadUsers = () => loadData<{ users: Record<string, any> }>(USERS_FILE, { users: {} });
const saveUsers = (data: any) => saveData(USERS_FILE, data);

const loadJobs = () => loadData<{ jobs: Record<string, any>; jobCounter: number }>(JOBS_FILE, { jobs: {}, jobCounter: 1 });
const saveJobs = (data: any) => saveData(JOBS_FILE, data);

const loadAgents = () => loadData<{ agents: Record<string, any> }>(AGENTS_FILE, { agents: {} });
const saveAgents = (data: any) => saveData(AGENTS_FILE, data);

const loadSessions = () => loadData<{ sessions: Record<string, any> }>(SESSIONS_FILE, { sessions: {} });
const saveSessions = (data: any) => saveData(SESSIONS_FILE, data);

const loadApiKeys = () => loadData<{ apiKeys: Record<string, any> }>(API_KEYS_FILE, { apiKeys: {} });
const saveApiKeys = (data: any) => saveData(API_KEYS_FILE, data);

// ==================== AUTH MIDDLEWARE ====================

interface AuthRequest extends Request {
  user?: any;
  sessionToken?: string;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const sessionsData = loadSessions();
  const session = sessionsData.sessions[token];

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (Date.now() > session.expiresAt) {
    delete sessionsData.sessions[token];
    saveSessions(sessionsData);
    return res.status(401).json({ error: 'Token expired' });
  }

  const usersData = loadUsers();
  const user = usersData.users[session.userId];

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  req.sessionToken = token;
  next();
}

// ==================== API KEY AUTH MIDDLEWARE ====================

interface ApiKeyRequest extends Request {
  agent?: any;
  apiKey?: string;
}

/**
 * Generate a random API key
 */
function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'lm_'; // Linera Mine prefix
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Middleware to authenticate AI agents via API key
 */
function apiKeyMiddleware(req: ApiKeyRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required. Use X-API-Key header.' });
  }

  const apiKeysData = loadApiKeys();
  const keyData = apiKeysData.apiKeys[apiKey];

  if (!keyData) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  if (!keyData.active) {
    return res.status(401).json({ error: 'API key is disabled' });
  }

  // Update last used timestamp
  keyData.lastUsedAt = Date.now();
  keyData.usageCount = (keyData.usageCount || 0) + 1;
  saveApiKeys(apiKeysData);

  // Load agent data
  const agentsData = loadAgents();
  const agent = agentsData.agents[keyData.agentOwner];

  req.agent = agent;
  req.apiKey = apiKey;
  next();
}

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== USER/AUTH ROUTES ====================

/**
 * Register a new user with email/password
 */
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, password, chainId, address } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const usersData = loadUsers();
  
  // Check if email already exists
  const existingUser = Object.values(usersData.users).find((u: any) => u.email === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const userId = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);

  const user = {
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    chainId: chainId || null,
    address: address || null,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  usersData.users[userId] = user;
  saveUsers(usersData);

  // Create session
  const sessionToken = uuidv4();
  const sessionsData = loadSessions();
  sessionsData.sessions[sessionToken] = {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  saveSessions(sessionsData);

  console.log(`✅ User registered: ${email}`);

  res.json({
    success: true,
    token: sessionToken,
    user: {
      id: userId,
      email: user.email,
      chainId: user.chainId,
      address: user.address,
    },
  });
});

/**
 * Login with email/password
 */
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const usersData = loadUsers();
  const user = Object.values(usersData.users).find((u: any) => u.email === email.toLowerCase()) as any;

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Update last login
  user.lastLoginAt = Date.now();
  saveUsers(usersData);

  // Create session
  const sessionToken = uuidv4();
  const sessionsData = loadSessions();
  sessionsData.sessions[sessionToken] = {
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  saveSessions(sessionsData);

  console.log(`✅ User logged in: ${email}`);

  res.json({
    success: true,
    token: sessionToken,
    user: {
      id: user.id,
      email: user.email,
      chainId: user.chainId,
      address: user.address,
    },
  });
});

/**
 * Connect wallet (creates user if needed)
 */
app.post('/api/auth/wallet', (req: Request, res: Response) => {
  const { chainId, address } = req.body;

  if (!chainId || !address) {
    return res.status(400).json({ error: 'Chain ID and address required' });
  }

  const usersData = loadUsers();
  
  // Find existing user by chainId or address
  let user = Object.values(usersData.users).find(
    (u: any) => u.chainId === chainId || u.address?.toLowerCase() === address.toLowerCase()
  ) as any;

  if (!user) {
    // Create new user
    const userId = uuidv4();
    user = {
      id: userId,
      email: null,
      passwordHash: null,
      chainId,
      address: address.toLowerCase(),
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    usersData.users[userId] = user;
    saveUsers(usersData);
    console.log(`🆕 New wallet user: ${chainId.substring(0, 16)}...`);
  } else {
    // Update existing user
    user.chainId = chainId;
    user.address = address.toLowerCase();
    user.lastLoginAt = Date.now();
    saveUsers(usersData);
  }

  // Create session
  const sessionToken = uuidv4();
  const sessionsData = loadSessions();
  sessionsData.sessions[sessionToken] = {
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  saveSessions(sessionsData);

  res.json({
    success: true,
    token: sessionToken,
    user: {
      id: user.id,
      email: user.email,
      chainId: user.chainId,
      address: user.address,
    },
  });
});

/**
 * Get current user
 */
app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      chainId: req.user.chainId,
      address: req.user.address,
      createdAt: req.user.createdAt,
    },
  });
});

/**
 * Logout
 */
app.post('/api/auth/logout', (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const sessionsData = loadSessions();
    delete sessionsData.sessions[token];
    saveSessions(sessionsData);
  }
  res.json({ success: true });
});

/**
 * Update wallet info for logged-in user
 */
app.put('/api/wallet', authMiddleware, (req: AuthRequest, res: Response) => {
  const { chainId, address } = req.body;

  const usersData = loadUsers();
  const user = usersData.users[req.user.id];

  if (chainId) user.chainId = chainId;
  if (address) user.address = address.toLowerCase();
  user.lastLoginAt = Date.now();

  saveUsers(usersData);

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      chainId: user.chainId,
      address: user.address,
    },
  });
});

// ==================== JOBS ROUTES ====================

/**
 * Get all jobs
 * - Marketplace view: returns all POSTED jobs (available for bidding) + seed jobs
 * - User view (userAddress param): returns user's jobs + seed jobs only
 */
app.get('/api/jobs', (req: Request, res: Response) => {
  const { status, category, minPayment, maxPayment, limit = 100, userAddress } = req.query;
  
  const jobsData = loadJobs();
  let jobs = Object.values(jobsData.jobs);

  // If userAddress provided, filter to show only:
  // 1. Seed jobs (visible to all)
  // 2. Jobs created by this user
  // 3. Jobs assigned to this user (as agent)
  // Otherwise, show all jobs (marketplace view)
  if (userAddress) {
    const userAddr = String(userAddress).toLowerCase();
    jobs = jobs.filter((j: any) => 
      j.isSeed || 
      j.client?.toLowerCase() === userAddr ||
      j.agent?.toLowerCase() === userAddr
    );
  }

  // Apply filters
  if (status) {
    jobs = jobs.filter((j: any) => j.status === status);
  }
  if (category) {
    jobs = jobs.filter((j: any) => j.category === category);
  }
  if (minPayment) {
    jobs = jobs.filter((j: any) => j.payment >= Number(minPayment));
  }
  if (maxPayment) {
    jobs = jobs.filter((j: any) => j.payment <= Number(maxPayment));
  }

  // Sort by creation date (newest first)
  jobs.sort((a: any, b: any) => b.createdAt - a.createdAt);

  // Apply limit
  jobs = jobs.slice(0, Number(limit));

  res.json({
    jobs,
    total: Object.keys(jobsData.jobs).length,
    filtered: jobs.length,
  });
});

/**
 * Get job by ID
 */
app.get('/api/jobs/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const jobsData = loadJobs();
  const job = jobsData.jobs[id];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({ job });
});

/**
 * Get jobs for a specific user (their posted jobs + jobs they're working on)
 */
app.get('/api/user/:address/jobs', (req: Request, res: Response) => {
  const { address } = req.params;
  const userAddr = address.toLowerCase();
  
  const jobsData = loadJobs();
  const allJobs = Object.values(jobsData.jobs);

  // Get jobs where user is the client (posted jobs)
  const postedJobs = allJobs.filter((j: any) => 
    j.client?.toLowerCase() === userAddr && !j.isSeed
  );

  // Get jobs where user is the assigned agent (agent jobs)
  const agentJobs = allJobs.filter((j: any) => 
    j.agent?.toLowerCase() === userAddr
  );

  // Get jobs where user has placed bids
  const bidJobs = allJobs.filter((j: any) => 
    j.bids?.some((b: any) => b.agent?.toLowerCase() === userAddr) && 
    j.agent?.toLowerCase() !== userAddr
  );

  res.json({
    postedJobs: postedJobs.sort((a: any, b: any) => b.createdAt - a.createdAt),
    agentJobs: agentJobs.sort((a: any, b: any) => b.updatedAt - a.updatedAt),
    bidJobs: bidJobs.sort((a: any, b: any) => b.createdAt - a.createdAt),
    totals: {
      posted: postedJobs.length,
      working: agentJobs.length,
      bids: bidJobs.length,
    },
  });
});

/**
 * Create a new job
 */
app.post('/api/jobs', (req: Request, res: Response) => {
  const { title, description, payment, category, tags, client, milestones } = req.body;

  if (!description || !payment || !client) {
    return res.status(400).json({ error: 'Description, payment, and client required' });
  }

  const jobsData = loadJobs();
  const jobId = jobsData.jobCounter++;

  const job = {
    id: jobId,
    title: title || description.substring(0, 50),
    description,
    payment: Number(payment),
    category: category || 'OTHER',
    tags: tags || [],
    client: client.toLowerCase(),
    agent: null,
    status: 'POSTED',
    bids: [],
    milestones: milestones || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  jobsData.jobs[jobId] = job;
  saveJobs(jobsData);

  console.log(`📝 Job created: #${jobId} - ${job.title}`);

  res.json({ success: true, job });
});

/**
 * Update job status
 */
app.put('/api/jobs/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const jobsData = loadJobs();
  const job = jobsData.jobs[id];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Apply updates
  Object.assign(job, updates, { updatedAt: Date.now() });
  saveJobs(jobsData);

  res.json({ success: true, job });
});

/**
 * Place a bid on a job
 */
app.post('/api/jobs/:id/bid', (req: Request, res: Response) => {
  const { id } = req.params;
  const { agent, amount, proposal, estimatedDays } = req.body;

  if (!agent || !amount) {
    return res.status(400).json({ error: 'Agent and amount required' });
  }

  const jobsData = loadJobs();
  const job = jobsData.jobs[id];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status !== 'POSTED') {
    return res.status(400).json({ error: 'Job is not accepting bids' });
  }

  // Check if agent already bid
  const existingBid = job.bids.find((b: any) => b.agent.toLowerCase() === agent.toLowerCase());
  if (existingBid) {
    return res.status(400).json({ error: 'Already placed a bid' });
  }

  const bid = {
    bidId: job.bids.length + 1,
    agent: agent.toLowerCase(),
    amount: Number(amount),
    proposal: proposal || '',
    estimatedDays: estimatedDays || null,
    createdAt: Date.now(),
  };

  job.bids.push(bid);
  job.updatedAt = Date.now();
  saveJobs(jobsData);

  console.log(`💬 Bid placed on job #${id} by ${agent.substring(0, 16)}...`);

  res.json({ success: true, bid });
});

/**
 * Accept a bid
 */
app.post('/api/jobs/:id/accept-bid', (req: Request, res: Response) => {
  const { id } = req.params;
  const { agent, bidAmount } = req.body;

  const jobsData = loadJobs();
  const job = jobsData.jobs[id];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  job.agent = agent.toLowerCase();
  job.acceptedBidAmount = Number(bidAmount);
  job.status = 'IN_PROGRESS';
  job.updatedAt = Date.now();
  saveJobs(jobsData);

  console.log(`✅ Bid accepted on job #${id} - Agent: ${agent.substring(0, 16)}...`);

  res.json({ success: true, job });
});

/**
 * Submit deliverable for a job - changes status to PENDING_APPROVAL
 */
app.post('/api/jobs/:id/submit-deliverable', (req: Request, res: Response) => {
  const { id } = req.params;
  const { deliveryNotes, deliveryLink } = req.body;

  const jobsData = loadJobs();
  const job = jobsData.jobs[id];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Store deliverable info
  job.deliverable = {
    notes: deliveryNotes,
    link: deliveryLink || null,
    submittedAt: Date.now(),
  };
  job.status = 'PENDING_APPROVAL';
  job.updatedAt = Date.now();
  saveJobs(jobsData);

  console.log(`📦 Deliverable submitted for job #${id}`);

  res.json({ success: true, job });
});

/**
 * Complete a job
 */
app.post('/api/jobs/:id/complete', (req: Request, res: Response) => {
  const { id } = req.params;

  const jobsData = loadJobs();
  const job = jobsData.jobs[id];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  job.status = 'COMPLETED';
  job.completedAt = Date.now();
  job.updatedAt = Date.now();
  saveJobs(jobsData);

  // Update agent's completed jobs count
  if (job.agent) {
    const agentsData = loadAgents();
    const agent = agentsData.agents[job.agent];
    if (agent) {
      agent.jobsCompleted = (agent.jobsCompleted || 0) + 1;
      agent.totalEarned = (agent.totalEarned || 0) + (job.acceptedBidAmount || job.payment);
      saveAgents(agentsData);
    }
  }

  console.log(`🎉 Job #${id} completed!`);

  res.json({ success: true, job });
});

/**
 * Delete a job
 */
app.delete('/api/jobs/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const jobsData = loadJobs();
  
  if (!jobsData.jobs[id]) {
    return res.status(404).json({ error: 'Job not found' });
  }

  delete jobsData.jobs[id];
  saveJobs(jobsData);

  res.json({ success: true });
});

// ==================== AGENTS ROUTES ====================

/**
 * Get all agents (seed agents + user-registered agents)
 */
app.get('/api/agents', (req: Request, res: Response) => {
  const { skill, minRating, verified, userAddress } = req.query;
  
  const agentsData = loadAgents();
  let agents = Object.values(agentsData.agents);

  // If userAddress is provided, show seed agents + user's own agent profile
  if (userAddress) {
    const userAddr = String(userAddress).toLowerCase();
    agents = agents.filter((a: any) => 
      a.isSeed || a.owner?.toLowerCase() === userAddr
    );
  }

  // Apply filters
  if (skill) {
    const skillLower = String(skill).toLowerCase();
    agents = agents.filter((a: any) => 
      a.skills?.some((s: string) => s.toLowerCase().includes(skillLower))
    );
  }
  if (minRating) {
    agents = agents.filter((a: any) => a.rating >= Number(minRating));
  }
  if (verified === 'true') {
    agents = agents.filter((a: any) => a.verified);
  }

  // Sort by rating (highest first)
  agents.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));

  res.json({
    agents,
    total: agents.length,
  });
});

/**
 * Get user's agent profile
 */
app.get('/api/user/:address/agent', (req: Request, res: Response) => {
  const { address } = req.params;
  const userAddr = address.toLowerCase();
  
  const agentsData = loadAgents();
  const agent = agentsData.agents[userAddr];

  if (!agent) {
    return res.json({ agent: null, isRegistered: false });
  }

  res.json({ agent, isRegistered: true });
});

/**
 * Get agent by owner address
 */
app.get('/api/agents/:owner', (req: Request, res: Response) => {
  const { owner } = req.params;
  const agentsData = loadAgents();
  const agent = agentsData.agents[owner.toLowerCase()];

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json({ agent });
});

/**
 * Register as an agent
 */
app.post('/api/agents', (req: Request, res: Response) => {
  const { owner, name, serviceDescription, skills, hourlyRate, portfolioUrls } = req.body;

  if (!owner || !name || !serviceDescription) {
    return res.status(400).json({ error: 'Owner, name, and description required' });
  }

  const agentsData = loadAgents();
  const ownerLower = owner.toLowerCase();

  // Check if already registered
  if (agentsData.agents[ownerLower]) {
    return res.status(400).json({ error: 'Already registered as an agent' });
  }

  const agent = {
    owner: ownerLower,
    name,
    serviceDescription,
    skills: skills || [],
    hourlyRate: hourlyRate ? Number(hourlyRate) : null,
    portfolioUrls: portfolioUrls || [],
    jobsCompleted: 0,
    rating: 0,
    totalRatingPoints: 0,
    totalRatings: 0,
    totalEarned: 0,
    verified: false,
    availability: true,
    registeredAt: Date.now(),
    updatedAt: Date.now(),
  };

  agentsData.agents[ownerLower] = agent;
  saveAgents(agentsData);

  console.log(`🤖 Agent registered: ${name} (${ownerLower.substring(0, 16)}...)`);

  res.json({ success: true, agent });
});

/**
 * Update agent profile
 */
app.put('/api/agents/:owner', (req: Request, res: Response) => {
  const { owner } = req.params;
  const updates = req.body;

  const agentsData = loadAgents();
  const agent = agentsData.agents[owner.toLowerCase()];

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Don't allow updating certain fields directly
  delete updates.owner;
  delete updates.jobsCompleted;
  delete updates.rating;
  delete updates.totalRatingPoints;
  delete updates.totalRatings;

  Object.assign(agent, updates, { updatedAt: Date.now() });
  saveAgents(agentsData);

  res.json({ success: true, agent });
});

/**
 * Rate an agent
 */
app.post('/api/agents/:owner/rate', (req: Request, res: Response) => {
  const { owner } = req.params;
  const { rating, review, jobId, rater } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const agentsData = loadAgents();
  const agent = agentsData.agents[owner.toLowerCase()];

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Update rating
  agent.totalRatingPoints = (agent.totalRatingPoints || 0) + Number(rating);
  agent.totalRatings = (agent.totalRatings || 0) + 1;
  agent.rating = agent.totalRatingPoints / agent.totalRatings;
  agent.updatedAt = Date.now();

  // Store rating history (optional)
  if (!agent.ratings) agent.ratings = [];
  agent.ratings.push({
    rating: Number(rating),
    review: review || '',
    jobId: jobId || null,
    rater: rater?.toLowerCase() || null,
    createdAt: Date.now(),
  });

  saveAgents(agentsData);

  console.log(`⭐ Agent ${agent.name} rated: ${rating}/5`);

  res.json({ success: true, agent });
});

/**
 * Delete agent
 */
app.delete('/api/agents/:owner', (req: Request, res: Response) => {
  const { owner } = req.params;

  const agentsData = loadAgents();
  
  if (!agentsData.agents[owner.toLowerCase()]) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  delete agentsData.agents[owner.toLowerCase()];
  saveAgents(agentsData);

  res.json({ success: true });
});

// ==================== LEADERBOARD ====================

/**
 * Get agent leaderboard
 */
app.get('/api/leaderboard', (req: Request, res: Response) => {
  const { sortBy = 'rating', limit = 50 } = req.query;

  const agentsData = loadAgents();
  let agents = Object.values(agentsData.agents);

  // Sort
  agents.sort((a: any, b: any) => {
    switch (sortBy) {
      case 'jobs':
        return (b.jobsCompleted || 0) - (a.jobsCompleted || 0);
      case 'earnings':
        return (b.totalEarned || 0) - (a.totalEarned || 0);
      case 'rating':
      default:
        return (b.rating || 0) - (a.rating || 0);
    }
  });

  // Add rank
  const ranked = agents.slice(0, Number(limit)).map((agent: any, index: number) => ({
    rank: index + 1,
    ...agent,
  }));

  res.json({
    leaderboard: ranked,
    totalAgents: agents.length,
  });
});

// ==================== STATS ====================

// ==================== AGENT API (FOR AI AGENTS) ====================

/**
 * Register an AI agent and get an API key
 * This allows AI bots to interact with the marketplace programmatically
 */
app.post('/api/agent-api/register', (req: Request, res: Response) => {
  const { name, serviceDescription, skills, hourlyRate, webhookUrl } = req.body;

  if (!name || !serviceDescription) {
    return res.status(400).json({ 
      error: 'Name and serviceDescription are required',
      example: {
        name: 'My AI Agent',
        serviceDescription: 'I analyze smart contracts for security vulnerabilities',
        skills: ['security', 'audit', 'solidity'],
        hourlyRate: 50,
        webhookUrl: 'https://my-agent.example.com/webhook'
      }
    });
  }

  // Generate unique agent owner ID
  const agentOwner = `agent-${uuidv4()}`;
  
  // Generate API key
  const apiKey = generateApiKey();
  
  // Create agent profile
  const agentsData = loadAgents();
  agentsData.agents[agentOwner] = {
    owner: agentOwner,
    name,
    serviceDescription,
    skills: skills || [],
    hourlyRate: hourlyRate || 0,
    portfolioUrls: [],
    jobsCompleted: 0,
    rating: 0,
    totalRatingPoints: 0,
    totalRatings: 0,
    totalEarned: 0,
    verified: false,
    availability: true,
    isAiAgent: true,
    webhookUrl: webhookUrl || null,
    registeredAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveAgents(agentsData);

  // Store API key
  const apiKeysData = loadApiKeys();
  apiKeysData.apiKeys[apiKey] = {
    agentOwner,
    active: true,
    createdAt: Date.now(),
    lastUsedAt: null,
    usageCount: 0,
  };
  saveApiKeys(apiKeysData);

  console.log(`🤖 AI Agent registered: ${name} (${agentOwner})`);

  res.json({
    success: true,
    message: 'AI Agent registered successfully! Save your API key securely - it will not be shown again.',
    apiKey,
    agentOwner,
    agent: agentsData.agents[agentOwner],
    documentation: {
      baseUrl: 'https://linera-mine-backend.onrender.com',
      endpoints: {
        listJobs: 'GET /api/agent-api/jobs',
        getJob: 'GET /api/agent-api/jobs/:id',
        placeBid: 'POST /api/agent-api/jobs/:id/bid',
        myJobs: 'GET /api/agent-api/my-jobs',
        submitDeliverable: 'POST /api/agent-api/jobs/:id/deliver',
        profile: 'GET /api/agent-api/profile',
      },
      authentication: 'Add header: X-API-Key: <your-api-key>',
    },
  });
});

/**
 * Get agent profile (authenticated)
 */
app.get('/api/agent-api/profile', apiKeyMiddleware, (req: ApiKeyRequest, res: Response) => {
  res.json({
    success: true,
    agent: req.agent,
  });
});

/**
 * Update agent profile (authenticated)
 */
app.put('/api/agent-api/profile', apiKeyMiddleware, (req: ApiKeyRequest, res: Response) => {
  const { name, serviceDescription, skills, hourlyRate, availability, webhookUrl } = req.body;

  const agentsData = loadAgents();
  const agent = agentsData.agents[req.agent.owner];

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  if (name) agent.name = name;
  if (serviceDescription) agent.serviceDescription = serviceDescription;
  if (skills) agent.skills = skills;
  if (hourlyRate !== undefined) agent.hourlyRate = hourlyRate;
  if (availability !== undefined) agent.availability = availability;
  if (webhookUrl !== undefined) agent.webhookUrl = webhookUrl;
  agent.updatedAt = Date.now();

  saveAgents(agentsData);

  res.json({
    success: true,
    agent,
  });
});

/**
 * List available jobs for AI agents
 */
app.get('/api/agent-api/jobs', apiKeyMiddleware, (req: ApiKeyRequest, res: Response) => {
  const { status = 'POSTED', category, minPayment, maxPayment, skill, limit = 50 } = req.query;
  
  const jobsData = loadJobs();
  let jobs = Object.values(jobsData.jobs);

  // Filter by status (default: only POSTED jobs that agents can bid on)
  if (status !== 'all') {
    jobs = jobs.filter((j: any) => j.status === status);
  }

  // Filter by category
  if (category) {
    jobs = jobs.filter((j: any) => j.category === category);
  }

  // Filter by payment range
  if (minPayment) {
    jobs = jobs.filter((j: any) => j.payment >= Number(minPayment));
  }
  if (maxPayment) {
    jobs = jobs.filter((j: any) => j.payment <= Number(maxPayment));
  }

  // Filter by skill/tag
  if (skill) {
    const skillLower = String(skill).toLowerCase();
    jobs = jobs.filter((j: any) => 
      j.tags?.some((t: string) => t.toLowerCase().includes(skillLower))
    );
  }

  // Sort by payment (highest first)
  jobs.sort((a: any, b: any) => b.payment - a.payment);

  // Apply limit
  jobs = jobs.slice(0, Number(limit));

  res.json({
    success: true,
    jobs: jobs.map((j: any) => ({
      id: j.id,
      title: j.title,
      description: j.description,
      payment: j.payment,
      category: j.category,
      tags: j.tags,
      status: j.status,
      bidCount: j.bids?.length || 0,
      createdAt: j.createdAt,
    })),
    total: jobs.length,
  });
});

/**
 * Get job details for AI agents
 */
app.get('/api/agent-api/jobs/:id', apiKeyMiddleware, (req: ApiKeyRequest, res: Response) => {
  const { id } = req.params;
  const jobsData = loadJobs();
  const job = jobsData.jobs[id];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Check if this agent has bid on the job
  const myBid = job.bids?.find((b: any) => b.agent === req.agent?.owner);
  const isAssigned = job.agent === req.agent?.owner;

  res.json({
    success: true,
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      payment: job.payment,
      category: job.category,
      tags: job.tags,
      status: job.status,
      bidCount: job.bids?.length || 0,
      createdAt: job.createdAt,
      myBid: myBid || null,
      isAssigned,
      milestones: isAssigned ? job.milestones : undefined,
    },
  });
});

/**
 * Place a bid on a job (for AI agents)
 */
app.post('/api/agent-api/jobs/:id/bid', apiKeyMiddleware, (req: ApiKeyRequest, res: Response) => {
  const { id } = req.params;
  const { amount, proposal, estimatedDays } = req.body;

  if (!amount) {
    return res.status(400).json({ 
      error: 'Bid amount is required',
      example: {
        amount: 100,
        proposal: 'I can complete this task using my specialized ML models...',
        estimatedDays: 3
      }
    });
  }

  const jobsData = loadJobs();
  const job = jobsData.jobs[id];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status !== 'POSTED') {
    return res.status(400).json({ error: 'Job is not accepting bids', currentStatus: job.status });
  }

  // Check if agent already bid
  const agentOwner = req.agent?.owner;
  const existingBid = job.bids?.find((b: any) => b.agent === agentOwner);
  if (existingBid) {
    return res.status(400).json({ error: 'You have already placed a bid on this job', existingBid });
  }

  const bid = {
    bidId: (job.bids?.length || 0) + 1,
    agent: agentOwner,
    amount: Number(amount),
    proposal: proposal || `Automated bid from AI Agent: ${req.agent?.name}`,
    estimatedDays: estimatedDays || null,
    isAiAgent: true,
    createdAt: Date.now(),
  };

  if (!job.bids) job.bids = [];
  job.bids.push(bid);
  job.updatedAt = Date.now();
  saveJobs(jobsData);

  console.log(`🤖 AI Agent bid on job #${id}: ${req.agent?.name} - $${amount}`);

  res.json({
    success: true,
    message: 'Bid placed successfully',
    bid,
  });
});

/**
 * Get jobs assigned to this AI agent
 */
app.get('/api/agent-api/my-jobs', apiKeyMiddleware, (req: ApiKeyRequest, res: Response) => {
  const { status } = req.query;
  const agentOwner = req.agent?.owner;

  const jobsData = loadJobs();
  let jobs = Object.values(jobsData.jobs).filter((j: any) => j.agent === agentOwner);

  if (status) {
    jobs = jobs.filter((j: any) => j.status === status);
  }

  // Sort by updated date (most recent first)
  jobs.sort((a: any, b: any) => b.updatedAt - a.updatedAt);

  res.json({
    success: true,
    jobs: jobs.map((j: any) => ({
      id: j.id,
      title: j.title,
      description: j.description,
      payment: j.payment,
      acceptedBidAmount: j.acceptedBidAmount,
      status: j.status,
      milestones: j.milestones,
      deliverable: j.deliverable,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    })),
    total: jobs.length,
  });
});

/**
 * Submit deliverable for a job (for AI agents)
 */
app.post('/api/agent-api/jobs/:id/deliver', apiKeyMiddleware, (req: ApiKeyRequest, res: Response) => {
  const { id } = req.params;
  const { deliveryNotes, deliveryLink, deliveryData } = req.body;

  if (!deliveryNotes && !deliveryLink && !deliveryData) {
    return res.status(400).json({ 
      error: 'At least one delivery field is required',
      example: {
        deliveryNotes: 'Completed the security audit. Found 2 critical vulnerabilities.',
        deliveryLink: 'https://github.com/...',
        deliveryData: { /* Any structured data */ }
      }
    });
  }

  const jobsData = loadJobs();
  const job = jobsData.jobs[id];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Check if this agent is assigned to the job
  if (job.agent !== req.agent?.owner) {
    return res.status(403).json({ error: 'You are not assigned to this job' });
  }

  if (job.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'Job is not in progress', currentStatus: job.status });
  }

  // Store deliverable
  job.deliverable = {
    notes: deliveryNotes,
    link: deliveryLink || null,
    data: deliveryData || null,
    submittedAt: Date.now(),
    submittedByAi: true,
  };
  job.status = 'PENDING_APPROVAL';
  job.updatedAt = Date.now();
  saveJobs(jobsData);

  console.log(`🤖 AI Agent submitted deliverable for job #${id}: ${req.agent?.name}`);

  res.json({
    success: true,
    message: 'Deliverable submitted successfully. Waiting for client approval.',
    job: {
      id: job.id,
      status: job.status,
      deliverable: job.deliverable,
    },
  });
});

/**
 * Get jobs where this agent has placed bids
 */
app.get('/api/agent-api/my-bids', apiKeyMiddleware, (req: ApiKeyRequest, res: Response) => {
  const agentOwner = req.agent?.owner;

  const jobsData = loadJobs();
  const jobsWithBids = Object.values(jobsData.jobs).filter((j: any) => 
    j.bids?.some((b: any) => b.agent === agentOwner)
  );

  res.json({
    success: true,
    jobs: jobsWithBids.map((j: any) => {
      const myBid = j.bids.find((b: any) => b.agent === agentOwner);
      return {
        id: j.id,
        title: j.title,
        payment: j.payment,
        status: j.status,
        isAssigned: j.agent === agentOwner,
        myBid,
      };
    }),
    total: jobsWithBids.length,
  });
});

// ==================== END AGENT API ====================

/**
 * Get platform stats
 */
app.get('/api/stats', (req: Request, res: Response) => {
  const usersData = loadUsers();
  const jobsData = loadJobs();
  const agentsData = loadAgents();

  const jobs = Object.values(jobsData.jobs);
  const totalPayment = jobs.reduce((sum: number, j: any) => sum + (j.payment || 0), 0);
  const completedJobs = jobs.filter((j: any) => j.status === 'COMPLETED');
  const completedPayment = completedJobs.reduce((sum: number, j: any) => sum + (j.acceptedBidAmount || j.payment || 0), 0);

  res.json({
    users: Object.keys(usersData.users).length,
    jobs: {
      total: jobs.length,
      posted: jobs.filter((j: any) => j.status === 'POSTED').length,
      inProgress: jobs.filter((j: any) => j.status === 'IN_PROGRESS').length,
      completed: completedJobs.length,
      totalValue: totalPayment,
      completedValue: completedPayment,
    },
    agents: {
      total: Object.keys(agentsData.agents).length,
      verified: Object.values(agentsData.agents).filter((a: any) => a.verified).length,
    },
  });
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Linera Mine API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
  console.log('');
  console.log('📚 Available endpoints:');
  console.log('   GET  /health              - Health check');
  console.log('   POST /api/auth/register   - Register with email');
  console.log('   POST /api/auth/login      - Login with email');
  console.log('   POST /api/auth/wallet     - Connect wallet');
  console.log('   GET  /api/auth/me         - Get current user');
  console.log('   GET  /api/jobs            - List all jobs');
  console.log('   POST /api/jobs            - Create a job');
  console.log('   GET  /api/agents          - List all agents');
  console.log('   POST /api/agents          - Register as agent');
  console.log('   GET  /api/leaderboard     - Agent leaderboard');
  console.log('   GET  /api/stats           - Platform stats');
  console.log('');
  console.log('🤖 AI Agent API (use X-API-Key header):');
  console.log('   POST /api/agent-api/register    - Register AI agent & get API key');
  console.log('   GET  /api/agent-api/profile     - Get agent profile');
  console.log('   PUT  /api/agent-api/profile     - Update agent profile');
  console.log('   GET  /api/agent-api/jobs        - List available jobs');
  console.log('   GET  /api/agent-api/jobs/:id    - Get job details');
  console.log('   POST /api/agent-api/jobs/:id/bid    - Place a bid');
  console.log('   GET  /api/agent-api/my-jobs     - Get assigned jobs');
  console.log('   GET  /api/agent-api/my-bids     - Get placed bids');
  console.log('   POST /api/agent-api/jobs/:id/deliver - Submit deliverable');
});

export default app;
