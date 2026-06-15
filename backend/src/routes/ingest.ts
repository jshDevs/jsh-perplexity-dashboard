/**
 * POST /api/v1/ingest
 *   multipart/form-data: file (required), sheet (optional, para Excel)
 *   → { datasetId, filename, format, rowCount, columns, warnings }
 *
 * GET  /api/v1/datasets
 *   → { datasetIds: string[] }
 *
 * GET  /api/v1/datasets/:id
 *   → ParsedDataset (sin rows para economía de payload)
 *
 * GET  /api/v1/datasets/:id/rows?page=1&pageSize=100
 *   → { rows, total, page, pageSize }
 *
 * DELETE /api/v1/datasets/:id
 *   → { ok: true }
 */
import { Hono }          from 'hono'
import { IngestionService } from '../ingestion/ingestionService'

export function buildIngestRoutes(redis: any) {
  const router  = new Hono()
  const service = new IngestionService(redis)

  // POST /ingest
  router.post('/', async (c) => {
    try {
      const body = await c.req.parseBody()
      const file = body['file'] as File | undefined

      if (!file || typeof file === 'string') {
        return c.json({ error: 'Se requiere un archivo (multipart field: file)' }, 400)
      }

      const sheetName    = typeof body['sheet'] === 'string' ? body['sheet'] : undefined
      const fileBuffer   = Buffer.from(await file.arrayBuffer())
      const originalName = file.name

      if (!originalName) {
        return c.json({ error: 'El archivo no tiene nombre' }, 400)
      }

      const { datasetId, dataset } = await service.ingest(fileBuffer, originalName, sheetName)

      return c.json({
        datasetId,
        filename:  dataset.filename,
        format:    dataset.format,
        rowCount:  dataset.rowCount,
        columns:   dataset.columns,
        sheets:    dataset.sheets,
        warnings:  dataset.warnings,
      }, 201)
    } catch (err: any) {
      return c.json({ error: err.message ?? 'Error de ingestión' }, 422)
    }
  })

  // GET /datasets
  router.get('/datasets', async (c) => {
    const datasetIds = await service.listDatasets()
    return c.json({ datasetIds })
  })

  // GET /datasets/:id
  router.get('/datasets/:id', async (c) => {
    const dataset = await service.getDataset(c.req.param('id'))
    if (!dataset) return c.json({ error: 'Dataset no encontrado' }, 404)
    const { rows: _, ...meta } = dataset
    return c.json({ ...meta, rowCount: dataset.rowCount })
  })

  // GET /datasets/:id/rows
  router.get('/datasets/:id/rows', async (c) => {
    const dataset = await service.getDataset(c.req.param('id'))
    if (!dataset) return c.json({ error: 'Dataset no encontrado' }, 404)

    const page     = Math.max(1, parseInt(c.req.query('page')     ?? '1'))
    const pageSize = Math.min(1000, parseInt(c.req.query('pageSize') ?? '100'))
    const start    = (page - 1) * pageSize
    const rows     = dataset.rows.slice(start, start + pageSize)

    return c.json({ rows, total: dataset.rowCount, page, pageSize })
  })

  // DELETE /datasets/:id
  router.delete('/datasets/:id', async (c) => {
    await service.deleteDataset(c.req.param('id'))
    return c.json({ ok: true })
  })

  return router
}
