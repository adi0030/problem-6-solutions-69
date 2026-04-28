// Authentication middleware.
// The frontend (NextAuth) signs a JWT with NEXTAUTH_SECRET. We verify it here.
// Server-to-server calls (e.g. user sync on first login) use INTERNAL_API_TOKEN.

import jwt from 'jsonwebtoken';
import { prisma } from './db.js';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || '';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthenticated' });

  try {
    const payload = jwt.verify(token, NEXTAUTH_SECRET);
    const userId = payload.sub || payload.userId;
    if (!userId) return res.status(401).json({ error: 'invalid_token' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'user_not_found' });

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

export function requireInternal(req, res, next) {
  const header = req.headers['x-internal-token'];
  if (!INTERNAL_API_TOKEN || header !== INTERNAL_API_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}

// Optional auth: attaches req.user if present but does not 401.
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, NEXTAUTH_SECRET);
    const userId = payload.sub || payload.userId;
    if (userId) {
      req.user = await prisma.user.findUnique({ where: { id: userId } });
    }
  } catch {
    /* ignore */
  }
  return next();
}
