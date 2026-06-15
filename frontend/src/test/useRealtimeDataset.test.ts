/**
 * Tests para useRealtimeDataset — mocking de WebSocket global.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRealtimeDataset } from '@/hooks/useRealtimeDataset'

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []
  readyState = 0  // CONNECTING
  onopen:    ((e: any) => void) | null = null
  onmessage: ((e: any) => void) | null = null
  onclose:   ((e: any) => void) | null = null
  onerror:   ((e: any) => void) | null = null
  sent: string[] = []

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  send(data: string) { this.sent.push(data) }
  close() { this.readyState = 3 }

  simulateOpen()   { this.readyState = 1; this.onopen?.({}) }
  simulateMessage(data: unknown) { this.onmessage?.({ data: JSON.stringify(data) }) }
  simulateClose()  { this.onclose?.({}) }
}

beforeEach(() => {
  MockWebSocket.instances = []
  vi.stubGlobal('WebSocket', MockWebSocket)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const initialRows = [{ _id: '1', value: 10 }, { _id: '2', value: 20 }]

describe('useRealtimeDataset', () => {
  it('inicia con status connecting', () => {
    const { result } = renderHook(() =>
      useRealtimeDataset({ datasetId: 'ds1', initialRows: [], wsUrl: 'ws://localhost/ws' })
    )
    expect(result.current.status).toBe('connecting')
  })

  it('status live cuando WS abre', () => {
    const { result } = renderHook(() =>
      useRealtimeDataset({ datasetId: 'ds1', initialRows: [], wsUrl: 'ws://localhost/ws' })
    )
    act(() => { MockWebSocket.instances[0]?.simulateOpen() })
    expect(result.current.status).toBe('live')
  })

  it('suscribe al canal dataset.updated al conectar', () => {
    renderHook(() =>
      useRealtimeDataset({ datasetId: 'ds1', initialRows: [], wsUrl: 'ws://localhost/ws' })
    )
    act(() => { MockWebSocket.instances[0]?.simulateOpen() })
    const msgs = MockWebSocket.instances[0]?.sent.map((s) => JSON.parse(s))
    expect(msgs?.some((m: any) => m.type === 'subscribe' && m.channel === 'dataset.updated')).toBe(true)
  })

  it('append rows del mismo datasetId', () => {
    const { result } = renderHook(() =>
      useRealtimeDataset({ datasetId: 'ds1', initialRows, wsUrl: 'ws://localhost/ws' })
    )
    act(() => { MockWebSocket.instances[0]?.simulateOpen() })
    act(() => {
      MockWebSocket.instances[0]?.simulateMessage({
        channel: 'dataset.updated',
        event:   'rows_appended',
        data:    { datasetId: 'ds1', rows: [{ _id: '3', value: 30 }], mode: 'append' },
        ts:      Date.now(),
      })
    })
    expect(result.current.rows).toHaveLength(3)
    expect(result.current.rows[2]._id).toBe('3')
  })

  it('dedup: no duplica rows con mismo _id', () => {
    const { result } = renderHook(() =>
      useRealtimeDataset({ datasetId: 'ds1', initialRows, wsUrl: 'ws://localhost/ws' })
    )
    act(() => { MockWebSocket.instances[0]?.simulateOpen() })
    act(() => {
      MockWebSocket.instances[0]?.simulateMessage({
        channel: 'dataset.updated',
        event:   'rows_appended',
        data:    { datasetId: 'ds1', rows: [{ _id: '1', value: 99 }], mode: 'append' },  // dup
        ts:      Date.now(),
      })
    })
    expect(result.current.rows).toHaveLength(2)  // no aumentó
  })

  it('replace: reemplaza rows completamente', () => {
    const { result } = renderHook(() =>
      useRealtimeDataset({ datasetId: 'ds1', initialRows, wsUrl: 'ws://localhost/ws' })
    )
    act(() => { MockWebSocket.instances[0]?.simulateOpen() })
    act(() => {
      MockWebSocket.instances[0]?.simulateMessage({
        channel: 'dataset.updated',
        event:   'rows_replaced',
        data:    { datasetId: 'ds1', rows: [{ _id: '99', value: 1 }], mode: 'replace' },
        ts:      Date.now(),
      })
    })
    expect(result.current.rows).toHaveLength(1)
    expect(result.current.rows[0]._id).toBe('99')
  })

  it('ignora eventos de otro datasetId', () => {
    const { result } = renderHook(() =>
      useRealtimeDataset({ datasetId: 'ds1', initialRows, wsUrl: 'ws://localhost/ws' })
    )
    act(() => { MockWebSocket.instances[0]?.simulateOpen() })
    act(() => {
      MockWebSocket.instances[0]?.simulateMessage({
        channel: 'dataset.updated',
        event:   'rows_appended',
        data:    { datasetId: 'OTRO', rows: [{ _id: '99', value: 1 }], mode: 'append' },
        ts:      Date.now(),
      })
    })
    expect(result.current.rows).toHaveLength(2)  // sin cambio
  })

  it('status offline si datasetId es null', () => {
    const { result } = renderHook(() =>
      useRealtimeDataset({ datasetId: null, initialRows: [], wsUrl: 'ws://localhost/ws' })
    )
    expect(result.current.status).toBe('offline')
  })
})
