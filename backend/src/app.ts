import { serve }   from '@hono/node-server'
import { Hono }    from 'hono'
import { cors }    from 'hono/cors'
import { logger }  from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { analyzeRoutes }    from './routes/analyze.js'
import { dashboardRoutes }  from './routes/dashboards.js'
import { ingestRoutes }     from './routes/ingest.js'
import { schemaRoutes }     from './routes/schema.js'

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

// ── 404 ───────────────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not Found' }, 404))
app.onError((err, c) => {
  console.error('[app error]', err)
  return c.json({ error: err.message }, 500)
})

const PORT = parseInt(process.env.PORT ?? '8000', 10)
console.log(`[jsh-dashboard] Hono API listening on :${PORT}`)
serve({ fetch: app.fetch, port: PORT })

export default app
