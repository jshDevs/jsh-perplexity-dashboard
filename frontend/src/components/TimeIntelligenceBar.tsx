/**
 * TimeIntelligenceBar — exposes the DAX-equivalent presets from engine/timeIntelligence.js
 * Preset names must match PRESETS exported by that module.
 */
import { useDashboardStore } from '@/store/dashboardStore'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESETS = [
  { id: 'last_7_days',   label: 'Últ. 7d' },
  { id: 'last_30_days',  label: 'Últ. 30d' },
  { id: 'last_90_days',  label: 'Últ. 90d' },
  { id: 'month_to_date', label: 'MTD' },
  { id: 'year_to_date',  label: 'YTD' },
  { id: 'this_year',     label: 'Año actual' },
  { id: 'all_time',      label: 'Todo' },
] as const

const COMPARE_MODES = [
  { id: 'none',     label: 'Sin comparar' },
  { id: 'previous', label: 'vs Período anterior' },
  { id: 'year',     label: 'vs Año anterior' },
] as const

interface TimeIntelligenceBarProps {
  onPresetChange:  (presetId: string) => void
  onCompareChange: (mode: string)     => void
  activePreset?:   string
  compareMode?:    string
}

export default function TimeIntelligenceBar({
  onPresetChange,
  onCompareChange,
  activePreset  = 'all_time',
  compareMode   = 'none',
}: TimeIntelligenceBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
      <div className="flex items-center gap-1.5">
        <CalendarDays size={14} className="text-slate-400" />
        <span className="text-xs text-slate-400 uppercase tracking-wider">Período</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPresetChange(p.id)}
            className={cn(
              'px-2.5 py-1 rounded text-xs font-medium transition-fast',
              activePreset === p.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <span className="text-xs text-slate-500">Comparar:</span>
        {COMPARE_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onCompareChange(m.id)}
            className={cn(
              'px-2.5 py-1 rounded text-xs font-medium transition-fast',
              compareMode === m.id
                ? 'bg-cyan-700 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
