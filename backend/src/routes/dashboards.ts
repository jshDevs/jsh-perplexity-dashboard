/**
 * /api/v1/dashboards — CRUD de configuraciones de dashboard.
 * Persiste en Redis con TTL de 30 días.
 * Clave: dashboard:{id}
 */
import { Hono }  from 'hono'

const TTL = 60 * 60 * 24 * 30  // 30 días

export function buildDashboardRoutes(redis: any) {
  const router = new Hono()

  // GET /api/v1/dashboards — listar todos
  router.get('/', async (c) => {
    try {
      const keys  = await redis.keys('dashboard:*')
      if (keys.length === 0) return c.json({ dashboards: [] })
      const raws  = await redis.mget(...keys)
      const dashboards = raws
        .filter(Boolean)
        .map((r: string) => JSON.parse(r))
        .sort((a: any, b: any) => (a.updatedAt > b.updatedAt ? -1 : 1))
      return c.json({ dashboards })
    } catch (err: any) {
      return c.json({ error: err.message }, 500)
    }
  })

  // GET /api/v1/dashboards/:id
  router.get('/:id', async (c) => {
    const raw = await redis.get(`dashboard:${c.req.param('id')}`)
    if (!raw) return c.json({ error: 'No encontrado' }, 404)
    return c.json(JSON.parse(raw))
  })

  // POST /api/v1/dashboards — crear
  router.post('/', async (c) => {
    const body = await c.req.json()
    if (!body.id || !body.name) return c.json({ error: 'id y name requeridos' }, 400)
    const doc  = { ...body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    await redis.setex(`dashboard:${body.id}`, TTL, JSON.stringify(doc))
    return c.json(doc, 201)
  })

  // PUT /api/v1/dashboards/:id — actualizar
  router.put('/:id', async (c) => {
    const id  = c.req.param('id')
    const raw = await redis.get(`dashboard:${id}`)
    if (!raw) return c.json({ error: 'No encontrado' }, 404)
    const prev = JSON.parse(raw)
    const body = await c.req.json()
    const doc  = { ...prev, ...body, id, updatedAt: new Date().toISOString() }
    await redis.setex(`dashboard:${id}`, TTL, JSON.stringify(doc))
    return c.json(doc)
  })

  // DELETE /api/v1/dashboards/:id
  router.delete('/:id', async (c) => {
    const id  = c.req.param('id')
    const del = await redis.del(`dashboard:${id}`)
    if (del === 0) return c.json({ error: 'No encontrado' }, 404)
    return c.json({ deleted: true })
  })

  return router
}
