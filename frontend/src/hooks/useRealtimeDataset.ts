/**
 * useRealtimeDataset — hook que mantiene rows de un dataset sincronizados
 * con el servidor via WebSocket.
 *
 * Comportamiento:
 *   1. Conecta a ws(s)://<host>/ws
 *   2. Suscribe al canal 'dataset.updated'
 *   3. Cuando llega un evento con datasetId coincidente,
 *      hace merge de los nuevos rows (append + dedup por _id si existe)
 *   4. Re-conecta automáticamente con backoff exponencial (máx 30s)
 *
 * Expone:
 *   rows        — rows actuales (merged)
 *   status      — 'connecting' | 'live' | 'reconnecting' | 'offline'
 *   connectedAt — timestamp de última conexión exitosa
 */
import { useEffect, useRef, useState, useCallback } from 'react'

export type WsStatus = 'connecting' | 'live' | 'reconnecting' | 'offline'

interface DatasetUpdatedPayload {
  datasetId: string
  rows:      Record<string, unknown>[]
  mode:      'append' | 'replace'
}

interface UseRealtimeDatasetOptions {
  datasetId:   string | null
  initialRows: Record<string, unknown>[]
  wsUrl?:      string
  dedupKey?:   string   // campo usado para dedup (default '_id')
}

export function useRealtimeDataset({
  datasetId,
  initialRows,
  wsUrl,
  dedupKey = '_id',
}: UseRealtimeDatasetOptions) {
  const [rows,   setRows]   = useState<Record<string, unknown>[]>(initialRows)
  const [status, setStatus] = useState<WsStatus>('connecting')
  const [connectedAt, setConnectedAt] = useState<number | null>(null)

  const wsRef      = useRef<WebSocket | null>(null)
  const retryRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCount = useRef(0)
  const mountedRef = useRef(true)

  // Sync initialRows when they change externally
  useEffect(() => { setRows(initialRows) }, [initialRows])

  const getWsUrl = useCallback(() => {
    if (wsUrl) return wsUrl
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }, [wsUrl])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (!datasetId) { setStatus('offline'); return }

    setStatus(retryCount.current === 0 ? 'connecting' : 'reconnecting')

    const ws = new WebSocket(getWsUrl())
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      retryCount.current = 0
      setStatus('live')
      setConnectedAt(Date.now())
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'dataset.updated' }))
      // Ping cada 20s
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        } else {
          clearInterval(pingInterval)
        }
      }, 20_000)
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.channel !== 'dataset.updated') return
        const payload = msg.data as DatasetUpdatedPayload
        if (payload.datasetId !== datasetId) return

        setRows((prev) => {
          if (payload.mode === 'replace') return payload.rows
          // Append + dedup
          const existingKeys = new Set(prev.map((r) => r[dedupKey]))
          const fresh = payload.rows.filter(
            (r) => !existingKeys.has(r[dedupKey])
          )
          return [...prev, ...fresh]
        })
      } catch { /* JSON malformado */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setStatus('reconnecting')
      const delay = Math.min(1000 * 2 ** retryCount.current, 30_000)
      retryCount.current += 1
      retryRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [datasetId, getWsUrl, dedupKey])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (retryRef.current) clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const disconnect = useCallback(() => {
    mountedRef.current = false
    if (retryRef.current) clearTimeout(retryRef.current)
    wsRef.current?.close()
    setStatus('offline')
  }, [])

  return { rows, status, connectedAt, disconnect }
}
