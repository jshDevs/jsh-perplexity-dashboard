import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../../src/app.js'

// Mock Redis to avoid real connection in tests
vi.mock('../services/redis.js', () => ({
  redis: {
    get:    vi.fn().mockResolvedValue(null),
    setex:  vi.fn().mockResolvedValue('OK'),
    on:     vi.fn(),
  },
}))

describe('GET /up', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.request('/up')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })
})

describe('POST /api/v1/analyze', () => {
  it('returns 400 for empty rows', async () => {
    const res = await app.request('/api/v1/analyze', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rows: [] }),
    })
    // Zod validation: min(1) on rows
    expect(res.status).toBe(400)
  })

  it('analyzes valid rows', async () => {
    const rows = [
      { fecha: '2024-01-01', incidentes: 10, distrito: 'Centro' },
      { fecha: '2024-01-02', incidentes: 15, distrito: 'Norte'  },
      { fecha: '2024-01-03', incidentes: 8,  distrito: 'Sur'    },
    ]
    const res = await app.request('/api/v1/analyze', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rows }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveProperty('schema')
    expect(body.data).toHaveProperty('kpis')
    expect(body.data).toHaveProperty('recommended_charts')
    expect(body.data).toHaveProperty('insights')
    expect(body.data).toHaveProperty('anomalies')
  })

  it('rejects rows exceeding max limit', async () => {
    const rows = Array.from({ length: 100_001 }, (_, i) => ({ n: i }))
    const res = await app.request('/api/v1/analyze', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rows }),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/v1/dashboards', () => {
  it('returns array (even if empty)', async () => {
    const res = await app.request('/api/v1/dashboards')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('GET /api/v1/schema/:id', () => {
  it('returns 404 for unknown datasetId', async () => {
    const res = await app.request('/api/v1/schema/nonexistent-id-xyz')
    expect(res.status).toBe(404)
  })
})

describe('POST /api/v1/anomalies', () => {
  it('detects anomalies via IQR', async () => {
    const values = [10, 11, 10, 12, 9, 11, 200, 10, 11, 10]
    const res    = await app.request('/api/v1/anomalies', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ values, algorithm: 'iqr' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.outliers.length).toBeGreaterThan(0)
  })

  it('detects anomalies via zscore', async () => {
    const values = [...Array.from({ length: 30 }, () => 10), 999]
    const res    = await app.request('/api/v1/anomalies', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ values, algorithm: 'zscore' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.outliers.some((o: { index: number }) => o.index === 30)).toBe(true)
  })
})

describe('POST /api/v1/forecast', () => {
  it('returns Holt-Winters forecast', async () => {
    const values = Array.from({ length: 36 }, (_, i) => 100 + Math.sin(i / 6) * 20)
    const res    = await app.request('/api/v1/forecast', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ values, season: 12, horizon: 6 }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.forecast).toHaveLength(6)
    expect(body.data.algorithm).toMatch(/holt-winters|sma/)
  })
})
