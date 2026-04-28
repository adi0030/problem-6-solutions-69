import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { redis } from './redis.js';
import { attachChat } from './chat.js';

import usersRouter from './routes/users.js';
import postsRouter from './routes/posts.js';
import commentsRouter from './routes/comments.js';
import likesRouter from './routes/likes.js';
import conversationsRouter from './routes/conversations.js';
import notificationsRouter from './routes/notifications.js';
import searchRouter from './routes/search.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const UPLOADS_ROOT = process.env.UPLOADS_DIR || '/app/uploads';
fs.mkdirSync(UPLOADS_ROOT, { recursive: true });

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static uploads served by Express in dev. In prod, Nginx serves them directly.
app.use('/uploads', express.static(UPLOADS_ROOT, { maxAge: '7d' }));

// Global rate limit: 300 req / minute / IP. Tight per-route limits below.
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
});
app.use('/api', globalLimiter);

const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
});
app.use('/api/posts', (req, res, next) =>
  req.method === 'GET' ? next() : writeLimiter(req, res, next),
);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/likes', likesRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/search', searchRouter);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

app.use((err, _req, res, _next) => {
  if (err?.message === 'invalid_image_type') {
    return res.status(400).json({ error: 'invalid_image_type' });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'file_too_large' });
  }
  console.error('[err]', err);
  res.status(500).json({ error: 'internal' });
});

const server = http.createServer(app);
attachChat(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[backend] listening on :${PORT}`);
});
