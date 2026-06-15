import { serve }   from '@hono/node-server'
import { Hono }    from 'hono'
import { cors }    from 'hono/cors'
import { logger }  from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { analyzeRoutes }    from './routes/analyze.js'
import { dashboardRoutes }  from './routes/dashboards.js'
import { ingestRoutes }     from './routes/ingest.js'
import { schemaRoutes }     from './routes/schema.js'
import { analyticsRoutes }  from './routes/anomaly-forecast.js'
import { authRoutes }       from './routes/auth.js'
import { authRequired }     from './middleware/auth.js'
import { ingestRateLimit }  from './middleware/rateLimit.js'

const app = new Hono()

app.use('*', logger())
app.use('*', secureHeaders())
app.use('/api/*', cors({
  origin: ['http://localhost:3000', 'http://frontend'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}))

app.get('/up', (c) => c.json({ status: 'ok', ts: Date.now() }))

app.route('/api/v1/auth', authRoutes)
app.use('/api/v1/dashboards/*', authRequired())
app.use('/api/v1/schema/*', authRequired())
app.use('/api/v1/analyze', authRequired())
app.use('/api/v1/ingest/*', authRequired(), ingestRateLimit())
app.use('/api/v1/anomalies', authRequired())
app.use('/api/v1/forecast', authRequired())

app.route('/api/v1/analyze',    analyzeRoutes)
app.route('/api/v1/dashboards', dashboardRoutes)
app.route('/api/v1/ingest',     ingestRoutes)
app.route('/api/v1/schema',     schemaRoutes)
app.route('/api/v1',            analyticsRoutes)

import { readFile } from 'fs/promises'
import { join }     from 'path'
const MAPS_DIR = join(process.cwd(), 'maps')
app.get('/api/v1/maps/*', async (c) => {
  const subpath = c.req.path.replace('/api/v1/maps/', '')
  const safePath = subpath.replace(/\.\.\/|\.\.\\/g, '')
  try {
    const geojson = await readFile(join(MAPS_DIR, safePath), 'utf8')
    return c.body(geojson, 200, { 'Content-Type': 'application/json' })
  } catch {
    return c.json({ error: 'Map not found' }, 404)
  }
})

app.notFound((c) => c.json({ error: 'Not Found' }, 404))
app.onError((err, c) => {
  console.error('[app error]', err)
  return c.json({ error: err.message }, 500)
})

const PORT = parseInt(process.env.PORT ?? '8000', 10)
if (process.env.NODE_ENV !== 'test') {
  console.log(`[jsh-dashboard] Hono API listening on :${PORT}`)
  serve({ fetch: app.fetch, port: PORT })
}

export default app
