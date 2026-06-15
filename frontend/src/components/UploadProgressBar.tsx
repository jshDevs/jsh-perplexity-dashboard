/**
 * UploadProgressBar — barra de progreso animada para el ciclo
 * upload → parsing → done / error.
 */
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { UploadState } from '@/hooks/useUpload'

interface Props { state: UploadState }

export default function UploadProgressBar({ state }: Props) {
  if (state.stage === 'idle') return null

  const pct =
    state.stage === 'uploading' ? state.progress :
    state.stage === 'parsing'   ? 100 :
    state.stage === 'done'      ? 100 : 0

  const color =
    state.stage === 'error' ? 'bg-red-500'    :
    state.stage === 'done'  ? 'bg-emerald-500' : 'bg-indigo-500'

  const label =
    state.stage === 'uploading' ? `Subiendo… ${state.progress}%` :
    state.stage === 'parsing'   ? 'Analizando schema…' :
    state.stage === 'done'      ? `Listo · ${state.meta.rowCount.toLocaleString()} filas` :
    state.message

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-sm">
        {state.stage === 'uploading' || state.stage === 'parsing' ? (
          <Loader2 size={14} className="animate-spin text-indigo-400" />
        ) : state.stage === 'done' ? (
          <CheckCircle size={14} className="text-emerald-400" />
        ) : (
          <XCircle size={14} className="text-red-400" />
        )}
        <span className={state.stage === 'error' ? 'text-red-400' : 'text-slate-300'}>
          {label}
        </span>
      </div>

      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
