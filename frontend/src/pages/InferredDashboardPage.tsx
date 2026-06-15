/**
 * InferredDashboardPage — /infer
 *
 * Flujo completo:
 *   1. FileDropZone → usuario sube CSV/Excel/JSON
 *   2. useUpload → POST /api/v1/ingest + fetch 300 rows
 *   3. useInference → InferredSchema + RecommendedChart[]
 *   4. Grid de DynamicChart (top 4 recomendaciones)
 *   5. DatasetPreviewTable con TanStack Table
 *   6. InferenceDebugPanel colapsable
 *   7. Sheet selector para Excel multi-hoja
 */
import { useState } from 'react'
import { useUpload }             from '@/hooks/useUpload'
import { useInference }          from '@/inference/useInference'
import DynamicChart              from '@/components/DynamicChart'
import DatasetPreviewTable       from '@/components/DatasetPreviewTable'
import InferenceDebugPanel       from '@/components/InferenceDebugPanel'
import FileDropZone              from '@/components/FileDropZone'
import UploadProgressBar         from '@/components/UploadProgressBar'
import { RefreshCw, ChevronDown } from 'lucide-react'

export default function InferredDashboardPage() {
  const { state, upload, reset } = useUpload()
  const [debug,     setDebug]     = useState(false)
  const [sheetName, setSheetName] = useState<string | undefined>()
  const [sheetPick, setSheetPick] = useState(false)

  // Filas disponibles para inferencia (300 filas de muestra)
  const rows = state.stage === 'done' ? state.rows : undefined
  const meta = state.stage === 'done' ? state.meta : null

  const { schema, recommendations, isReady } =
    useInference(rows as Record<string, unknown>[] | undefined)

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if ((ext === 'xlsx' || ext === 'xls') && !sheetName) {
      // Si es Excel y no hay hoja elegida, subir sin hoja (backend elige primera)
    }
    upload(file, sheetName)
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 flex flex-col gap-6 max-w-7xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">
            Dashboard auto-generado
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Sube un archivo — el motor infiere el schema y genera las gráficas
          </p>
        </div>
        {state.stage === 'done' && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-fast"
          >
            <RefreshCw size={13} /> Nuevo archivo
          </button>
        )}
      </div>

      {/* ── Upload zone (solo cuando no hay dataset) ─────────────── */}
      {state.stage === 'idle' || state.stage === 'error' ? (
        <div className="flex flex-col gap-3">
          <FileDropZone onFile={handleFile} />
          <UploadProgressBar state={state} />

          {/* Sheet picker manual (opcional) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSheetPick((v) => !v)}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-fast"
            >
              <ChevronDown size={11} /> Especificar hoja Excel (opcional)
            </button>
          </div>
          {sheetPick && (
            <input
              type="text"
              placeholder="Nombre de la hoja, ej: Datos2024"
              value={sheetName ?? ''}
              onChange={(e) => setSheetName(e.target.value || undefined)}
              className="w-60 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </div>
      ) : (
        <UploadProgressBar state={state} />
      )}

      {/* ── Dashboard generado ───────────────────────────────────── */}
      {isReady && rows && meta && (
        <div className="flex flex-col gap-6">

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Filas',        value: meta.rowCount.toLocaleString() },
              { label: 'Columnas',     value: meta.columns.length },
              { label: 'Métricas',     value: schema.metrics.length },
              { label: 'Dimensiones',  value: schema.dimensions.length },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Warnings de ingestión */}
          {meta.warnings.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-700 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-400 mb-1">Avisos de ingesta</p>
              <ul className="list-disc list-inside text-xs text-amber-300 space-y-0.5">
                {meta.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Multi-hoja: selector si hay varias sheets */}
          {meta.sheets && meta.sheets.length > 1 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-400">Hojas disponibles:</span>
              {meta.sheets.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSheetName(s); reset(); }}
                  className="px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-indigo-700 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white transition-fast"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Gráficas auto-generadas — top 4 por confidence */}
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">
              Gráficas recomendadas
              <span className="ml-2 text-xs text-slate-500 font-normal">
                {recommendations.length} sugerencias · mostrando top 4
              </span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {recommendations.slice(0, 4).map((rec, i) => (
                <DynamicChart
                  key={`${meta.datasetId}-${i}`}
                  chart={rec}
                  data={rows as any[]}
                  datasetId={meta.datasetId}
                  height={360}
                />
              ))}
            </div>
          </div>

          {/* Preview tabla con TanStack Table */}
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">
              Preview del dataset
              <span className="ml-2 text-xs text-slate-500 font-normal">
                {meta.columns.length} columnas · primeras {rows.length} filas
              </span>
            </h2>
            <DatasetPreviewTable
              rows={rows as Record<string, unknown>[]}
              columns={meta.columns}
            />
          </div>

          {/* Debug panel */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDebug((v) => !v)}
              className="text-xs text-slate-500 hover:text-white transition-fast"
            >
              {debug ? 'Ocultar' : 'Mostrar'} debug de inferencia
            </button>
          </div>
          {debug && (
            <InferenceDebugPanel
              schema={schema}
              recommendations={recommendations}
            />
          )}
        </div>
      )}
    </div>
  )
}
