/**
 * User Repository - Database operations for users
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from './init';

export interface User {
  id: string;
  email?: string;
  linera_chain_id?: string;
  linera_owner_address?: string;
  auto_signer_public?: string;
  created_at: string;
  last_connected_at?: string;
}

export interface CreateUserInput {
  email?: string;
  password?: string;
  lineraChainId: string;
  lineraOwnerAddress: string;
  autoSignerPublic?: string;
  autoSignerPrivateEncrypted?: string;
}

export interface WalletData {
  chainId: string;
  ownerAddress: string;
  autoSignerPublic?: string;
  autoSignerPrivateEncrypted?: string;
}

/**
 * Create a new user with Linera wallet
 */
export function createUser(input: CreateUserInput): User {
  const id = uuidv4();
  const passwordHash = input.password ? bcrypt.hashSync(input.password, 10) : null;

  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, linera_chain_id, linera_owner_address, auto_signer_public, auto_signer_private_encrypted)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.email || null,
    passwordHash,
    input.lineraChainId,
    input.lineraOwnerAddress,
    input.autoSignerPublic || null,
    input.autoSignerPrivateEncrypted || null
  );

  return getUserById(id)!;
}

/**
 * Get user by ID
 */
export function getUserById(id: string): User | null {
  const stmt = db.prepare(`
    SELECT id, email, linera_chain_id, linera_owner_address, auto_signer_public, created_at, last_connected_at
    FROM users WHERE id = ?
  `);
  return stmt.get(id) as User | null;
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): User | null {
  const stmt = db.prepare(`
    SELECT id, email, linera_chain_id, linera_owner_address, auto_signer_public, created_at, last_connected_at
    FROM users WHERE email = ?
  `);
  return stmt.get(email) as User | null;
}

/**
 * Get user by Linera chain ID
 */
export function getUserByChainId(chainId: string): User | null {
  const stmt = db.prepare(`
    SELECT id, email, linera_chain_id, linera_owner_address, auto_signer_public, created_at, last_connected_at
    FROM users WHERE linera_chain_id = ?
  `);
  return stmt.get(chainId) as User | null;
}

/**
 * Get user by Linera owner address
 */
export function getUserByOwnerAddress(address: string): User | null {
  const stmt = db.prepare(`
    SELECT id, email, linera_chain_id, linera_owner_address, auto_signer_public, created_at, last_connected_at
    FROM users WHERE LOWER(linera_owner_address) = LOWER(?)
  `);
  return stmt.get(address) as User | null;
}

/**
 * Verify user password
 */
export function verifyPassword(email: string, password: string): User | null {
  const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
  const user = stmt.get(email) as any;
  
  if (!user || !user.password_hash) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  
  return {
    id: user.id,
    email: user.email,
    linera_chain_id: user.linera_chain_id,
    linera_owner_address: user.linera_owner_address,
    auto_signer_public: user.auto_signer_public,
    created_at: user.created_at,
    last_connected_at: user.last_connected_at
  };
}

/**
 * Update user's Linera wallet info
 */
export function updateUserWallet(userId: string, wallet: WalletData): boolean {
  const stmt = db.prepare(`
    UPDATE users 
    SET linera_chain_id = ?, linera_owner_address = ?, auto_signer_public = ?, 
        auto_signer_private_encrypted = ?, last_connected_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  const result = stmt.run(
    wallet.chainId,
    wallet.ownerAddress,
    wallet.autoSignerPublic || null,
    wallet.autoSignerPrivateEncrypted || null,
    userId
  );
  
  return result.changes > 0;
}

/**
 * Get user's encrypted signer key (for wallet recovery)
 */
export function getUserEncryptedKey(userId: string): string | null {
  const stmt = db.prepare(`
    SELECT auto_signer_private_encrypted FROM users WHERE id = ?
  `);
  const result = stmt.get(userId) as { auto_signer_private_encrypted: string } | undefined;
  return result?.auto_signer_private_encrypted || null;
}

/**
 * Update last connected timestamp
 */
export function updateLastConnected(userId: string): void {
  const stmt = db.prepare(`
    UPDATE users SET last_connected_at = CURRENT_TIMESTAMP WHERE id = ?
  `);
  stmt.run(userId);
}

/**
 * Delete user and all associated data
 */
export function deleteUser(userId: string): boolean {
  const stmt = db.prepare(`DELETE FROM users WHERE id = ?`);
  const result = stmt.run(userId);
  return result.changes > 0;
}
