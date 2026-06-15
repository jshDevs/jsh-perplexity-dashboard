import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../../src/app.js'

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  setex: vi.fn().mockResolvedValue('OK'),
  on: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn().mockResolvedValue(1),
}

vi.mock('../services/redis.js', () => ({ redis: mockRedis }))

describe('Auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('login returns token for valid admin credentials', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123456' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.token).toBeTruthy()
    expect(body.data.user.role).toBe('admin')
  })

  it('rejects invalid credentials', async () => {
    const res = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'badpass' }),
    })
    expect(res.status).toBe(401)
  })

  it('rejects protected route without token', async () => {
    const res = await app.request('/api/v1/dashboards')
    expect(res.status).toBe(401)
  })

  it('allows protected route with bearer token', async () => {
    const login = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123456' }),
    })
    const loginBody = await login.json()

    const res = await app.request('/api/v1/dashboards', {
      headers: { Authorization: `Bearer ${loginBody.data.token}` },
    })
    expect([200, 500].includes(res.status)).toBe(true)
  })

  it('rate limits ingest endpoint after threshold', async () => {
    mockRedis.incr
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(11)

    const login = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123456' }),
    })
    const { data } = await login.json()

    const form1 = new FormData()
    form1.append('file', new Blob(['a,b\n1,2'], { type: 'text/csv' }), 'ok.csv')
    const r1 = await app.request('/api/v1/ingest/file', {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.token}` },
      body: form1,
    })
    expect([201, 400, 422].includes(r1.status)).toBe(true)

    const form2 = new FormData()
    form2.append('file', new Blob(['a,b\n1,2'], { type: 'text/csv' }), 'ok.csv')
    const r2 = await app.request('/api/v1/ingest/file', {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.token}` },
      body: form2,
    })
    expect(r2.status).toBe(429)
  })
})
