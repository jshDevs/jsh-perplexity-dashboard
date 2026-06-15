/**
 * POST /api/v1/anomaly
 * Body: { datasetId, field, method?, options? }
 * → AnomalyResult + markPoints para ECharts
 */
import { Hono }            from 'hono'
import { detectAnomalies } from '../analytics/anomaly'
import type { AnomalyMethod } from '../analytics/anomaly'

export function buildAnomalyRoutes(redis: any) {
  const router = new Hono()

  router.post('/', async (c) => {
    try {
      const body = await c.req.json() as {
        datasetId: string
        field:     string
        method?:   AnomalyMethod
        options?:  Record<string, number>
        labelField?: string   // campo para etiquetar el eje X (ej: 'fecha')
      }

      if (!body.datasetId || !body.field) {
        return c.json({ error: 'datasetId y field son requeridos' }, 400)
      }

      const raw = await redis.get(`dataset:${body.datasetId}`)
      if (!raw) return c.json({ error: 'Dataset no encontrado' }, 404)

      const dataset = JSON.parse(raw)
      const values: number[] = dataset.rows
        .map((r: Record<string, unknown>) => parseFloat(String(r[body.field])))
        .filter((v: number) => !isNaN(v))

      if (values.length < 4) {
        return c.json({ error: 'Se necesitan al menos 4 valores numéricos' }, 422)
      }

      const result = detectAnomalies(values, body.method ?? 'mad', body.options ?? {})

      // Construir markPoints para ECharts
      const labels = body.labelField
        ? dataset.rows.map((r: Record<string, unknown>) => r[body.labelField!])
        : values.map((_: number, i: number) => i)

      const markPoints = result.anomalies.map((a) => ({
        name:  a.label,
        coord: [labels[a.index], a.value],
        value: a.score.toFixed(2),
        itemStyle: {
          color: a.score > 0.7 ? '#ef4444' : a.score > 0.4 ? '#f97316' : '#eab308',
        },
      }))

      return c.json({ ...result, markPoints })
    } catch (err: any) {
      return c.json({ error: err.message ?? 'Error en análisis de anomalías' }, 500)
    }
  })

  return router
}
