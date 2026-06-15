import { Hono } from 'hono'
import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { join }  from 'path'
import * as yaml from 'yaml'
import { duckdb } from '../services/duckdb.js'
import { redis }  from '../services/redis.js'

const DASHBOARDS_DIR = process.env.DASHBOARDS_DIR ?? join(process.cwd(), 'dashboards')

export const dashboardRoutes = new Hono()

// ── List dashboards ───────────────────────────────────────────────────────────
dashboardRoutes.get('/', async (c) => {
  try {
    const files = (await readdir(DASHBOARDS_DIR)).filter((f) => f.endsWith('.yaml'))
    const list = await Promise.all(files.map(async (f) => {
      const raw    = await readFile(join(DASHBOARDS_DIR, f), 'utf8')
      const config = yaml.parse(raw) as Record<string, unknown>
      return {
        slug:        (f.replace('.yaml', '')),
        title:       config.title ?? f,
        description: config.description ?? null,
        updated_at:  new Date().toISOString(),
      }
    }))
    return c.json({ data: list })
  } catch {
    return c.json({ data: [] })
  }
})

// ── Get dashboard config ──────────────────────────────────────────────────────
dashboardRoutes.get('/:slug', async (c) => {
  const { slug } = c.req.param()
  const filePath = join(DASHBOARDS_DIR, `${slug}.yaml`)
  try {
    const raw    = await readFile(filePath, 'utf8')
    const config = yaml.parse(raw)
    return c.json({ data: config })
  } catch {
    return c.json({ error: 'Dashboard not found' }, 404)
  }
})

// ── Query dashboard data (DuckDB) ─────────────────────────────────────────────
dashboardRoutes.post('/:slug/query', async (c) => {
  const { slug }     = c.req.param()
  const { filters = [], params = {} } = await c.req.json()

  const cacheKey = `query:${slug}:${JSON.stringify({ filters, params })}`
  const cached   = await redis.get(cacheKey)
  if (cached) return c.json({ data: JSON.parse(cached), cached: true })

  try {
    const filePath = join(DASHBOARDS_DIR, `${slug}.yaml`)
    const raw      = await readFile(filePath, 'utf8')
    const config   = yaml.parse(raw) as Record<string, unknown>

    const ds = config.datasource as Record<string, unknown>
    let sql  = ds.query as string ?? `SELECT * FROM read_csv_auto('${ds.path}')`

    // Param substitution (safe — only named params)
    for (const [key, val] of Object.entries(params)) {
      sql = sql.replace(new RegExp(`{{${key}}}`, 'g'), String(val).replace(/'/g, ''))
    }

    // Apply filters
    if (filters.length) {
      const where = (filters as Array<{ field: string; operator: string; value: unknown }>)
        .map((f) => `"${f.field.replace(/"/g, '')}" ${f.operator} '${String(f.value).replace(/'/g, '')}'`)
        .join(' AND ')
      sql = `SELECT * FROM (${sql}) __q WHERE ${where}`
    }

    const rows = await duckdb.query(sql)
    await redis.setex(cacheKey, 120, JSON.stringify(rows))
    return c.json({ data: rows, count: rows.length, meta: {} })
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500)
  }
})

// ── Create/save dashboard YAML ────────────────────────────────────────────────
dashboardRoutes.post('/', async (c) => {
  const body = await c.req.json()
  const slug = String(body.slug ?? body.title ?? Date.now())
    .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
  await mkdir(DASHBOARDS_DIR, { recursive: true })
  await writeFile(join(DASHBOARDS_DIR, `${slug}.yaml`), yaml.stringify({ ...body, slug }))
  return c.json({ data: { slug }, created: true }, 201)
})
