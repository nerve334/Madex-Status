import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import db from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'madex-status-secret-' + Math.random().toString(36).substring(2);
const TOKEN_EXPIRY = '7d';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { userId: number; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Verify user still exists
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(payload.userId) as any;
  if (!user) {
    return res.status(401).json({ error: 'User no longer exists' });
  }

  (req as any).userId = payload.userId;
  (req as any).userRole = payload.role;
  next();
}

export function isSetupComplete(): boolean {
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('setup_complete') as any;
  return setting?.value === 'true';
}
