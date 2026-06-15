/**
 * AddChartPanel — panel lateral para agregar charts al dashboard.
 * Muestra las recomendaciones del motor de inferencia para el
 * dataset activo y permite seleccionarlas al layout.
 */
import { useState }          from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { useDashboardStore } from '@/store/dashboardStore'
import type { RecommendedChart } from '@/inference/chartSelector'

const CHART_ICONS: Record<string, string> = {
  bar: '📊', line: '📈', area: '🏔', pie: '🥧', donut: '🍩',
  scatter: '🔮', heatmap: '🏨', radar: '📡', candlestick: '📉',
  waffle: '🧇', violin: '🎻', scatter3d: '📊',
}

interface Props {
  dashId:          string
  datasetId:       string
  recommendations: RecommendedChart[]
  onClose:         () => void
}

export default function AddChartPanel({ dashId, datasetId, recommendations, onClose }: Props) {
  const addItem = useDashboardStore((s) => s.addItem)
  const [added, setAdded] = useState<Set<string>>(new Set())

  const handleAdd = (rec: RecommendedChart) => {
    addItem(dashId, {
      chartId:   rec.type,
      title:     rec.title ?? rec.type,
      datasetId,
      chart:     rec,
      pinned:    false,
      size:      'md',
    })
    setAdded((prev) => new Set([...prev, rec.type]))
  }

  return (
    <div className="w-72 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-sm font-semibold text-white">Agregar gráfica</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-fast">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {recommendations.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">
            No hay recomendaciones disponibles.
            <br />Sube un dataset primero.
          </p>
        )}

        {recommendations.map((rec) => (
          <button
            key={rec.type}
            onClick={() => handleAdd(rec)}
            disabled={added.has(rec.type)}
            className={[
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-fast w-full',
              added.has(rec.type)
                ? 'bg-emerald-900/30 border border-emerald-700 opacity-70 cursor-default'
                : 'bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-indigo-500',
            ].join(' ')}
          >
            <span className="text-xl">{CHART_ICONS[rec.type] ?? '📊'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">
                {rec.title ?? rec.type}
              </p>
              <p className="text-[10px] text-slate-500">
                Confianza: {Math.round(rec.confidence * 100)}%
              </p>
            </div>
            <Plus size={13} className={added.has(rec.type) ? 'text-emerald-400' : 'text-slate-400'} />
          </button>
        ))}
      </div>
    </div>
  )
}
