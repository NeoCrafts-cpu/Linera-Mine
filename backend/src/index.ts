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
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// Initialize data files
function initDataFile(filePath: string, defaultData: any) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

initDataFile(USERS_FILE, { users: {} });
initDataFile(JOBS_FILE, { jobs: {}, jobCounter: 1 });
initDataFile(AGENTS_FILE, { agents: {} });
initDataFile(SESSIONS_FILE, { sessions: {} });

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
 */
app.get('/api/jobs', (req: Request, res: Response) => {
  const { status, category, minPayment, maxPayment, limit = 100 } = req.query;
  
  const jobsData = loadJobs();
  let jobs = Object.values(jobsData.jobs);

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
 * Get all agents
 */
app.get('/api/agents', (req: Request, res: Response) => {
  const { skill, minRating, verified } = req.query;
  
  const agentsData = loadAgents();
  let agents = Object.values(agentsData.agents);

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
});

export default app;
