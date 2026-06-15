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

const app = new Hono()

// ── Middleware ────────────────────────────────────────────────────────────────
app.use('*', logger())
app.use('*', secureHeaders())
app.use('/api/*', cors({
  origin: ['http://localhost:3000', 'http://frontend'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}))

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/up', (c) => c.json({ status: 'ok', ts: Date.now() }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.route('/api/v1/analyze',    analyzeRoutes)
app.route('/api/v1/dashboards', dashboardRoutes)
app.route('/api/v1/ingest',     ingestRoutes)
app.route('/api/v1/schema',     schemaRoutes)
app.route('/api/v1',            analyticsRoutes)   // /api/v1/anomalies + /api/v1/forecast

// ── Serve GeoJSON maps (offline-first) ───────────────────────────────────────
import { readFile } from 'fs/promises'
import { join }     from 'path'
const MAPS_DIR = join(process.cwd(), 'maps')
app.get('/api/v1/maps/*', async (c) => {
  const subpath = c.req.path.replace('/api/v1/maps/', '')
  const safePath = subpath.replace(/\.\.\/|\.\.\\/, '')   // path traversal guard
  try {
    const geojson = await readFile(join(MAPS_DIR, safePath), 'utf8')
    return c.body(geojson, 200, { 'Content-Type': 'application/json' })
  } catch {
    return c.json({ error: 'Map not found' }, 404)
  }
})

// ── 404 ───────────────────────────────────────────────────────────────────────
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
