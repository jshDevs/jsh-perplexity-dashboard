/**
 * ForecastChart — line chart con serie histórica (sólida),
 * fitted (punteada) y proyección futura (discontinua con zona de color).
 * Usa Apache ECharts v5.
 */
import ReactECharts from 'echarts-for-react'
import { useMemo }  from 'react'

interface Props {
  labels:           (string | number)[]
  historical:       number[]
  fitted?:          number[]
  projection:       number[]
  projectionLabels: string[]
  title?:           string
  method?:          string
  metrics?:         { mape: number; rmse: number; mae: number }
  height?:          number
}

export default function ForecastChart({
  labels, historical, fitted, projection,
  projectionLabels, title, method, metrics, height = 340,
}: Props) {
  const allLabels = [...labels, ...projectionLabels]

  // Padding: serie histórica llega hasta labels.length, resto null
  const histPadded = [
    ...historical,
    ...Array(projectionLabels.length).fill(null),
  ]

  // Proyección empieza en el último punto histórico para continuidad visual
  const projPadded = [
    ...Array(historical.length - 1).fill(null),
    historical[historical.length - 1],   // punto de unión
    ...projection,
  ]

  const fittedPadded = fitted
    ? [...fitted, ...Array(projectionLabels.length).fill(null)]
    : null

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    title: title ? {
      text:         title,
      subtext:      [
        method ? `Método: ${method}` : '',
        metrics ? `MAPE: ${metrics.mape.toFixed(1)}% · RMSE: ${metrics.rmse.toFixed(2)}` : '',
      ].filter(Boolean).join('  ·  '),
      textStyle:    { color: '#e2e8f0', fontSize: 13 },
      subtextStyle: { color: '#94a3b8', fontSize: 10 },
    } : undefined,
    tooltip: { trigger: 'axis' },
    legend: {
      data:      ['Histórico', 'Ajustado', 'Proyección'],
      textStyle: { color: '#94a3b8', fontSize: 11 },
      bottom: 0,
    },
    grid:   { top: title ? 64 : 20, right: 20, bottom: 40, left: 54 },
    xAxis:  {
      type:      'category',
      data:      allLabels,
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      axisLine:  { lineStyle: { color: '#334155' } },
    },
    yAxis:  {
      type:      'value',
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name:      'Histórico',
        type:      'line',
        data:      histPadded,
        lineStyle: { color: '#6366f1', width: 2 },
        symbol:    'none',
        connectNulls: false,
      },
      ...(fittedPadded ? [{
        name:      'Ajustado',
        type:      'line',
        data:      fittedPadded,
        lineStyle: { color: '#22d3ee', width: 1.5, type: 'dotted' as const },
        symbol:    'none',
        connectNulls: false,
      }] : []),
      {
        name:      'Proyección',
        type:      'line',
        data:      projPadded,
        lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' as const },
        areaStyle: { color: 'rgba(245,158,11,0.08)' },
        symbol:    'circle',
        symbolSize: 5,
        connectNulls: false,
      },
    ],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [allLabels, histPadded, fittedPadded, projPadded, title, method, metrics])

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
      <ReactECharts
        option={option}
        style={{ height, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}
