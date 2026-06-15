/**
 * useRealtimeDataset — hook que abre un WebSocket al hub
 * y subscribe al canal dataset.{id}.updated.
 *
 * Cuando llegan nuevas filas, las append al store local del dataset.
 *
 * Uso:
 *   const { connected, rowCount } = useRealtimeDataset('abc123')
 */
import { useEffect, useRef, useState } from 'react'

const WS_URL = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:3000/ws'

interface RealtimePayload {
  datasetId: string
  newRows:   Record<string, unknown>[]
  rowCount:  number
}

interface UseRealtimeResult {
  connected:  boolean
  rowCount:   number | null
  lastUpdate: Date | null
}

export function useRealtimeDataset(
  datasetId:   string,
  onNewRows?:  (rows: Record<string, unknown>[]) => void,
): UseRealtimeResult {
  const ws          = useRef<WebSocket | null>(null)
  const [connected, setConnected]   = useState(false)
  const [rowCount,  setRowCount]    = useState<number | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    if (!datasetId) return
    const channel = `dataset.${datasetId}.updated`
    const socket  = new WebSocket(WS_URL)
    ws.current    = socket

    socket.onopen = () => {
      setConnected(true)
      socket.send(JSON.stringify({ type: 'subscribe', channel }))
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'update' && msg.channel === channel) {
          const payload = msg.payload as RealtimePayload
          setRowCount(payload.rowCount)
          setLastUpdate(new Date(msg.ts))
          onNewRows?.(payload.newRows)
        }
      } catch { /* ignorar */ }
    }

    socket.onclose = () => setConnected(false)
    socket.onerror = () => setConnected(false)

    return () => {
      socket.send(JSON.stringify({ type: 'unsubscribe', channel }))
      socket.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId])

  return { connected, rowCount, lastUpdate }
}
