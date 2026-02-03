/**
 * Session Repository - Database operations for sessions
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from './init';

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

const SESSION_DURATION_DAYS = 30;

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new session for a user
 */
export function createSession(userId: string): Session {
  const id = uuidv4();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(id, userId, token, expiresAt);

  return {
    id,
    user_id: userId,
    token,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };
}

/**
 * Get session by token
 */
export function getSessionByToken(token: string): Session | null {
  const stmt = db.prepare(`
    SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')
  `);
  return stmt.get(token) as Session | null;
}

/**
 * Delete session (logout)
 */
export function deleteSession(token: string): boolean {
  const stmt = db.prepare(`DELETE FROM sessions WHERE token = ?`);
  const result = stmt.run(token);
  return result.changes > 0;
}

/**
 * Delete all sessions for a user
 */
export function deleteUserSessions(userId: string): number {
  const stmt = db.prepare(`DELETE FROM sessions WHERE user_id = ?`);
  const result = stmt.run(userId);
  return result.changes;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): number {
  const stmt = db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`);
  const result = stmt.run();
  return result.changes;
}

/**
 * Extend session expiration
 */
export function extendSession(token: string): boolean {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  
  const stmt = db.prepare(`
    UPDATE sessions SET expires_at = ? WHERE token = ? AND expires_at > datetime('now')
  `);
  
  const result = stmt.run(expiresAt, token);
  return result.changes > 0;
}
