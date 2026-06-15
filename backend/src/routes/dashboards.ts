/**
 * CRUD de DashboardConfig en Redis con TTL 7 días.
 *
 * GET  /api/v1/dashboards          → { ids: string[] }
 * GET  /api/v1/dashboards/:id      → DashboardConfig
 * PUT  /api/v1/dashboards/:id      → { ok: true }
 * DELETE /api/v1/dashboards/:id   → { ok: true }
 */
import { Hono } from 'hono'

const DASH_TTL = 60 * 60 * 24 * 7  // 7 días

export function buildDashboardRoutes(redis: any) {
  const router = new Hono()

  router.get('/', async (c) => {
    const keys = await redis.keys('dashboard:*')
    const ids  = keys.map((k: string) => k.replace('dashboard:', ''))
    return c.json({ ids })
  })

  router.get('/:id', async (c) => {
    const raw = await redis.get(`dashboard:${c.req.param('id')}`)
    if (!raw) return c.json({ error: 'Dashboard no encontrado' }, 404)
    return c.json(JSON.parse(raw))
  })

  router.put('/:id', async (c) => {
    const body = await c.req.json()
    if (!body?.id) return c.json({ error: 'Payload inválido' }, 400)
    await redis.set(`dashboard:${c.req.param('id')}`, JSON.stringify(body), { EX: DASH_TTL })
    return c.json({ ok: true })
  })

  router.delete('/:id', async (c) => {
    await redis.del(`dashboard:${c.req.param('id')}`)
    return c.json({ ok: true })
  })

  return router
}
