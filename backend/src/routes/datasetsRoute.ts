/**
 * datasetsRoute.ts — REST API para historial de datasets.
 *
 * GET  /api/v1/datasets          → { datasets[], total }
 * GET  /api/v1/datasets/:id      → DatasetRecord
 * DELETE /api/v1/datasets/:id    → { ok: true }
 */
import { Hono }               from 'hono'
import { DatasetRepository }  from '../db/DatasetRepository'
import { requireAuth }        from '../auth/authMiddleware'
import type { Pool }          from 'pg'

export function buildDatasetsRoute(pool: Pool) {
  const repo   = new DatasetRepository(pool)
  const router = new Hono()

  router.use('*', requireAuth())

  router.get('/', async (c) => {
    const limit  = Number(c.req.query('limit')  ?? 50)
    const offset = Number(c.req.query('offset') ?? 0)
    const [datasets, total] = await Promise.all([
      repo.findAll(limit, offset),
      repo.count(),
    ])
    return c.json({ datasets, total })
  })

  router.get('/:id', async (c) => {
    const ds = await repo.findById(c.req.param('id'))
    if (!ds) return c.json({ error: 'Dataset no encontrado' }, 404)
    return c.json(ds)
  })

  router.delete('/:id', async (c) => {
    await repo.delete(c.req.param('id'))
    return c.json({ ok: true })
  })

  return router
}
