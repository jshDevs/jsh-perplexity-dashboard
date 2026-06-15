import { describe, it, expect } from 'vitest'
import { SecurityValidator } from '../services/security.js'

describe('SecurityValidator', () => {
  const validator = new SecurityValidator()

  it('accepts valid CSV', async () => {
    const csv = Buffer.from('name,age\nJorge,30\nAna,25')
    const res  = await validator.validate(csv, 'data.csv', 'text/csv')
    expect(res.valid).toBe(true)
  })

  it('rejects CSV formula injection with = prefix', async () => {
    const csv = Buffer.from('cmd,value\n=CMD(malicious),100')
    const res  = await validator.validate(csv, 'data.csv', 'text/csv')
    expect(res.valid).toBe(false)
    expect(res.reason).toContain('formula injection')
  })

  it('rejects CSV formula injection with + prefix', async () => {
    const csv = Buffer.from('x\n+SUM(1,2)')
    const res  = await validator.validate(csv, 'data.csv', 'text/csv')
    expect(res.valid).toBe(false)
  })

  it('accepts valid JSON array', async () => {
    const json = Buffer.from(JSON.stringify([{ a: 1 }, { a: 2 }]))
    const res   = await validator.validate(json, 'data.json', 'application/json')
    expect(res.valid).toBe(true)
  })

  it('accepts normal XLSX by extension (no magic bytes check fails)', async () => {
    // Minimal: just check size constraint pass
    const tiny = Buffer.from('PK\x03\x04', 'binary') // ZIP magic
    const res   = await validator.validate(tiny, 'test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(res.valid).toBe(true)
  })
})
