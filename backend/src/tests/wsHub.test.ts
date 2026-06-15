/**
 * Tests del WsHub — simulamos WebSocket con un mock mínimo.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WsHub } from '../ws/hub'

function mockWs() {
  const sent: string[] = []
  return {
    readyState: 1,
    send:       (msg: string) => sent.push(msg),
    on:         vi.fn(),
    _sent:      sent,
  } as any
}

let hub: WsHub
beforeEach(() => { hub = new WsHub() })

describe('WsHub — subscribe / broadcast', () => {
  it('subscribe envía mensaje subscribed', () => {
    const ws = mockWs()
    hub.subscribe(ws, 'dataset.abc.updated')
    const msgs = ws._sent.map((s: string) => JSON.parse(s))
    expect(msgs.some((m: any) => m.type === 'subscribed')).toBe(true)
  })

  it('broadcast envía a suscritos', () => {
    const ws1 = mockWs()
    const ws2 = mockWs()
    hub.subscribe(ws1, 'dataset.x.updated')
    hub.subscribe(ws2, 'dataset.x.updated')
    hub.broadcast('dataset.x.updated', { rowCount: 10 })
    const last1 = JSON.parse(ws1._sent[ws1._sent.length - 1])
    expect(last1.type).toBe('update')
    expect(last1.payload.rowCount).toBe(10)
  })

  it('broadcast no envía a canal distinto', () => {
    const ws = mockWs()
    hub.subscribe(ws, 'dataset.A.updated')
    hub.broadcast('dataset.B.updated', { test: 1 })
    const types = ws._sent.map((s: string) => JSON.parse(s).type)
    expect(types).not.toContain('update')
  })

  it('channelSize devuelve número correcto', () => {
    const ws1 = mockWs()
    const ws2 = mockWs()
    hub.subscribe(ws1, 'ch1')
    hub.subscribe(ws2, 'ch1')
    expect(hub.channelSize('ch1')).toBe(2)
  })

  it('unsubscribe deja de recibir broadcasts', () => {
    const ws = mockWs()
    hub.subscribe(ws, 'ch1')
    hub.unsubscribe(ws, 'ch1')
    const before = ws._sent.length
    hub.broadcast('ch1', { x: 1 })
    expect(ws._sent.length).toBe(before)  // no recibió nada nuevo
  })

  it('ping responde pong', () => {
    const ws = mockWs()
    let msgHandler: any
    ws.on = (_event: string, handler: any) => { msgHandler = handler }
    hub.register(ws)
    const pingBuf = Buffer.from(JSON.stringify({ type: 'ping' }))
    msgHandler(pingBuf)
    const types = ws._sent.map((s: string) => JSON.parse(s).type)
    expect(types).toContain('pong')
  })

  it('register envía mensaje connected', () => {
    const ws = mockWs()
    ws.on = vi.fn()
    hub.register(ws)
    const msgs = ws._sent.map((s: string) => JSON.parse(s))
    expect(msgs.some((m: any) => m.type === 'connected')).toBe(true)
  })

  it('broadcast a canal sin suscriptores no lanza error', () => {
    expect(() => hub.broadcast('canal-vacío', { test: 1 })).not.toThrow()
  })

  it('channelSize canal inexistente devuelve 0', () => {
    expect(hub.channelSize('inexistente')).toBe(0)
  })

  it('mensajes mal formados no lanzan excepción', () => {
    const ws = mockWs()
    let msgHandler: any
    ws.on = (_: string, h: any) => { msgHandler = h }
    hub.register(ws)
    expect(() => msgHandler(Buffer.from('not json {{{}'))).not.toThrow()
  })
})
