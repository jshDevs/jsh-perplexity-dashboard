/**
 * authRoutes.ts — rutas de autenticación
 *
 * POST /api/v1/auth/login    → { accessToken, refreshToken, expiresIn, user }
 * POST /api/v1/auth/refresh  → { accessToken, refreshToken, expiresIn }
 * POST /api/v1/auth/logout   → { ok: true }
 * GET  /api/v1/auth/me       → { sub, email, role }
 *
 * Usuarios se leen de Redis clave users:<email> (JSON: {id,email,role,passwordHash})
 * En producción cargar desde PostgreSQL — Redis como cache de sesión.
 */
import { Hono }   from 'hono'
import * as bcrypt from 'bcryptjs'
import {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  verifyToken,
} from './authService'
import { requireAuth } from './authMiddleware'

export function buildAuthRoutes(redis: any) {
  const router = new Hono()

  // POST /login
  router.post('/login', async (c) => {
    const { email, password } = await c.req.json().catch(() => ({}))
    if (!email || !password) return c.json({ error: 'email y password requeridos' }, 400)

    const raw = await redis.get(`user:${email}`)
    if (!raw) return c.json({ error: 'Credenciales inválidas' }, 401)

    const user: { id: string; email: string; role: any; passwordHash: string } = JSON.parse(raw)
    const valid = await bcrypt.compare(String(password), user.passwordHash)
    if (!valid) return c.json({ error: 'Credenciales inválidas' }, 401)

    const tokens = await issueTokenPair(redis, user.id, user.email, user.role)
    return c.json({ ...tokens, user: { id: user.id, email: user.email, role: user.role } })
  })

  // POST /refresh
  router.post('/refresh', async (c) => {
    const { refreshToken } = await c.req.json().catch(() => ({}))
    if (!refreshToken) return c.json({ error: 'refreshToken requerido' }, 400)
    try {
      const tokens = await rotateRefreshToken(redis, refreshToken)
      return c.json(tokens)
    } catch {
      return c.json({ error: 'Token inválido o revocado' }, 401)
    }
  })

  // POST /logout
  router.post('/logout', requireAuth(), async (c) => {
    const user = c.get('user')
    await revokeRefreshToken(redis, user.jti)
    return c.json({ ok: true })
  })

  // GET /me
  router.get('/me', requireAuth(), (c) => {
    const { sub, email, role } = c.get('user')
    return c.json({ sub, email, role })
  })

  return router
}
