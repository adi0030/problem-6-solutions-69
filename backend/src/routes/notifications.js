import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const items = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: { select: { id: true, handle: true, displayName: true, profilePicture: true } },
    },
  });
  const unread = await prisma.notification.count({
    where: { userId: req.user.id, readAt: null },
  });
  res.json({ notifications: items, unread });
});

router.post('/read-all', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

export default router;
