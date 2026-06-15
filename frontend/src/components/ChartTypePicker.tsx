/**
 * ChartTypePicker — selector visual de tipo de gráfica.
 * Agrupa los tipos por motor y muestra capacidades (3D, cross-filter).
 */
import { CHART_REGISTRY } from '@/charts/registry'
import type { LogicalChartType } from '@/charts/registry'
import { cn } from '@/lib/utils'

const GROUPS: { label: string; types: LogicalChartType[] }[] = [
  {
    label: 'ECharts — básicos',
    types: ['bar', 'line', 'area', 'pie', 'donut', 'scatter'],
  },
  {
    label: 'ECharts — avanzados',
    types: ['heatmap', 'treemap', 'sankey', 'radar', 'graph', 'candlestick', 'map'],
  },
  {
    label: 'ECharts GL — 3D',
    types: ['bar3d', 'scatter3d', 'surface'],
  },
  {
    label: 'Plotly — estadística',
    types: ['violin', 'splom', 'ternary'],
  },
  {
    label: 'Nivo — especiales',
    types: ['waffle', 'chord'],
  },
]

const EMOJI: Record<LogicalChartType, string> = {
  bar: '📊', line: '📈', area: '🏔️', pie: '🥧', donut: '🍩', scatter: '⚡',
  heatmap: '🌡️', treemap: '🌳', sankey: '🌊', radar: '🕸️', graph: '🕸️',
  candlestick: '🕯️', map: '🗺️', bar3d: '🧊', scatter3d: '💠', surface: '🏄',
  violin: '🎻', splom: '🔬', ternary: '△', waffle: '🧇', chord: '🎼',
}

interface ChartTypePickerProps {
  value:    LogicalChartType
  onChange: (type: LogicalChartType) => void
}

export default function ChartTypePicker({ value, onChange }: ChartTypePickerProps) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-col gap-3 shadow-xl">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.types.map((type) => {
              const desc = CHART_REGISTRY[type]
              return (
                <button
                  key={type}
                  onClick={() => onChange(type)}
                  title={[
                    desc.capabilities.supports3d ? '3D' : '',
                    desc.capabilities.supportsCrossFilter ? 'cross-filter' : '',
                    desc.capabilities.supportsLargeData ? 'large-data' : '',
                  ].filter(Boolean).join(' · ')}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-fast',
                    value === type
                      ? 'bg-indigo-600 text-white ring-1 ring-indigo-400'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  <span className="text-base leading-none">{EMOJI[type]}</span>
                  <span>{type}</span>
                  {desc.capabilities.supports3d && (
                    <span className="text-[8px] bg-indigo-900 text-indigo-300 px-1 rounded">3D</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
