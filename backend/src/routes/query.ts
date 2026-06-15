/**
 * POST /api/v1/query
 *   Body: { datasetId, sql, params?, maxRows? }
 *   → QueryResult
 *
 * POST /api/v1/semantic/metrics
 *   Body: MetricDefinition
 *   → { ok: true }
 *
 * GET  /api/v1/semantic/metrics
 *   → { metrics, dimensions }
 *
 * POST /api/v1/semantic/virtual-datasets
 *   Body: VirtualDataset
 *   → { ok: true }
 *
 * POST /api/v1/semantic/virtual-datasets/:id/resolve
 *   Body: { params }
 *   → ResolvedQuery
 */
import { Hono }                  from 'hono'
import { MetricsRegistry }       from '../semantic/metricsRegistry'
import { VirtualDatasets }       from '../semantic/virtualDatasets'
import { QueryParameterizer }    from '../semantic/queryParameterizer'
import { executeDatasetQuery }   from '../semantic/duckdbQueryService'
import type { MetricDefinition, VirtualDataset, QueryParam } from '../semantic/types'

// Singletons en memoria (en producción se persisten en Redis/YAML)
const registry = new MetricsRegistry('default')
const vds      = new VirtualDatasets(registry)

export function buildQueryRoutes(redis: any) {
  const router = new Hono()

  // ── Ad-hoc query sobre dataset ingestado ─────────────────────────────────
  router.post('/query', async (c) => {
    try {
      const body      = await c.req.json() as {
        datasetId: string
        sql:       string
        params?:   Record<string, unknown>
        maxRows?:  number
      }

      if (!body.datasetId || !body.sql) {
        return c.json({ error: 'datasetId y sql son requeridos' }, 400)
      }

      const raw = await redis.get(`dataset:${body.datasetId}`)
      if (!raw) return c.json({ error: 'Dataset no encontrado' }, 404)

      const dataset = JSON.parse(raw)

      // Si hay parámetros {{...}}, expandirlos antes de ejecutar
      let finalSql = body.sql
      if (body.params && Object.keys(body.params).length > 0) {
        // Extraer definiciones de params del SQL automáticamente
        const autoParams: QueryParam[] = [...body.sql.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g)]
          .map(([, name]) => ({ name, type: 'string' as const }))
        const parameterizer = new QueryParameterizer(autoParams)
        const { sql, errors } = parameterizer.resolve(body.sql, body.params)
        if (errors.length > 0) {
          return c.json({ error: 'Errores en parámetros', details: errors }, 422)
        }
        finalSql = sql
      }

      const result = await executeDatasetQuery(dataset, finalSql, body.maxRows ?? 10_000)
      return c.json(result)
    } catch (err: any) {
      return c.json({ error: err.message ?? 'Error ejecutando query' }, 500)
    }
  })

  // ── Semantic layer: métricas ──────────────────────────────────────────────
  router.get('/semantic/metrics', (c) => {
    return c.json(registry.toJSON())
  })

  router.post('/semantic/metrics', async (c) => {
    const def = await c.req.json() as MetricDefinition
    if (!def.name || !def.expression) {
      return c.json({ error: 'name y expression son requeridos' }, 400)
    }
    registry.addMetric(def)
    return c.json({ ok: true, metric: def })
  })

  router.post('/semantic/dimensions', async (c) => {
    const def = await c.req.json()
    if (!def.name || !def.field) {
      return c.json({ error: 'name y field son requeridos' }, 400)
    }
    registry.addDimension(def)
    return c.json({ ok: true })
  })

  // ── Virtual Datasets ─────────────────────────────────────────────────────
  router.get('/semantic/virtual-datasets', (c) => {
    return c.json({ virtualDatasets: vds.list() })
  })

  router.post('/semantic/virtual-datasets', async (c) => {
    const vd = await c.req.json() as VirtualDataset
    if (!vd.id || !vd.query) {
      return c.json({ error: 'id y query son requeridos' }, 400)
    }
    vds.register(vd)
    return c.json({ ok: true, id: vd.id })
  })

  router.post('/semantic/virtual-datasets/:id/resolve', async (c) => {
    const id     = c.req.param('id')
    const body   = await c.req.json() as { params?: Record<string, unknown> }
    const result = vds.resolve(id, body.params ?? {})
    if (result.errors.length > 0) {
      return c.json({ error: 'Errores al resolver', details: result.errors }, 422)
    }
    return c.json(result)
  })

  return router
}
