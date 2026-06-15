/**
 * wsRoute.ts — ruta WebSocket en Hono: GET /ws
 *
 * Uso desde el cliente React:
 *   const ws = new WebSocket('ws://dashboard.lan/ws')
 *   ws.send(JSON.stringify({ type: 'subscribe', channel: 'dataset.updated' }))
 *   ws.onmessage = (e) => handleMessage(JSON.parse(e.data))
 */
import { Hono }    from 'hono'
import { nanoid }  from 'nanoid'
import { wsServer } from './wsServer'

export function buildWsRoute() {
  const router = new Hono()

  router.get('/ws', async (c) => {
    // Hono + @hono/node-server expone c.env.upgrade para WS
    const upgrade = c.env?.upgrade
    if (!upgrade) {
      return c.text('WebSocket upgrade required', 426)
    }

    const clientId = nanoid(12)

    upgrade({
      onOpen(ws: any) {
        wsServer.addClient(clientId, ws)
      },
      onMessage(_ws: any, data: string) {
        wsServer.handleMessage(clientId, typeof data === 'string' ? data : data.toString())
      },
      onClose() {
        wsServer.removeClient(clientId)
      },
      onError() {
        wsServer.removeClient(clientId)
      },
    })

    return new Response(null, { status: 101 })
  })

  return router
}
