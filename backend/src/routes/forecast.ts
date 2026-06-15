/**
 * POST /api/v1/forecast
 * Body: { datasetId, field, method?, h?, options?, labelField? }
 * → ForecastResult + seriesData (histórico + proyección) para ECharts
 */
import { Hono }        from 'hono'
import { runForecast } from '../analytics/forecast'
import type { ForecastMethod } from '../analytics/forecast'

export function buildForecastRoutes(redis: any) {
  const router = new Hono()

  router.post('/', async (c) => {
    try {
      const body = await c.req.json() as {
        datasetId:   string
        field:       string
        method?:     ForecastMethod
        h?:          number
        options?:    Record<string, number>
        labelField?: string
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

      const labels = body.labelField
        ? dataset.rows.map((r: Record<string, unknown>) => String(r[body.labelField!]))
        : values.map((_: number, i: number) => String(i + 1))

      const h      = body.h ?? 6
      const result = runForecast(values, body.method ?? 'ets', h, body.options ?? {})

      // Construir series para ECharts: histórico + proyección separada
      const projectionLabels = Array.from({ length: h }, (_, i) =>
        `+${i + 1}`
      )

      return c.json({
        ...result,
        series: {
          labels,
          historical:  values,
          fitted:      result.fitted,
          projection:  result.forecast,
          projectionLabels,
        },
      })
    } catch (err: any) {
      return c.json({ error: err.message ?? 'Error en forecast' }, 500)
    }
  })

  return router
}
