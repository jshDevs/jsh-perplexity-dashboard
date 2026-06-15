import { Redis } from 'ioredis'

export const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keyPrefix: 'jsh:',
})

redis.on('error', (err) => console.error('[redis]', err.message))
