import { Router } from 'express';
import { prisma } from '../db.js';
import { optionalAuth } from '../auth.js';

const router = Router();

router.get('/', optionalAuth, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const type = (req.query.type || 'users').toString();
  if (!q) return res.json({ users: [], posts: [] });

  if (type === 'users') {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { handle: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, handle: true, displayName: true, profilePicture: true, bio: true },
      take: 20,
    });
    return res.json({ users });
  }
  if (type === 'posts') {
    const posts = await prisma.post.findMany({
      where: { body: { contains: q, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        author: { select: { id: true, handle: true, displayName: true, profilePicture: true } },
      },
    });
    return res.json({ posts });
  }
  res.status(400).json({ error: 'invalid_type' });
});

export default router;
