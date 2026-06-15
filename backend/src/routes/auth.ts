import { Hono } from 'hono'
import { z } from 'zod'
import { createToken } from '../middleware/auth.js'

const authRoutes = new Hono()

const loginSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(6).max(128),
})

const USERS = [
  {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123456',
    role: 'admin' as const,
  },
  {
    username: process.env.VIEWER_USERNAME || 'viewer',
    password: process.env.VIEWER_PASSWORD || 'viewer123456',
    role: 'viewer' as const,
  },
]

authRoutes.post('/login', async (c) => {
  const body = await c.req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid credentials payload' }, 400)
  }

  const user = USERS.find(
    (u) => u.username === parsed.data.username && u.password === parsed.data.password
  )

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const token = await createToken({ sub: user.username, role: user.role })
  return c.json({
    data: {
      token,
      user: {
        username: user.username,
        role: user.role,
      },
      expires_in: 60 * 60 * 8,
    },
  }, 200)
})

export { authRoutes }
