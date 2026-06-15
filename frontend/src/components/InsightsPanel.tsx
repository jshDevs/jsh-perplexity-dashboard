/**
 * InsightsPanel — renders the auto-generated narrative from engine/insights.js
 * No LLM involved: insights are template-based deterministic text.
 */
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface Insight {
  type:    'trend' | 'peak' | 'concentration' | 'anomaly' | 'comparison' | string
  text:    string
  metric?: string
  value?:  number
}

interface InsightsPanelProps {
  insights:  Insight[]
  warnings?: Array<{ code: string; detail: string; field?: string }>
  questions?: Array<{ field: string; question: string; options: string[] }>
  onAnswer?:  (field: string, answer: string) => void
}

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  trend:         <TrendingUp  size={14} className="text-indigo-400" />,
  trend_down:    <TrendingDown size={14} className="text-rose-400" />,
  peak:          <AlertTriangle size={14} className="text-amber-400" />,
  concentration: <Lightbulb   size={14} className="text-cyan-400" />,
  default:       <Lightbulb   size={14} className="text-slate-400" />,
}

export default function InsightsPanel({ insights, warnings = [], questions = [], onAnswer }: InsightsPanelProps) {
  if (!insights.length && !warnings.length && !questions.length) return null

  return (
    <div className="flex flex-col gap-3">
      {/* Auto-generated insights */}
      {insights.length > 0 && (
        <div className="bg-slate-800 border border-indigo-800/40 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Lightbulb size={13} /> Hallazgos automáticos
          </h3>
          <ul className="flex flex-col gap-2">
            {insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="mt-0.5 shrink-0">
                  {INSIGHT_ICONS[ins.type] ?? INSIGHT_ICONS.default}
                </span>
                <span>{ins.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions for user (low-confidence fields) */}
      {questions.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-3">
            Campos ambiguos — ayuda al motor a clasificarlos
          </h3>
          <div className="flex flex-col gap-3">
            {questions.map((q) => (
              <div key={q.field} className="flex flex-col gap-1.5">
                <p className="text-sm text-amber-200">{q.question}</p>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onAnswer?.(q.field, opt)}
                      className="px-3 py-1 bg-slate-700 hover:bg-indigo-700 border border-slate-600 hover:border-indigo-500 rounded-full text-xs text-white transition-fast"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.filter((w) => w.code !== 'no_temporal_field').length > 0 && (
        <details className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <summary className="text-xs text-slate-400 cursor-pointer">
            {warnings.length} advertencia(s) del motor
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-slate-400">
                <span className="font-mono text-slate-500">[{w.code}]</span>{' '}
                {w.detail}
                {w.field && <span className="ml-1 text-slate-600">({w.field})</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
