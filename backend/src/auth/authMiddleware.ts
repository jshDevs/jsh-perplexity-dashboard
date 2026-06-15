/**
 * authMiddleware.ts — Hono middleware Bearer JWT + RBAC
 *
 * Uso:
 *   router.use('*', requireAuth())
 *   router.use('*', requireRole('admin'))
 */
import type { Context, Next } from 'hono'
import { verifyToken, type UserRole } from './authService'

declare module 'hono' {
  interface ContextVariableMap {
    user: { sub: string; email: string; role: UserRole; jti: string }
  }
}

export function requireAuth() {
  return async (c: Context, next: Next) => {
    const header = c.req.header('Authorization') ?? ''
    if (!header.startsWith('Bearer ')) {
      return c.json({ error: 'Token requerido' }, 401)
    }
    const token = header.slice(7)
    try {
      const payload = await verifyToken(token)
      c.set('user', { sub: payload.sub, email: payload.email, role: payload.role, jti: payload.jti })
      await next()
    } catch {
      return c.json({ error: 'Token inválido o expirado' }, 401)
    }
  }
}

const ROLE_RANK: Record<UserRole, number> = {
  viewer: 0,
  editor: 1,
  admin:  2,
}

export function requireRole(minRole: UserRole) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) return c.json({ error: 'No autenticado' }, 401)
    if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
      return c.json({ error: `Se requiere rol ${minRole} o superior` }, 403)
    }
    await next()
  }
}
