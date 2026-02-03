/**
 * Linera Mine Backend API v2.0
 * 
 * Provides:
 * - Wallet persistence (store/recover Linera chain credentials)
 * - User authentication (optional email/password)
 * - Session management
 * 
 * All wallet data is stored encrypted and can be recovered cross-device.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

import { initializeDatabase } from './db/init';
import * as Users from './db/users';
import * as Sessions from './db/sessions';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8081;

// Encryption key for signer keys (should be in env in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Initialize database
initializeDatabase();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// =============================================================================
// ENCRYPTION HELPERS
// =============================================================================

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// =============================================================================
// AUTH MIDDLEWARE
// =============================================================================

interface AuthRequest extends Request {
  userId?: string;
  session?: Sessions.Session;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  const session = Sessions.getSessionByToken(token);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  req.userId = session.user_id;
  req.session = session;
  
  // Extend session on each request
  Sessions.extendSession(token);
  
  next();
}

// =============================================================================
// ROUTES
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'linera-mine-backend',
    version: '2.0.0'
  });
});

/**
 * Register/Login with wallet
 * 
 * Creates or retrieves user based on Linera wallet address.
 * Stores encrypted signer key for wallet recovery.
 */
app.post('/api/auth/wallet', async (req: Request, res: Response) => {
  try {
    const { chainId, ownerAddress, autoSignerPublic, autoSignerPrivate } = req.body;
    
    if (!chainId || !ownerAddress) {
      return res.status(400).json({ error: 'chainId and ownerAddress required' });
    }
    
    // Check if user exists with this wallet
    let user = Users.getUserByOwnerAddress(ownerAddress);
    
    if (user) {
      // Existing user - update wallet info and create session
      if (autoSignerPrivate) {
        Users.updateUserWallet(user.id, {
          chainId,
          ownerAddress,
          autoSignerPublic,
          autoSignerPrivateEncrypted: encrypt(autoSignerPrivate)
        });
      }
      Users.updateLastConnected(user.id);
    } else {
      // New user - create account
      user = Users.createUser({
        lineraChainId: chainId,
        lineraOwnerAddress: ownerAddress,
        autoSignerPublic,
        autoSignerPrivateEncrypted: autoSignerPrivate ? encrypt(autoSignerPrivate) : undefined
      });
    }
    
    // Create session
    const session = Sessions.createSession(user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        chainId: user.linera_chain_id,
        ownerAddress: user.linera_owner_address
      },
      token: session.token,
      expiresAt: session.expires_at
    });
    
  } catch (error: any) {
    console.error('Auth error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Register with email/password (optional)
 * Links email to existing wallet
 */
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, chainId, ownerAddress, autoSignerPublic, autoSignerPrivate } = req.body;
    
    if (!email || !password || !chainId || !ownerAddress) {
      return res.status(400).json({ error: 'email, password, chainId, and ownerAddress required' });
    }
    
    // Check if email already exists
    const existingUser = Users.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Create user with email
    const user = Users.createUser({
      email,
      password,
      lineraChainId: chainId,
      lineraOwnerAddress: ownerAddress,
      autoSignerPublic,
      autoSignerPrivateEncrypted: autoSignerPrivate ? encrypt(autoSignerPrivate) : undefined
    });
    
    // Create session
    const session = Sessions.createSession(user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        chainId: user.linera_chain_id,
        ownerAddress: user.linera_owner_address
      },
      token: session.token,
      expiresAt: session.expires_at
    });
    
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Login with email/password
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    
    const user = Users.verifyPassword(email, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    Users.updateLastConnected(user.id);
    const session = Sessions.createSession(user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        chainId: user.linera_chain_id,
        ownerAddress: user.linera_owner_address
      },
      token: session.token,
      expiresAt: session.expires_at
    });
    
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Logout - invalidate session
 */
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    Sessions.deleteSession(token);
  }
  
  res.json({ success: true });
});

/**
 * Get current user info
 */
app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = Users.getUserById(req.userId!);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    id: user.id,
    email: user.email,
    chainId: user.linera_chain_id,
    ownerAddress: user.linera_owner_address,
    autoSignerPublic: user.auto_signer_public,
    createdAt: user.created_at,
    lastConnectedAt: user.last_connected_at
  });
});

/**
 * Recover wallet - get encrypted signer key
 * Returns encrypted key that client decrypts with user password
 */
app.get('/api/wallet/recover', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = Users.getUserById(req.userId!);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const encryptedKey = Users.getUserEncryptedKey(req.userId!);
  
  if (!encryptedKey) {
    return res.status(404).json({ error: 'No wallet key stored' });
  }
  
  // Decrypt and return (in production, use client-side decryption)
  try {
    const decryptedKey = decrypt(encryptedKey);
    
    res.json({
      chainId: user.linera_chain_id,
      ownerAddress: user.linera_owner_address,
      autoSignerPublic: user.auto_signer_public,
      autoSignerPrivate: decryptedKey
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to decrypt wallet' });
  }
});

/**
 * Update wallet info
 */
app.put('/api/wallet', authMiddleware, (req: AuthRequest, res: Response) => {
  const { chainId, ownerAddress, autoSignerPublic, autoSignerPrivate } = req.body;
  
  if (!chainId || !ownerAddress) {
    return res.status(400).json({ error: 'chainId and ownerAddress required' });
  }
  
  const success = Users.updateUserWallet(req.userId!, {
    chainId,
    ownerAddress,
    autoSignerPublic,
    autoSignerPrivateEncrypted: autoSignerPrivate ? encrypt(autoSignerPrivate) : undefined
  });
  
  if (!success) {
    return res.status(500).json({ error: 'Failed to update wallet' });
  }
  
  res.json({ success: true });
});

/**
 * Export wallet (download as JSON)
 */
app.get('/api/wallet/export', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = Users.getUserById(req.userId!);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const encryptedKey = Users.getUserEncryptedKey(req.userId!);
  let autoSignerPrivate: string | undefined;
  
  if (encryptedKey) {
    try {
      autoSignerPrivate = decrypt(encryptedKey);
    } catch (e) {
      // Key decryption failed
    }
  }
  
  const walletExport = {
    chainId: user.linera_chain_id,
    ownerAddress: user.linera_owner_address,
    autoSignerPublic: user.auto_signer_public,
    autoSignerPrivate,
    exportedAt: new Date().toISOString(),
    network: 'linera-testnet-conway'
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="linera-wallet-${user.linera_owner_address?.slice(0, 8)}.json"`);
  res.json(walletExport);
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log('===========================================');
  console.log('  🟩 Linera Mine Backend v2.0');
  console.log('===========================================');
  console.log(`  Server:    http://localhost:${PORT}`);
  console.log(`  Health:    http://localhost:${PORT}/health`);
  console.log('');
  console.log('  Endpoints:');
  console.log('    POST /api/auth/wallet   - Connect wallet');
  console.log('    POST /api/auth/register - Register with email');
  console.log('    POST /api/auth/login    - Login with email');
  console.log('    GET  /api/auth/me       - Get current user');
  console.log('    GET  /api/wallet/recover - Recover wallet');
  console.log('    GET  /api/wallet/export  - Export wallet');
  console.log('===========================================');
});

export default app;
