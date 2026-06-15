/**
 * Tests para DatasetRepository y DashboardRepository
 * usando mocks de Pool (pg) — sin conexión real a PG.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DatasetRepository }  from '../../../backend/src/db/DatasetRepository'
import { DashboardRepository } from '../../../backend/src/db/DashboardRepository'

// Mock de Pool pg
function makePool(rows: any[] = []) {
  return { query: vi.fn().mockResolvedValue({ rows }) }
}

// ── DatasetRepository ───────────────────────────────────────────────────
describe('DatasetRepository', () => {
  const mockRow = {
    id: 'ds1', name: 'Ventas', source_type: 'csv',
    row_count: 100, column_count: 5, file_size: 2048,
    schema_json: [], preview_json: [],
    ingest_status: 'ready', error_msg: null,
    created_at: '2026-01-01', updated_at: '2026-01-02',
  }

  it('findById retorna DatasetRecord mapeado', async () => {
    const pool = makePool([mockRow])
    const repo = new DatasetRepository(pool as any)
    const result = await repo.findById('ds1')
    expect(result?.id).toBe('ds1')
    expect(result?.sourceType).toBe('csv')
    expect(result?.rowCount).toBe(100)
  })

  it('findById retorna null si no hay filas', async () => {
    const pool = makePool([])
    const repo = new DatasetRepository(pool as any)
    expect(await repo.findById('nope')).toBeNull()
  })

  it('findAll llama query con LIMIT y OFFSET', async () => {
    const pool = makePool([mockRow])
    const repo = new DatasetRepository(pool as any)
    await repo.findAll(25, 50)
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT'), [25, 50])
  })

  it('upsert llama INSERT ON CONFLICT', async () => {
    const pool = makePool([mockRow])
    const repo = new DatasetRepository(pool as any)
    await repo.upsert({
      id: 'ds1', name: 'Ventas', sourceType: 'csv',
      rowCount: 100, columnCount: 5, fileSize: 2048,
      schemaJson: [], previewJson: [], ingestStatus: 'ready',
    })
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      expect.any(Array)
    )
  })

  it('updateStatus llama UPDATE con los parámetros correctos', async () => {
    const pool = makePool([])
    const repo = new DatasetRepository(pool as any)
    await repo.updateStatus('ds1', 'error', 'fallo de parseo')
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE datasets'),
      ['error', 'fallo de parseo', 'ds1']
    )
  })

  it('delete llama DELETE WHERE id', async () => {
    const pool = makePool([])
    const repo = new DatasetRepository(pool as any)
    await repo.delete('ds1')
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('DELETE'), ['ds1'])
  })

  it('count retorna el número de datasets', async () => {
    const pool = makePool([{ n: 42 }])
    const repo = new DatasetRepository(pool as any)
    expect(await repo.count()).toBe(42)
  })
})

// ── DashboardRepository ────────────────────────────────────────────────
describe('DashboardRepository', () => {
  const mockDash = {
    id: 'dash1', name: 'Mi Dashboard', owner_id: 'u1',
    items_json: [], item_count: 0, is_public: false,
    created_at: '2026-01-01', updated_at: '2026-01-02',
  }

  it('findById retorna DashboardRecord mapeado', async () => {
    const pool = makePool([mockDash])
    const repo = new DashboardRepository(pool as any)
    const result = await repo.findById('dash1')
    expect(result?.id).toBe('dash1')
    expect(result?.ownerId).toBe('u1')
    expect(result?.isPublic).toBe(false)
  })

  it('findById retorna null si no existe', async () => {
    const pool = makePool([])
    const repo = new DashboardRepository(pool as any)
    expect(await repo.findById('nope')).toBeNull()
  })

  it('upsert usa INSERT ON CONFLICT', async () => {
    const pool = makePool([mockDash])
    const repo = new DashboardRepository(pool as any)
    await repo.upsert({ id: 'dash1', name: 'Mi Dashboard', items: [], createdAt: '', updatedAt: '' } as any, 'u1')
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      expect.any(Array)
    )
  })

  it('delete llama DELETE WHERE id', async () => {
    const pool = makePool([])
    const repo = new DashboardRepository(pool as any)
    await repo.delete('dash1')
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('DELETE'), ['dash1'])
  })

  it('setPublic actualiza is_public', async () => {
    const pool = makePool([])
    const repo = new DashboardRepository(pool as any)
    await repo.setPublic('dash1', true)
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('is_public'),
      [true, 'dash1']
    )
  })

  it('count retorna número de dashboards', async () => {
    const pool = makePool([{ n: 7 }])
    const repo = new DashboardRepository(pool as any)
    expect(await repo.count()).toBe(7)
  })
})
