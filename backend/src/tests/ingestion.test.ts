import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sanitizeCellValue, sanitizeRows, validateFile } from '../ingestion/security'
import { parseCsv }   from '../ingestion/parsers/csvParser'
import { parseJson }  from '../ingestion/parsers/jsonParser'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import os   from 'os'

const TMP = os.tmpdir()

function tmpFile(name: string, content: string | Buffer): string {
  const p = path.join(TMP, name)
  writeFileSync(p, content)
  return p
}

// ─── security ───────────────────────────────────────────────────────────────
describe('sanitizeCellValue', () => {
  it('deja valores normales intactos', () => {
    expect(sanitizeCellValue('ventas')).toBe('ventas')
    expect(sanitizeCellValue(1234)).toBe(1234)
    expect(sanitizeCellValue(null)).toBe(null)
  })

  it('prefija con apostrofe fórmulas =', () => {
    expect(sanitizeCellValue('=CMD|/C calc')).toBe("'=CMD|/C calc")
  })

  it('prefija con apostrofe fórmulas +', () => {
    expect(sanitizeCellValue('+1-2')).toBe("'+1-2")
  })

  it('prefija con apostrofe fórmulas @', () => {
    expect(sanitizeCellValue('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('prefija con apostrofe fórmulas -', () => {
    expect(sanitizeCellValue('-1+2')).toBe("'-1+2")
  })
})

describe('sanitizeRows', () => {
  it('sanitiza todas las celdas del batch', () => {
    const rows = [{ cmd: '=EXEC()', normal: 'ok' }]
    const result = sanitizeRows(rows)
    expect(result[0].cmd).toBe("'=EXEC()")
    expect(result[0].normal).toBe('ok')
  })
})

// ─── csvParser ───────────────────────────────────────────────────────────────
describe('parseCsv', () => {
  it('parsea CSV básico con headers', () => {
    const csv = 'fecha,ventas,zona\n2024-01,1200,Norte\n2024-02,1500,Sur'
    const p   = tmpFile('test.csv', csv)
    const ds  = parseCsv(p, 'test.csv', 'ds-test')
    expect(ds.rowCount).toBe(2)
    expect(ds.columns).toContain('ventas')
    expect(ds.rows[0].ventas).toBe(1200)
  })

  it('auto-detecta separador punto y coma', () => {
    const csv = 'a;b;c\n1;2;3\n4;5;6'
    const p   = tmpFile('semi.csv', csv)
    const ds  = parseCsv(p, 'semi.csv', 'ds-semi')
    expect(ds.rowCount).toBe(2)
    expect(ds.columns).toContain('a')
  })

  it('sanitiza formula injection en CSV', () => {
    const csv = 'nombre,cmd\nlegit,=EXEC()'
    const p   = tmpFile('inject.csv', csv)
    const ds  = parseCsv(p, 'inject.csv', 'ds-inject')
    expect(ds.rows[0].cmd).toBe("'=EXEC()")
  })

  it('dynamicTyping convierte números', () => {
    const csv = 'x,y\n1,2.5\n3,4.7'
    const p   = tmpFile('nums.csv', csv)
    const ds  = parseCsv(p, 'nums.csv', 'ds-nums')
    expect(typeof ds.rows[0].x).toBe('number')
  })
})

// ─── jsonParser ──────────────────────────────────────────────────────────────
describe('parseJson', () => {
  it('parsea array JSON simple', () => {
    const json = JSON.stringify([{ fecha: '2024-01', ventas: 100 }])
    const p    = tmpFile('test.json', json)
    const ds   = parseJson(p, 'test.json', 'ds-json')
    expect(ds.rowCount).toBe(1)
    expect(ds.rows[0].ventas).toBe(100)
  })

  it('extrae array desde objeto wrapper { data: [...] }', () => {
    const json = JSON.stringify({ data: [{ x: 1 }, { x: 2 }] })
    const p    = tmpFile('wrapped.json', json)
    const ds   = parseJson(p, 'wrapped.json', 'ds-wrap')
    expect(ds.rowCount).toBe(2)
  })

  it('aplana objetos anidados con dot notation', () => {
    const json = JSON.stringify([{ user: { name: 'Jorge', age: 28 }, score: 100 }])
    const p    = tmpFile('nested.json', json)
    const ds   = parseJson(p, 'nested.json', 'ds-nested')
    expect(ds.columns).toContain('user.name')
    expect(ds.columns).toContain('user.age')
    expect(ds.columns).toContain('score')
  })

  it('parsea NDJSON / JSON Lines', () => {
    const ndjson = '{"x":1}\n{"x":2}\n{"x":3}'
    const p      = tmpFile('lines.json', ndjson)
    const ds     = parseJson(p, 'lines.json', 'ds-nd')
    expect(ds.rowCount).toBe(3)
    expect(ds.warnings.some((w) => w.includes('JSON Lines'))).toBe(true)
  })

  it('lanza error en JSON inválido', () => {
    const p = tmpFile('bad.json', 'not json at all }{{')
    expect(() => parseJson(p, 'bad.json', 'ds-bad')).toThrow()
  })
}
)

// ─── ingestionService (mock Redis) ───────────────────────────────────────────
describe('IngestionService', () => {
  let service: any
  const store = new Map<string, string>()
  const mockRedis = {
    set:  async (k: string, v: string, _opts: any) => { store.set(k, v) },
    get:  async (k: string) => store.get(k) ?? null,
    del:  async (k: string) => { store.delete(k) },
    keys: async (pattern: string) => [...store.keys()].filter((k) => k.startsWith('dataset:')),
  }

  beforeEach(async () => {
    store.clear()
    const { IngestionService } = await import('../ingestion/ingestionService')
    service = new IngestionService(mockRedis)
  })

  it('ingesta CSV y retorna datasetId', async () => {
    const csv    = Buffer.from('a,b\n1,2\n3,4')
    const result = await service.ingest(csv, 'data.csv')
    expect(result.datasetId).toBeTruthy()
    expect(result.dataset.rowCount).toBe(2)
  })

  it('getDataset retorna null para id inexistente', async () => {
    const r = await service.getDataset('nonexistent-uuid')
    expect(r).toBeNull()
  })

  it('listDatasets retorna ids tras ingestión', async () => {
    const csv = Buffer.from('x,y\n1,2')
    await service.ingest(csv, 'a.csv')
    await service.ingest(csv, 'b.csv')
    const ids = await service.listDatasets()
    expect(ids.length).toBe(2)
  })

  it('deleteDataset elimina el dataset', async () => {
    const csv = Buffer.from('x,y\n1,2')
    const { datasetId } = await service.ingest(csv, 'del.csv')
    await service.deleteDataset(datasetId)
    const r = await service.getDataset(datasetId)
    expect(r).toBeNull()
  })
})
