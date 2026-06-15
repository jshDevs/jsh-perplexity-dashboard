/**
 * POST /api/v1/datasets/:id/push
 * Acepta nuevas filas (rows[]) para un dataset existente,
 * las append a Redis y hace broadcast vía WebSocket hub.
 *
 * Canal de broadcast: dataset.{id}.updated
 */
import { Hono }   from 'hono'
import { wsHub }  from '../ws/hub'

export function buildPushRoutes(redis: any) {
  const router = new Hono()

  router.post('/:id/push', async (c) => {
    const id   = c.req.param('id')
    const body = await c.req.json() as { rows: Record<string, unknown>[] }

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return c.json({ error: 'rows[] requerido y no vacío' }, 400)
    }

    const raw = await redis.get(`dataset:${id}`)
    if (!raw) return c.json({ error: 'Dataset no encontrado' }, 404)

    const dataset   = JSON.parse(raw)
    dataset.rows    = [...dataset.rows, ...body.rows]
    dataset.rowCount = dataset.rows.length
    dataset.updatedAt = new Date().toISOString()

    await redis.setex(`dataset:${id}`, dataset.ttl ?? 86400, JSON.stringify(dataset))

    // Broadcast a todos los clientes suscritos
    const channel = `dataset.${id}.updated`
    wsHub.broadcast(channel, {
      datasetId: id,
      newRows:   body.rows,
      rowCount:  dataset.rowCount,
    })

    return c.json({
      ok:       true,
      rowCount: dataset.rowCount,
      channel,
      subscribers: wsHub.channelSize(channel),
    })
  })

  return router
}
