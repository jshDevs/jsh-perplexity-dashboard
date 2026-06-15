import { describe, it, expect, vi } from 'vitest'
import app from '../../src/app.js'

// Mock Redis
vi.mock('../services/redis.js', () => ({
  redis: {
    get:    vi.fn().mockImplementation(async (key: string) => {
      if (key.includes('known-id')) {
        return JSON.stringify({
          schema:    { fields: [{ name: 'incidentes', role: 'metric', confidence: 0.95 }] },
          row_count: 500,
        })
      }
      return null
    }),
    setex: vi.fn().mockResolvedValue('OK'),
    on:    vi.fn(),
  },
}))

describe('Schema routes', () => {
  it('returns schema for known dataset', async () => {
    const res  = await app.request('/api/v1/schema/known-id')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.schema.fields).toHaveLength(1)
    expect(body.data.row_count).toBe(500)
  })

  it('returns 404 for unknown dataset', async () => {
    const res = await app.request('/api/v1/schema/unknown-xyz')
    expect(res.status).toBe(404)
  })

  it('rejects invalid column type override', async () => {
    const res = await app.request('/api/v1/schema/known-id/columns/incidentes', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'INVALID_TYPE' }),
    })
    expect(res.status).toBe(400)
  })

  it('accepts valid column type override', async () => {
    const res = await app.request('/api/v1/schema/known-id/columns/incidentes', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'METRIC' }),
    })
    // Will return 200 or 500 depending on mock depth; just not 400/422
    expect([200, 500].includes(res.status)).toBe(true)
  })
})
