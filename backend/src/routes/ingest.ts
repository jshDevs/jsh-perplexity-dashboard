import { Hono }     from 'hono'
import { join }     from 'path'
import { mkdir, writeFile, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import { SecurityValidator } from '../services/security.js'
import { duckdb }   from '../services/duckdb.js'
import { redis }    from '../services/redis.js'
// @ts-ignore
import { inferSchema } from '../engine/schemaInference.js'
// @ts-ignore
import { recommendCharts } from '../engine/chartRecommender.js'
// @ts-ignore
import { detectConcepts } from '../engine/policeDomain.js'
import * as Papa    from 'papaparse'
import * as XLSX    from 'xlsx'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), 'storage/uploads')
const MAX_SIZE   = 52_428_800 // 50 MB

export const ingestRoutes = new Hono()

ingestRoutes.post('/file', async (c) => {
  const formData   = await c.req.formData()
  const file       = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)
  if (file.size > MAX_SIZE) return c.json({ error: 'File exceeds 50 MB limit' }, 413)

  const buffer = Buffer.from(await file.arrayBuffer())

  // ── Security validation ─────────────────────────────────────────────────────
  const security = new SecurityValidator()
  const secResult = await security.validate(buffer, file.name, file.type)
  if (!secResult.valid) return c.json({ error: secResult.reason }, 422)

  // ── Parse rows ──────────────────────────────────────────────────────────────
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? ''
  let rows: Record<string, unknown>[] = []

  if (ext === 'csv') {
    const text   = buffer.toString('utf8')
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true, skipEmptyLines: true, dynamicTyping: true,
    })
    rows = result.data
  } else if (ext === 'xlsx' || ext === 'xls') {
    const wb    = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })
  } else if (ext === 'json') {
    const parsed = JSON.parse(buffer.toString('utf8'))
    rows = Array.isArray(parsed) ? parsed : [parsed]
  } else if (ext === 'parquet') {
    // Save temp file and query with DuckDB
    const tmpPath = join(UPLOAD_DIR, `${randomUUID()}.parquet`)
    await mkdir(UPLOAD_DIR, { recursive: true })
    await writeFile(tmpPath, buffer)
    rows = await duckdb.query(`SELECT * FROM '${tmpPath}' LIMIT 5000`)
    await unlink(tmpPath)
  } else {
    return c.json({ error: `Unsupported file type: .${ext}` }, 415)
  }

  if (!rows.length) return c.json({ error: 'File parsed but contains no rows' }, 422)

  // ── Schema inference using engine ──────────────────────────────────────────
  const schema    = inferSchema(rows)
  const concepts  = detectConcepts(schema)
  const charts    = recommendCharts(rows, schema, concepts)

  const datasetId = randomUUID()
  const meta      = { schema, charts: charts.slice(0, 8), row_count: rows.length, concepts }
  await redis.setex(`dataset:${datasetId}:meta`, 3600, JSON.stringify(meta))

  // Store sample rows for preview (max 500)
  await redis.setex(
    `dataset:${datasetId}:rows`,
    3600,
    JSON.stringify(rows.slice(0, 500))
  )

  return c.json({
    data: {
      dataset_id:  datasetId,
      schema,
      chart_hint:  charts[0] ?? null,
      row_count:   rows.length,
      preview_url: `/api/v1/schema/${datasetId}/preview`,
    }
  }, 201)
})

// Inline JSON analysis
ingestRoutes.post('/json', async (c) => {
  const { payload } = await c.req.json()
  const rows: Record<string, unknown>[] = Array.isArray(payload) ? payload : [payload]
  if (!rows.length) return c.json({ error: 'Empty payload' }, 400)

  const schema   = inferSchema(rows)
  const datasetId = randomUUID()
  await redis.setex(`dataset:${datasetId}:meta`, 3600, JSON.stringify({ schema, row_count: rows.length }))

  return c.json({ data: { dataset_id: datasetId, schema } }, 201)
})
