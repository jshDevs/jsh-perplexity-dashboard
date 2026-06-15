import { Hono }  from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z }    from 'zod'
// @ts-ignore — engine is ES modules JS without types
import { analyze, maskPII, buildChartData } from '../engine/index.js'
import { redis }  from '../services/redis.js'
import { createHash } from 'crypto'

export const analyzeRoutes = new Hono()

const AnalyzeSchema = z.object({
  rows:        z.array(z.record(z.unknown())).min(1).max(100_000),
  options:     z.object({
    dateRange:   z.string().optional(),
    compareMode: z.enum(['previous', 'year']).optional(),
    population:  z.unknown().optional(),
    geoHierarchy: z.unknown().optional(),
  }).optional(),
})

analyzeRoutes.post('/', zValidator('json', AnalyzeSchema), async (c) => {
  const { rows, options = {} } = c.req.valid('json')

  // Cache key based on data hash + options
  const cacheKey = `analyze:${createHash('sha256').update(JSON.stringify({ rows: rows.slice(0, 10), len: rows.length, options })).digest('hex').slice(0, 16)}`

  const cached = await redis.get(cacheKey)
  if (cached) {
    return c.json({ data: JSON.parse(cached), cached: true })
  }

  // Limit for sample inference on large datasets
  const result = analyze(rows, options)
  const safeRows = maskPII(rows, result.schema)

  const response = {
    ...result,
    rows_analyzed: rows.length,
    rows_masked:   safeRows.length !== rows.length ? rows.length : 0,
  }

  await redis.setex(cacheKey, 300, JSON.stringify(response))
  return c.json({ data: response, cached: false })
})

// Build chart data for a specific chart config
analyzeRoutes.post('/chart-data', async (c) => {
  const { rows, chart, concepts } = await c.req.json()
  try {
    const data = buildChartData(rows, chart, concepts)
    return c.json({ data })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400)
  }
})
