/**
 * DemoPage — /demo?chart=bar
 * Página de demostración para probar cualquier tipo de gráfica
 * con datos sintéticos. Usada por E2E visual regression.
 */
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import DynamicChart from '@/components/DynamicChart'
import type { LogicalChartType } from '@/charts/registry'
import { CHART_REGISTRY } from '@/charts/registry'

function generateDemoData(chartType: LogicalChartType) {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  if (['bar','line','area'].includes(chartType)) {
    return months.map((m) => ({ mes: m, valor: Math.round(Math.random() * 500 + 50) }))
  }
  if (['pie','donut'].includes(chartType)) {
    return ['Norte','Sur','Este','Oeste'].map((z) => ({ zona: z, valor: Math.round(Math.random() * 200 + 50) }))
  }
  if (chartType === 'scatter') {
    return Array.from({ length: 30 }, (_, i) => ({ x: i * 3 + Math.random() * 5, y: Math.random() * 100 }))
  }
  if (chartType === 'violin') {
    return Array.from({ length: 60 }, (_, i) => ({
      grupo: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
      valor: Math.random() * 100,
    }))
  }
  if (chartType === 'waffle') {
    return [
      { categoria: 'Completado', valor: 42 },
      { categoria: 'Pendiente', valor: 35 },
      { categoria: 'Error', valor: 23 },
    ]
  }
  if (chartType === 'chord') {
    const zonas = ['Norte','Sur','Este','Oeste']
    const rows: object[] = []
    zonas.forEach((s) => zonas.forEach((t) => { if (s !== t) rows.push({ source: s, target: t, name: s, value: Math.round(Math.random() * 100) }) }))
    return rows
  }
  // fallback
  return months.map((m) => ({ mes: m, valor: Math.round(Math.random() * 400 + 100) }))
}

export default function DemoPage() {
  const [params] = useSearchParams()
  const chartType = (params.get('chart') ?? 'bar') as LogicalChartType
  const safeType  = chartType in CHART_REGISTRY ? chartType : 'bar'
  const data      = useMemo(() => generateDemoData(safeType), [safeType])

  const xKey = ['bar','line','area'].includes(safeType) ? 'mes'
    : ['pie','donut'].includes(safeType) ? 'zona' : 'x'
  const yKey = 'valor'
  const catKey = ['pie','donut','waffle','chord'].includes(safeType)
    ? (['pie','donut'].includes(safeType) ? 'zona' : 'categoria')
    : 'grupo'

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-6">
          Demo — <span className="text-indigo-400">{safeType}</span>
        </h1>
        <div data-chart-type={safeType}>
          <DynamicChart
            chart={{
              type:         safeType,
              title:        `Demo: ${safeType}`,
              x_key:        xKey,
              y_key:        yKey,
              category_key: catKey,
            }}
            data={data as any}
            datasetId="demo"
            height={480}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(CHART_REGISTRY) as LogicalChartType[]).map((t) => (
            <a
              key={t}
              href={`/demo?chart=${t}`}
              className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-indigo-700 text-slate-400 hover:text-white border border-slate-700 transition-fast"
            >
              {t}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
