/**
 * DatasetLiveIndicator — indicador visual de conexión WebSocket.
 * Punto verde pulsante cuando connected=true, gris cuando disconnected.
 */
import { useRealtimeDataset } from '@/hooks/useRealtimeDataset'

interface Props {
  datasetId: string
  onNewRows?: (rows: Record<string, unknown>[]) => void
}

export default function DatasetLiveIndicator({ datasetId, onNewRows }: Props) {
  const { connected, rowCount, lastUpdate } = useRealtimeDataset(datasetId, onNewRows)

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className="relative flex h-2.5 w-2.5">
        {connected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            connected ? 'bg-green-500' : 'bg-slate-600'
          }`}
        />
      </span>
      <span>{connected ? 'En vivo' : 'Desconectado'}</span>
      {rowCount !== null && (
        <span className="text-slate-500">{rowCount.toLocaleString()} filas</span>
      )}
      {lastUpdate && (
        <span className="text-slate-600">
          · {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
