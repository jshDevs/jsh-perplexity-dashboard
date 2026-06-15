/**
 * hub.ts — WebSocket Hub con canales por datasetId.
 *
 * Arquitectura:
 *   - Un Map<channel, Set<WebSocket>> para subscripciones por canal.
 *   - Clientes se subscriben con { type: 'subscribe', channel: 'dataset.abc123.updated' }
 *   - El backend hace hub.broadcast(channel, payload) al recibir nuevos datos.
 *
 * Compatible con Hono + @hono/node-server ws upgrade.
 * Self-hosted, sin Pusher, sin Soketi, sin internet.
 */

import type { WebSocket } from 'ws'

export interface WsMessage {
  type:     string
  channel?: string
  payload?: unknown
}

export class WsHub {
  private channels = new Map<string, Set<WebSocket>>()
  private clientChannels = new WeakMap<WebSocket, Set<string>>()

  /** Registra una conexión nueva. Llama onMessage y onClose internamente. */
  register(ws: WebSocket) {
    this.clientChannels.set(ws, new Set())

    ws.on('message', (raw: Buffer) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString())
        if (msg.type === 'subscribe'   && msg.channel) this.subscribe(ws, msg.channel)
        if (msg.type === 'unsubscribe' && msg.channel) this.unsubscribe(ws, msg.channel)
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }))
      } catch { /* ignorar mensajes mal formados */ }
    })

    ws.on('close', () => this.cleanup(ws))
    ws.on('error', () => this.cleanup(ws))

    // Mensaje de bienvenida
    ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }))
  }

  subscribe(ws: WebSocket, channel: string) {
    if (!this.channels.has(channel)) this.channels.set(channel, new Set())
    this.channels.get(channel)!.add(ws)
    this.clientChannels.get(ws)?.add(channel)
    ws.send(JSON.stringify({ type: 'subscribed', channel }))
  }

  unsubscribe(ws: WebSocket, channel: string) {
    this.channels.get(channel)?.delete(ws)
    this.clientChannels.get(ws)?.delete(channel)
  }

  /** Envia payload a todos los clientes suscritos al canal. */
  broadcast(channel: string, payload: unknown) {
    const clients = this.channels.get(channel)
    if (!clients || clients.size === 0) return
    const msg = JSON.stringify({ type: 'update', channel, payload, ts: Date.now() })
    clients.forEach((ws) => {
      if (ws.readyState === 1 /* OPEN */) ws.send(msg)
    })
  }

  /** Cuenta clientes suscritos a un canal. */
  channelSize(channel: string): number {
    return this.channels.get(channel)?.size ?? 0
  }

  private cleanup(ws: WebSocket) {
    const channels = this.clientChannels.get(ws)
    channels?.forEach((ch) => this.channels.get(ch)?.delete(ws))
    this.clientChannels.delete(ws)
  }
}

export const wsHub = new WsHub()
