/**
 * Database initialization and schema
 * 
 * Creates SQLite database for wallet persistence
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || process.env.DATABASE_PATH || path.join(__dirname, '../../data/linera-mine.db');

// Ensure the directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
export const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
export function initializeDatabase(): void {
  console.log('📦 Initializing database...');

  // Users table - stores Linera wallet info
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      linera_chain_id TEXT,
      linera_owner_address TEXT,
      auto_signer_public TEXT,
      auto_signer_private_encrypted TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_connected_at DATETIME,
      UNIQUE(linera_chain_id),
      UNIQUE(linera_owner_address)
    )
  `);

  // Sessions table - for login persistence
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // User jobs table - links users to on-chain jobs
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('client', 'agent')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, job_id, role)
    )
  `);

  // Agent profiles table - cached agent info
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_profiles (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      skills TEXT, -- JSON array
      verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_chain_id ON users(linera_chain_id);
    CREATE INDEX IF NOT EXISTS idx_users_owner_address ON users(linera_owner_address);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_jobs_user ON user_jobs(user_id);
  `);

  console.log('✅ Database initialized successfully');
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase();
  console.log(`Database created at: ${DB_PATH}`);
  db.close();
}

export default db;
