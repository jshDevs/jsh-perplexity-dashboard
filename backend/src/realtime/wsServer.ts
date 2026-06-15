/**
 * wsServer.ts — WebSocket relay server (Hono + @hono/node-server/ws)
 *
 * Canales soportados:
 *   dataset.updated   → push cuando ingest completa un dataset
 *   dashboard.saved   → push cuando /api/v1/dashboards/:id es guardado
 *   ping              → keepalive heartbeat
 *
 * Cada mensaje tiene la forma:
 *   { channel: string, event: string, data: unknown, ts: number }
 *
 * Los clientes se suscriben enviando:
 *   { type: 'subscribe', channel: 'dataset.updated' }
 *   { type: 'subscribe', channel: 'dashboard.saved' }
 *
 * Broadcast:
 *   wsServer.broadcast(channel, event, data)
 */

export interface WsMessage {
  channel: string
  event:   string
  data:    unknown
  ts:      number
}

interface WsClient {
  id:           string
  ws:           any
  subscriptions: Set<string>
  lastPing:     number
}

class WsServer {
  private clients = new Map<string, WsClient>()
  private hbInterval: ReturnType<typeof setInterval> | null = null

  /** Registra un nuevo cliente al conectarse */
  addClient(id: string, ws: any) {
    this.clients.set(id, {
      id, ws,
      subscriptions: new Set(),
      lastPing: Date.now(),
    })
    // Heartbeat al conectar
    this.safeSend(ws, { channel: '_system', event: 'connected', data: { clientId: id }, ts: Date.now() })
  }

  removeClient(id: string) {
    this.clients.delete(id)
  }

  /** Procesa mensajes entrantes del cliente */
  handleMessage(id: string, raw: string) {
    try {
      const msg = JSON.parse(raw)
      const client = this.clients.get(id)
      if (!client) return

      if (msg.type === 'subscribe' && msg.channel) {
        client.subscriptions.add(msg.channel)
        this.safeSend(client.ws, {
          channel: '_system',
          event:   'subscribed',
          data:    { channel: msg.channel },
          ts:      Date.now(),
        })
      }

      if (msg.type === 'unsubscribe' && msg.channel) {
        client.subscriptions.delete(msg.channel)
      }

      if (msg.type === 'ping') {
        client.lastPing = Date.now()
        this.safeSend(client.ws, { channel: '_system', event: 'pong', data: null, ts: Date.now() })
      }
    } catch { /* JSON inválido — ignorar */ }
  }

  /** Broadcast a todos los clientes suscritos al canal */
  broadcast(channel: string, event: string, data: unknown) {
    const msg: WsMessage = { channel, event, data, ts: Date.now() }
    for (const client of this.clients.values()) {
      if (client.subscriptions.has(channel)) {
        this.safeSend(client.ws, msg)
      }
    }
  }

  private safeSend(ws: any, data: unknown) {
    try {
      if (ws.readyState === 1 /* OPEN */) {
        ws.send(JSON.stringify(data))
      }
    } catch { /* cliente desconectado */ }
  }

  /** Heartbeat global cada 25s — limpia clientes muertos */
  startHeartbeat(intervalMs = 25_000) {
    if (this.hbInterval) return
    this.hbInterval = setInterval(() => {
      const now = Date.now()
      for (const [id, client] of this.clients.entries()) {
        if (now - client.lastPing > 60_000) {
          // Cliente sin ping en 60s → desconectar
          try { client.ws.close() } catch {}
          this.clients.delete(id)
        } else {
          this.safeSend(client.ws, { channel: '_system', event: 'ping', data: null, ts: now })
        }
      }
    }, intervalMs)
  }

  get clientCount() { return this.clients.size }
}

/** Singleton global — importar en rutas y pipeline de ingest */
export const wsServer = new WsServer()
