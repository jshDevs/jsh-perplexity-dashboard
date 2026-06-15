/**
 * InferredDashboardPage — /infer
 * Página que acepta JSON (paste o upload) y genera dashboards
 * automáticamente usando el motor de inferencia + ChartRenderer.
 * Sin código manual del usuario.
 */
import { useState, useCallback } from 'react'
import { useInference } from '@/inference/useInference'
import DynamicChart from '@/components/DynamicChart'
import InferenceDebugPanel from '@/components/InferenceDebugPanel'
import { Upload, AlertCircle } from 'lucide-react'

export default function InferredDashboardPage() {
  const [raw, setRaw]     = useState<string>('')
  const [data, setData]   = useState<Record<string, unknown>[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState(false)

  const { schema, recommendations, primaryChart, isReady } = useInference(data ?? undefined)

  const handleParse = useCallback((text: string) => {
    setError(null)
    try {
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) {
        setError('El JSON debe ser un array de objetos: [{...}, {...}]')
        return
      }
      setData(parsed as Record<string, unknown>[])
    } catch (e) {
      setError(`JSON inválido: ${(e as Error).message}`)
    }
  }, [])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setRaw(text)
      handleParse(text)
    }
    reader.readAsText(file)
  }, [handleParse])

  return (
    <div className="min-h-screen bg-slate-900 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard auto-generado</h1>
          <p className="text-sm text-slate-400 mt-0.5">Pega JSON o sube un archivo — el motor infiere el schema y genera las gráficas</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm cursor-pointer transition-fast">
          <Upload size={14} />
          Subir JSON
          <input type="file" accept=".json" onChange={handleFile} className="hidden" />
        </label>
      </div>

      {/* Input */}
      {!isReady && (
        <div className="flex flex-col gap-2">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder='[{"fecha":"2024-01","ventas":1200,"zona":"Norte"},{...}]'
            rows={8}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button
            onClick={() => handleParse(raw)}
            disabled={!raw.trim()}
            className="self-start px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-fast"
          >
            Analizar y generar dashboard
          </button>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Dashboard generado */}
      {isReady && (
        <div className="flex flex-col gap-6">
          {/* Métricas de schema */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Filas',       value: schema.rowCount },
              { label: 'Campos',      value: schema.fields.length },
              { label: 'Métricas',    value: schema.metrics.length },
              { label: 'Dimensiones', value: schema.dimensions.length },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Gráficas recomendadas (máx 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recommendations.slice(0, 4).map((rec, i) => (
              <DynamicChart
                key={i}
                chart={rec}
                data={data!}
                datasetId={`inferred-${i}`}
                height={380}
              />
            ))}
          </div>

          {/* Debug panel */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDebug((v) => !v)}
              className="text-xs text-slate-500 hover:text-white transition-fast"
            >
              {debug ? 'Ocultar' : 'Mostrar'} debug de inferencia
            </button>
            <button
              onClick={() => { setData(null); setRaw('') }}
              className="text-xs text-slate-500 hover:text-red-400 transition-fast ml-auto"
            >
              Limpiar y reiniciar
            </button>
          </div>

          {debug && (
            <InferenceDebugPanel
              schema={schema}
              recommendations={recommendations}
            />
          />
          )}
        </div>
      )}
    </div>
  )
}
