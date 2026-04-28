import { prisma } from '../db.js';

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
export const HANDLE_REGEX = HANDLE_RE;

export function isValidHandle(s) {
  return typeof s === 'string' && HANDLE_RE.test(s);
}

function sanitizeBase(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 18) || 'user';
}

export async function generateUniqueHandle(seed) {
  let base = sanitizeBase(seed);
  if (base.length < 3) base = base.padEnd(3, '0');

  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(Math.random() * 10000)}`;
    const taken = await prisma.user.findUnique({ where: { handle: candidate } });
    if (!taken) return candidate;
  }
  // Fallback: timestamp suffix
  return `${base}${Date.now().toString().slice(-5)}`;
}
