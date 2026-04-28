import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const LikeSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT']),
  targetId: z.string().min(1),
});

async function notifyLike(actorId, targetType, targetId) {
  let recipientId = null;
  if (targetType === 'POST') {
    const p = await prisma.post.findUnique({ where: { id: targetId }, select: { authorId: true } });
    recipientId = p?.authorId;
  } else {
    const c = await prisma.comment.findUnique({ where: { id: targetId }, select: { authorId: true } });
    recipientId = c?.authorId;
  }
  if (!recipientId || recipientId === actorId) return;
  await prisma.notification.create({
    data: { userId: recipientId, actorId, type: 'LIKE', targetType, targetId },
  });
}

router.post('/', requireAuth, async (req, res) => {
  const parsed = LikeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });
  const { targetType, targetId } = parsed.data;

  try {
    await prisma.like.create({
      data: { userId: req.user.id, targetType, targetId },
    });
    await notifyLike(req.user.id, targetType, targetId);
  } catch {
    // unique violation = already liked, treat as idempotent
  }
  const count = await prisma.like.count({ where: { targetType, targetId } });
  res.json({ liked: true, count });
});

router.delete('/', requireAuth, async (req, res) => {
  const parsed = LikeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' });
  const { targetType, targetId } = parsed.data;

  await prisma.like.deleteMany({
    where: { userId: req.user.id, targetType, targetId },
  });
  const count = await prisma.like.count({ where: { targetType, targetId } });
  res.json({ liked: false, count });
});

export default router;
