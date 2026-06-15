import { describe, it, expect, vi } from 'vitest'
import app from '../../src/app.js'

vi.mock('../services/redis.js', () => ({
  redis: {
    get:    vi.fn().mockResolvedValue(null),
    setex:  vi.fn().mockResolvedValue('OK'),
    on:     vi.fn(),
  },
}))

vi.mock('../services/duckdb.js', () => ({
  duckdb: {
    init:        vi.fn().mockResolvedValue(undefined),
    query:       vi.fn().mockResolvedValue([{ n: 1 }]),
    queryStream: vi.fn(),
  },
}))

describe('POST /api/v1/ingest/file', () => {
  it('returns 400 when no file', async () => {
    const form = new FormData()
    const res  = await app.request('/api/v1/ingest/file', {
      method: 'POST',
      body:   form,
    })
    expect(res.status).toBe(400)
  })

  it('returns 413 for oversized file', async () => {
    const bigBuffer = Buffer.alloc(53_000_000, 'a')
    const form      = new FormData()
    form.append('file', new Blob([bigBuffer], { type: 'text/csv' }), 'huge.csv')
    const res = await app.request('/api/v1/ingest/file', {
      method: 'POST',
      body:   form,
    })
    expect(res.status).toBe(413)
  })

  it('processes small valid CSV', async () => {
    const csv  = 'fecha,incidentes,distrito\n2024-01-01,10,Centro\n2024-01-02,12,Norte\n2024-01-03,8,Sur'
    const form = new FormData()
    form.append('file', new Blob([csv], { type: 'text/csv' }), 'data.csv')
    const res = await app.request('/api/v1/ingest/file', {
      method: 'POST',
      body:   form,
    })
    // 201 created or 422 if security validator flags it
    expect([201, 422].includes(res.status)).toBe(true)
  })
})

describe('POST /api/v1/ingest/json', () => {
  it('analyzes JSON payload', async () => {
    const payload = [
      { fecha: '2024-01-01', valor: 100, zona: 'Norte' },
      { fecha: '2024-01-02', valor: 120, zona: 'Sur'   },
    ]
    const res = await app.request('/api/v1/ingest/json', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ payload }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data).toHaveProperty('dataset_id')
    expect(body.data).toHaveProperty('schema')
  })

  it('returns 400 for empty payload', async () => {
    const res = await app.request('/api/v1/ingest/json', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ payload: [] }),
    })
    expect(res.status).toBe(400)
  })
})
