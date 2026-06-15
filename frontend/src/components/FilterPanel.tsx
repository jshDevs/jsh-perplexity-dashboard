import { useDashboardStore } from '@/store/dashboardStore'
import type { DashboardConfig } from '@/types/dashboard'
import { X } from 'lucide-react'

interface FilterPanelProps {
  config: DashboardConfig
}

export default function FilterPanel({ config }: FilterPanelProps) {
  const { filters, addFilter, removeFilter, clearFilters, timeRange, setTimeRange, granularity, setGranularity } =
    useDashboardStore()

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap items-center gap-4">
      {/* Time range picker */}
      {config.time_dimension && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider">Periodo</label>
          <input
            type="date"
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            value={timeRange?.from ?? ''}
            onChange={(e) => setTimeRange({ from: e.target.value, to: timeRange?.to ?? '' })}
          />
          <span className="text-slate-500">-</span>
          <input
            type="date"
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            value={timeRange?.to ?? ''}
            onChange={(e) => setTimeRange({ from: timeRange?.from ?? '', to: e.target.value })}
          />
        </div>
      )}

      {/* Granularity */}
      {config.time_dimension && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider">Granularidad</label>
          {(['day', 'week', 'month'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-2 py-1 rounded text-xs font-medium transition-fast ${
                granularity === g
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >{g}</button>
          ))}
        </div>
      )}

      {/* Dimension filters */}
      {config.dimensions?.map((dim) => (
        <div key={dim.name} className="flex items-center gap-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider">{dim.label}</label>
          <input
            type="text"
            placeholder={`Filtrar ${dim.label}...`}
            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white w-36 placeholder:text-slate-500"
            onChange={(e) => {
              if (e.target.value) {
                addFilter({ field: dim.column, operator: 'LIKE', value: `%${e.target.value}%` })
              } else {
                removeFilter(dim.column)
              }
            }}
          />
        </div>
      ))}

      {/* Active filter badges */}
      {filters.length > 0 && (
        <div className="flex items-center gap-1 ml-2">
          {filters.map((f) => (
            <span
              key={f.field}
              className="flex items-center gap-1 bg-indigo-900 border border-indigo-600 text-indigo-200 text-xs rounded-full px-2 py-0.5"
            >
              {f.field}: {String(f.value)}
              <button onClick={() => removeFilter(f.field)} className="hover:text-white">
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            onClick={clearFilters}
            className="text-xs text-slate-400 hover:text-white ml-1 transition-fast"
          >Limpiar todo</button>
        </div>
      )}
    </div>
  )
}
