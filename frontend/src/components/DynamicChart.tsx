/**
 * DynamicChart — orchestrator que conecta el análisis del engine
 * con el sistema multi-engine ChartRenderer.
 *
 * Reemplaza la implementación previa que llamaba ECharts directamente.
 * Ahora delega al ChartRenderer (lazy, multi-engine) y añade:
 *  - Toolbar: export PNG, fullscreen, picker de chart type
 *  - Cross-filter emitido desde el adapter a Zustand
 *  - Fallback skeleton mientras carga el adapter
 */
import { useState, useCallback } from 'react'
import ChartRenderer from '@/charts/ChartRenderer'
import ChartTypePicker from './ChartTypePicker'
import { CHART_REGISTRY } from '@/charts/registry'
import type { LogicalChartType } from '@/charts/registry'
import { useDashboardStore } from '@/store/dashboardStore'
import { useTranslation } from '@/i18n/useTranslation'
import { Download, Maximize2, Settings2 } from 'lucide-react'

interface RecommendedChart {
  type: LogicalChartType
  x_key?: string
  y_key?: string
  category_key?: string
  title?: string
}

interface DynamicChartProps {
  chart:       RecommendedChart
  data:        Record<string, unknown>[]
  datasetId:   string
  height?:     number
}

export default function DynamicChart({ chart, data, datasetId, height = 380 }: DynamicChartProps) {
  const { t } = useTranslation()
  const addFilter  = useDashboardStore((s) => s.addFilter)
  const [chartType, setChartType] = useState<LogicalChartType>(chart.type)
  const [showPicker, setShowPicker] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const handleFilter = useCallback(
    ({ field, value }: { field: string; value: string | number }) => {
      addFilter(datasetId, { field, value: String(value), operator: 'eq' })
    },
    [addFilter, datasetId]
  )

  const descriptor = CHART_REGISTRY[chartType]

  return (
    <div
      className={[
        'relative bg-slate-800 border border-slate-700 rounded-xl flex flex-col gap-2',
        fullscreen ? 'fixed inset-4 z-50 shadow-2xl' : '',
      ].join(' ')}
    >
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200 truncate max-w-xs">
            {chart.title ?? chartType}
          </h3>
          <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-mono">
            {descriptor.engine}
          </span>
          {descriptor.capabilities.supports3d && (
            <span className="text-[10px] bg-indigo-900 text-indigo-300 border border-indigo-700 px-1.5 py-0.5 rounded">3D</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPicker((v) => !v)}
            title="Cambiar tipo de gráfica"
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-fast"
          >
            <Settings2 size={14} />
          </button>
          <button
            onClick={() => setFullscreen((v) => !v)}
            title={t('dashboard.fullscreen')}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-fast"
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={() => {
              // ECharts nativo expone getDataURL — Plotly/Nivo descargan via blob
              const canvases = document.querySelectorAll('canvas')
              if (canvases.length > 0) {
                const a = document.createElement('a')
                a.href = (canvases[0] as HTMLCanvasElement).toDataURL('image/png')
                a.download = `${chartType}-${Date.now()}.png`
                a.click()
              }
            }}
            title={t('dashboard.export')}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-fast"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* ── Chart Type Picker (flyout) ───────────────────────────── */}
      {showPicker && (
        <div className="px-4">
          <ChartTypePicker
            value={chartType}
            onChange={(t) => { setChartType(t); setShowPicker(false) }}
          />
        </div>
      )}

      {/* ── Chart Canvas ────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <ChartRenderer
          chartType={chartType}
          data={data as any[]}
          title={chart.title}
          xKey={chart.x_key}
          yKey={chart.y_key}
          categoryKey={chart.category_key}
          theme="dark"
          height={fullscreen ? window.innerHeight - 140 : height}
          onFilter={descriptor.capabilities.supportsCrossFilter ? handleFilter : undefined}
        />
      </div>
    </div>
  )
}
