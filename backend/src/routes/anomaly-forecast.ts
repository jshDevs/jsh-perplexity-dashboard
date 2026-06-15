import { Hono }  from 'hono'
import { z }     from 'zod'
import { zValidator } from '@hono/zod-validator'
import { holtWinters } from '../services/forecast.js'
// @ts-ignore
import * as stats from '../engine/statistics.js'

export const analyticsRoutes = new Hono()

const ValuesSchema = z.object({
  values:    z.array(z.number()).min(4).max(50_000),
  algorithm: z.enum(['iqr', 'zscore', 'modified_zscore', 'cusum', 'auto']).default('auto'),
})

// ── Anomaly detection ─────────────────────────────────────────────────────────
analyticsRoutes.post('/anomalies', zValidator('json', ValuesSchema), (c) => {
  const { values, algorithm } = c.req.valid('json')

  let result
  if (algorithm === 'iqr' || (algorithm === 'auto' && values.length < 30)) {
    result = { method: 'iqr', outliers: stats.iqrOutliers(values) }
  } else if (algorithm === 'zscore' || (algorithm === 'auto' && values.length < 100)) {
    result = { method: 'zscore', outliers: stats.zScoreOutliers(values, 3) }
  } else {
    // CUSUM for longer series
    const mean   = values.reduce((a, b) => a + b, 0) / values.length
    const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length)
    const k      = 0.5 * stdDev
    const h      = 5   * stdDev
    let cusum = 0
    const anomalies: { index: number; value: number; cusum: number }[] = []
    values.forEach((v, i) => {
      cusum = Math.max(0, cusum + v - mean - k)
      if (cusum > h) anomalies.push({ index: i, value: v, cusum })
    })
    result = { method: 'cusum', outliers: anomalies }
  }

  return c.json({ data: result })
})

// ── Forecasting ───────────────────────────────────────────────────────────────
const ForecastSchema = z.object({
  values:  z.array(z.number()).min(4),
  season:  z.number().int().min(2).max(52).default(12),
  horizon: z.number().int().min(1).max(52).default(12),
})

analyticsRoutes.post('/forecast', zValidator('json', ForecastSchema), (c) => {
  const { values, season, horizon } = c.req.valid('json')
  const result = holtWinters(values, season, horizon)
  return c.json({ data: result })
})
