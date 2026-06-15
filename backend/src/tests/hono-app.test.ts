/**
 * Integration test: registers analytics routes on app
 * and verifies the app export is a Hono instance
 */
import { describe, it, expect } from 'vitest'
import app from '../../src/app.js'

describe('Hono app', () => {
  it('is exported and has fetch method', () => {
    expect(typeof app.fetch).toBe('function')
  })

  it('returns 404 for unknown routes', async () => {
    const res = await app.request('/totally-unknown-route')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  it('sets security headers', async () => {
    const res = await app.request('/up')
    // secureHeaders middleware should add X-Content-Type-Options
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })
})
