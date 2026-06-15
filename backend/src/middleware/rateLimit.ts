import { createMiddleware } from 'hono/factory'
import { redis } from '../services/redis.js'

export const ingestRateLimit = () => createMiddleware(async (c, next) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown'

  const windowSec  = parseInt(process.env.RATE_LIMIT_WINDOW_SEC ?? '60', 10)
  const maxReq     = parseInt(process.env.RATE_LIMIT_MAX_REQ ?? '10', 10)
  const bucketKey  = `ratelimit:ingest:${ip}:${Math.floor(Date.now() / 1000 / windowSec)}`

  const current = await redis.incr(bucketKey)
  if (current === 1) {
    await redis.expire(bucketKey, windowSec + 2)
  }

  c.header('X-RateLimit-Limit', String(maxReq))
  c.header('X-RateLimit-Remaining', String(Math.max(0, maxReq - current)))
  c.header('X-RateLimit-Window', String(windowSec))

  if (current > maxReq) {
    return c.json({ error: 'Too Many Requests' }, 429)
  }

  await next()
})
