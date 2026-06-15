/**
 * RealtimeBadge — indicador visual del estado WebSocket.
 *
 * live         → punto verde animado + 'En vivo'
 * connecting   → punto amarillo pulsando + 'Conectando…'
 * reconnecting → punto naranja pulsando + 'Reconectando…'
 * offline      → punto rojo estático + 'Sin conexión'
 */
import type { WsStatus } from '@/hooks/useRealtimeDataset'

interface Props {
  status:      WsStatus
  connectedAt: number | null
  rowCount?:   number
}

const CONFIG: Record<WsStatus, { dot: string; label: string; pulse: boolean }> = {
  live:         { dot: 'bg-emerald-400', label: 'En vivo',       pulse: true  },
  connecting:   { dot: 'bg-yellow-400',  label: 'Conectando…',   pulse: true  },
  reconnecting: { dot: 'bg-orange-400',  label: 'Reconectando…', pulse: true  },
  offline:      { dot: 'bg-red-500',     label: 'Sin conexión',  pulse: false },
}

export default function RealtimeBadge({ status, connectedAt, rowCount }: Props) {
  const { dot, label, pulse } = CONFIG[status]

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
      {/* Indicador */}
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dot}`} />
      </span>

      <span>{label}</span>

      {/* Filas en vivo */}
      {status === 'live' && rowCount !== undefined && (
        <span className="text-slate-500">{rowCount.toLocaleString()} filas</span>
      )}

      {/* Tiempo conectado */}
      {status === 'live' && connectedAt && (
        <span className="text-slate-600 text-[10px]">
          {new Date(connectedAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
