/**
 * Tests para WsServer (backend) — simulación con mock de WebSocket.
 * Se ejecuta en Vitest (Node, no browser).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WsServer } from '../../../backend/src/realtime/wsServer'

// Re-exportar la clase para poder instanciar en tests
// (wsServer.ts exporta tanto la clase como el singleton)
// En tests instanciamos directamente para aislamiento

function makeMockWs() {
  const sent: string[] = []
  return {
    readyState: 1,
    send: (data: string) => { sent.push(data) },
    close: vi.fn(),
    _sent: sent,
  }
}

// Nota: necesitamos exportar WsServer como named export además del singleton
// Se añade al final de wsServer.ts: export { WsServer }
describe('WsServer', () => {
  let server: InstanceType<typeof WsServer>
  beforeEach(() => { server = new (WsServer as any)() })

  it('addClient envía mensaje connected', () => {
    const ws = makeMockWs()
    server.addClient('c1', ws)
    expect(ws._sent).toHaveLength(1)
    const msg = JSON.parse(ws._sent[0])
    expect(msg.event).toBe('connected')
    expect(msg.data.clientId).toBe('c1')
  })

  it('removeClient elimina el cliente', () => {
    const ws = makeMockWs()
    server.addClient('c1', ws)
    server.removeClient('c1')
    expect(server.clientCount).toBe(0)
  })

  it('subscribe registra suscripción y confirma', () => {
    const ws = makeMockWs()
    server.addClient('c2', ws)
    server.handleMessage('c2', JSON.stringify({ type: 'subscribe', channel: 'dataset.updated' }))
    const subscribeConfirm = ws._sent.map((s: string) => JSON.parse(s)).find((m: any) => m.event === 'subscribed')
    expect(subscribeConfirm?.data?.channel).toBe('dataset.updated')
  })

  it('broadcast solo llega a clientes suscritos', () => {
    const ws1 = makeMockWs()
    const ws2 = makeMockWs()
    server.addClient('c3', ws1)
    server.addClient('c4', ws2)
    server.handleMessage('c3', JSON.stringify({ type: 'subscribe', channel: 'dataset.updated' }))
    // c4 NO suscrito
    server.broadcast('dataset.updated', 'rows_appended', { rows: [] })
    const c3Msgs = ws1._sent.map((s: string) => JSON.parse(s)).filter((m: any) => m.channel === 'dataset.updated')
    const c4Msgs = ws2._sent.map((s: string) => JSON.parse(s)).filter((m: any) => m.channel === 'dataset.updated')
    expect(c3Msgs).toHaveLength(1)
    expect(c4Msgs).toHaveLength(0)
  })

  it('ping responde con pong', () => {
    const ws = makeMockWs()
    server.addClient('c5', ws)
    server.handleMessage('c5', JSON.stringify({ type: 'ping' }))
    const pong = ws._sent.map((s: string) => JSON.parse(s)).find((m: any) => m.event === 'pong')
    expect(pong).toBeDefined()
  })

  it('JSON inválido no lanza error', () => {
    const ws = makeMockWs()
    server.addClient('c6', ws)
    expect(() => server.handleMessage('c6', 'invalid-json')).not.toThrow()
  })

  it('unsubscribe elimina canal', () => {
    const ws = makeMockWs()
    server.addClient('c7', ws)
    server.handleMessage('c7', JSON.stringify({ type: 'subscribe',   channel: 'dataset.updated' }))
    server.handleMessage('c7', JSON.stringify({ type: 'unsubscribe', channel: 'dataset.updated' }))
    // Broadcast ya no debe llegar
    server.broadcast('dataset.updated', 'test', {})
    const hits = ws._sent.map((s: string) => JSON.parse(s)).filter((m: any) => m.channel === 'dataset.updated')
    expect(hits).toHaveLength(0)
  })
})
