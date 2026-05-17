import Redis from 'ioredis';

const url = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: null });
export const subRedis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: null });

redis.on('error', (e) => console.error('[redis]', e.message));
subRedis.on('error', (e) => console.error('[redis-sub]', e.message));
