import { Hono } from 'hono'
import { redis } from '../services/redis.js'

export const schemaRoutes = new Hono()

schemaRoutes.get('/:datasetId', async (c) => {
  const { datasetId } = c.req.param()
  const raw = await redis.get(`dataset:${datasetId}:meta`)
  if (!raw) return c.json({ error: 'Dataset not found or expired (TTL 1h)' }, 404)
  return c.json({ data: JSON.parse(raw) })
})

schemaRoutes.get('/:datasetId/preview', async (c) => {
  const { datasetId } = c.req.param()
  const raw = await redis.get(`dataset:${datasetId}:rows`)
  if (!raw) return c.json({ error: 'Preview not available' }, 404)
  return c.json({ data: JSON.parse(raw) })
})

schemaRoutes.patch('/:datasetId/columns/:column', async (c) => {
  const { datasetId, column } = c.req.param()
  const { type } = await c.req.json()

  const VALID_TYPES = ['METRIC', 'DIMENSION', 'TIME', 'ID', 'TEXT']
  if (!VALID_TYPES.includes(type)) {
    return c.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, 400)
  }

  const raw = await redis.get(`dataset:${datasetId}:meta`)
  if (!raw) return c.json({ error: 'Dataset not found' }, 404)

  const meta = JSON.parse(raw)
  const field = meta.schema.fields?.find((f: { name: string }) => f.name === column)
  if (!field) return c.json({ error: `Column '${column}' not found` }, 404)

  field.role               = type.toLowerCase()
  field.manually_overridden = true

  await redis.setex(`dataset:${datasetId}:meta`, 3600, JSON.stringify(meta))
  return c.json({ data: { column, type, updated: true } })
})
