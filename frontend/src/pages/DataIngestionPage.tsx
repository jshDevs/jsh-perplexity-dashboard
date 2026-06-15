import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ingestApi } from '@/api/dashboards'
import { Upload, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { DatasetSchema } from '@/types/dashboard'

const COLUMN_TYPES = ['METRIC', 'DIMENSION', 'TIME', 'ID', 'TEXT'] as const

export default function DataIngestionPage() {
  const fileRef     = useRef<HTMLInputElement>(null)
  const [schema,    setSchema]    = useState<DatasetSchema | null>(null)
  const [datasetId, setDatasetId] = useState<string | null>(null)
  const [dragOver,  setDragOver]  = useState(false)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => ingestApi.file(file),
    onSuccess: (result) => {
      setSchema(result.data.schema)
      setDatasetId(result.data.dataset_id)
      toast.success('Archivo procesado exitosamente')
    },
    onError: (err: Error) => {
      toast.error(`Error: ${err.message}`)
    },
  })

  const overrideMutation = useMutation({
    mutationFn: ({ column, type }: { column: string; type: string }) =>
      ingestApi.overrideColumn(datasetId!, column, type),
    onSuccess: (_, { column, type }) => {
      setSchema((prev) => prev ? {
        ...prev,
        columns: {
          ...prev.columns,
          [column]: { ...prev.columns[column], type: type as DatasetSchema['columns'][string]['type'] },
        },
      } : null)
      toast.success(`Columna actualizada`)
    },
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadMutation.mutate(file)
  }

  const TYPE_COLORS: Record<string, string> = {
    METRIC:    'bg-indigo-900 text-indigo-300 border-indigo-600',
    DIMENSION: 'bg-amber-900 text-amber-300 border-amber-600',
    TIME:      'bg-cyan-900 text-cyan-300 border-cyan-600',
    ID:        'bg-slate-700 text-slate-300 border-slate-500',
    TEXT:      'bg-rose-900 text-rose-300 border-rose-600',
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Ingestar Dataset</h1>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-fast ${
          dragOver
            ? 'border-indigo-400 bg-indigo-900/20'
            : 'border-slate-600 hover:border-slate-400 bg-slate-800'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
      >
        <Upload size={32} className="mx-auto mb-3 text-slate-400" />
        <p className="text-slate-300 font-medium">Arrastra y suelta o haz clic para subir</p>
        <p className="text-xs text-slate-500 mt-1">CSV, JSON, XLSX, Parquet &bull; Máx 50 MB</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json,.xlsx,.xls,.parquet"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])}
        />
      </div>

      {uploadMutation.isPending && (
        <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
          <span className="text-slate-300 text-sm">Analizando dataset y detectando schema...</span>
        </div>
      )}

      {/* Schema preview */}
      {schema && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-400" />
                Schema inferido
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {schema.row_count.toLocaleString('es-SV')} filas &bull;&nbsp;
                {schema.summary.metrics} métricas &bull;&nbsp;
                {schema.summary.dimensions} dimensiones &bull;&nbsp;
                {schema.summary.time_cols} campos temporales
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">{datasetId}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                  <th className="pb-2 text-left">Columna</th>
                  <th className="pb-2 text-left">Tipo Inferido</th>
                  <th className="pb-2 text-right">≠ Num%</th>
                  <th className="pb-2 text-right">Cardinalidad</th>
                  <th className="pb-2 text-left">Sobrescribir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {Object.entries(schema.columns).map(([col, meta]) => (
                  <tr key={col}>
                    <td className="py-2 pr-4 font-mono text-slate-200">{col}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        TYPE_COLORS[meta.type] ?? ''
                      }`}>{meta.type}</span>
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-400">{(meta.numeric_ratio * 100).toFixed(0)}%</td>
                    <td className="py-2 pr-4 text-right text-slate-400">{meta.distinct_values}</td>
                    <td className="py-2">
                      <select
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-xs text-white"
                        value={meta.type}
                        onChange={(e) => overrideMutation.mutate({ column: col, type: e.target.value })}
                      >
                        {COLUMN_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {schema.summary.metrics === 0 && (
            <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700 rounded-lg p-3">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                No se detectaron métricas numéricas. Usa el selector &ldquo;Sobrescribir&rdquo; para marcar columnas como METRIC manualmente.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
