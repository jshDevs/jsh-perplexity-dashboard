import { createMiddleware } from 'hono/factory'
import { sign, verify } from 'hono/jwt'
import type { Context, Next } from 'hono'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'

export interface AuthUser {
  sub: string
  role: 'admin' | 'viewer'
  exp: number
}

export async function createToken(payload: Omit<AuthUser, 'exp'>, ttlSeconds = 60 * 60 * 8) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  return sign({ ...payload, exp }, JWT_SECRET)
}

export async function verifyToken(token: string) {
  return verify(token, JWT_SECRET) as Promise<AuthUser>
}

export const authRequired = () => createMiddleware(async (c: Context, next: Next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = auth.slice(7)
  try {
    const user = await verifyToken(token)
    c.set('user', user)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
