import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signAccessToken, signRefreshToken, verifyToken } from '../../../backend/src/auth/authService'

describe('authService — JWT', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-32-chars-minimum-ok'
  })

  it('signAccessToken produce un JWT verificable', async () => {
    const token = await signAccessToken({ sub: 'u1', email: 'a@b.com', role: 'viewer' })
    expect(token).toBeTruthy()
    expect(token.split('.').length).toBe(3)
  })

  it('verifyToken retorna el payload correcto', async () => {
    const token = await signAccessToken({ sub: 'u1', email: 'a@b.com', role: 'editor' })
    const payload = await verifyToken(token)
    expect(payload.sub).toBe('u1')
    expect(payload.email).toBe('a@b.com')
    expect(payload.role).toBe('editor')
  })

  it('verifyToken lanza error con token manipulado', async () => {
    const token = await signAccessToken({ sub: 'u1', email: 'a@b.com', role: 'viewer' })
    const parts = token.split('.')
    parts[1] = Buffer.from(JSON.stringify({ sub: 'hacker', role: 'admin' })).toString('base64url')
    await expect(verifyToken(parts.join('.'))).rejects.toThrow()
  })

  it('signRefreshToken retorna token + jti', async () => {
    const { token, jti } = await signRefreshToken({ sub: 'u2', email: 'b@c.com', role: 'admin' })
    expect(token).toBeTruthy()
    expect(jti).toBeTruthy()
    const payload = await verifyToken(token)
    expect(payload.jti).toBe(jti)
  })
})

describe('authMiddleware — requireRole', () => {
  const RANK: Record<string, number> = { viewer: 0, editor: 1, admin: 2 }

  function canAccess(userRole: string, minRole: string) {
    return RANK[userRole] >= RANK[minRole]
  }

  it('viewer puede acceder a rutas viewer', () => {
    expect(canAccess('viewer', 'viewer')).toBe(true)
  })

  it('viewer NO puede acceder a rutas editor', () => {
    expect(canAccess('viewer', 'editor')).toBe(false)
  })

  it('editor puede acceder a rutas viewer y editor', () => {
    expect(canAccess('editor', 'viewer')).toBe(true)
    expect(canAccess('editor', 'editor')).toBe(true)
  })

  it('editor NO puede acceder a rutas admin', () => {
    expect(canAccess('editor', 'admin')).toBe(false)
  })

  it('admin puede acceder a todas las rutas', () => {
    expect(canAccess('admin', 'viewer')).toBe(true)
    expect(canAccess('admin', 'editor')).toBe(true)
    expect(canAccess('admin', 'admin')).toBe(true)
  })
})

describe('authStore — lógica de estado', () => {
  it('clear resetea todo el estado', async () => {
    const { useAuthStore } = await import('@/store/authStore')
    useAuthStore.setState({
      user: { id: 'u1', email: 'a@b.com', role: 'admin' },
      accessToken:  'tok',
      refreshToken: 'ref',
      isAuth: true,
    })
    useAuthStore.getState().clear()
    const s = useAuthStore.getState()
    expect(s.isAuth).toBe(false)
    expect(s.accessToken).toBeNull()
    expect(s.user).toBeNull()
  })

  it('setTokens actualiza estado completo', async () => {
    const { useAuthStore } = await import('@/store/authStore')
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuth: false })
    useAuthStore.getState().setTokens('at', 'rt', { id: 'u2', email: 'x@y.com', role: 'editor' })
    const s = useAuthStore.getState()
    expect(s.isAuth).toBe(true)
    expect(s.user?.role).toBe('editor')
  })

  it('isAuth false por defecto en store limpio', async () => {
    const { useAuthStore } = await import('@/store/authStore')
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuth: false })
    expect(useAuthStore.getState().isAuth).toBe(false)
  })
})
