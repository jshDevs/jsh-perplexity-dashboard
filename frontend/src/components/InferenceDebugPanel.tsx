/**
 * InferenceDebugPanel — panel colapsable que muestra el resultado
 * completo del motor de inferencia: fields, roles, recomendaciones.
 * Solo visible en modo desarrollo / flag ?debug=1.
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, FlaskConical } from 'lucide-react'
import type { InferredSchema, RecommendedChart } from '@/inference/types'

const ROLE_COLORS: Record<string, string> = {
  METRIC:    'bg-emerald-900 text-emerald-300 border-emerald-700',
  DIMENSION: 'bg-blue-900 text-blue-300 border-blue-700',
  TIME:      'bg-violet-900 text-violet-300 border-violet-700',
  ID:        'bg-slate-700 text-slate-400 border-slate-600',
  TEXT:      'bg-amber-900 text-amber-300 border-amber-700',
  BOOLEAN:   'bg-pink-900 text-pink-300 border-pink-700',
  UNKNOWN:   'bg-red-900 text-red-400 border-red-700',
}

interface Props {
  schema:          InferredSchema
  recommendations: RecommendedChart[]
}

export default function InferenceDebugPanel({ schema, recommendations }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden text-xs font-mono">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-fast"
      >
        <FlaskConical size={13} />
        <span className="font-semibold text-slate-300">Inference Debug</span>
        <span className="text-slate-500">{schema.rowCount} rows · {schema.fields.length} fields · {schema.sampleSize} sampled</span>
        <span className="ml-auto">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
      </button>

      {open && (
        <div className="bg-slate-900 p-4 flex flex-col gap-4">

          {/* Fields table */}
          <div>
            <p className="text-slate-500 uppercase tracking-wider text-[10px] mb-2">Fields detectados</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    {['Campo','Rol','dtype','nullRatio','numRatio','cardRatio','unique','min','max','mean'].map((h) => (
                      <th key={h} className="pr-4 pb-1 font-normal whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schema.fields.map((f) => (
                    <tr key={f.name} className="border-b border-slate-800/50 hover:bg-slate-800/40">
                      <td className="pr-4 py-0.5 text-white">{f.name}</td>
                      <td className="pr-4 py-0.5">
                        <span className={`border px-1.5 py-0.5 rounded text-[9px] font-bold ${ROLE_COLORS[f.role] ?? ''}`}>
                          {f.role}
                        </span>
                      </td>
                      <td className="pr-4 py-0.5 text-slate-400">{f.dtype}</td>
                      <td className="pr-4 py-0.5 text-slate-400">{(f.nullRatio * 100).toFixed(1)}%</td>
                      <td className="pr-4 py-0.5 text-slate-400">{(f.numericRatio * 100).toFixed(1)}%</td>
                      <td className="pr-4 py-0.5 text-slate-400">{(f.cardinalityRatio * 100).toFixed(1)}%</td>
                      <td className="pr-4 py-0.5 text-slate-400">{f.uniqueCount}</td>
                      <td className="pr-4 py-0.5 text-slate-400">{f.min?.toFixed(2) ?? '—'}</td>
                      <td className="pr-4 py-0.5 text-slate-400">{f.max?.toFixed(2) ?? '—'}</td>
                      <td className="pr-4 py-0.5 text-slate-400">{f.mean?.toFixed(2) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <p className="text-slate-500 uppercase tracking-wider text-[10px] mb-2">Recomendaciones ordenadas por confianza</p>
            <div className="flex flex-col gap-1">
              {recommendations.map((r, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-800 rounded px-3 py-1.5">
                  <span className="w-6 text-center text-slate-500">{i + 1}</span>
                  <span className="text-indigo-400 font-bold w-20">{r.type}</span>
                  <span className="text-emerald-400 w-12">{(r.confidence * 100).toFixed(0)}%</span>
                  <span className="text-slate-400 flex-1">{r.reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
