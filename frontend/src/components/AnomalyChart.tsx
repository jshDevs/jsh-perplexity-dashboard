/**
 * AnomalyChart — line chart con markPoints de anomalías superpuestos.
 * Usa Apache ECharts v5 vía react-echarts.
 *
 * Props:
 *   series    — datos de la serie temporal [{ x, y }]
 *   anomalies — markPoints desde /api/v1/anomaly
 *   title     — título del chart
 *   method    — 'IQR' | 'Modified Z-score (MAD)' | 'CUSUM'
 */
import ReactECharts from 'echarts-for-react'
import { useMemo }  from 'react'

interface SeriesPoint { x: string | number; y: number }
interface MarkPoint {
  name:  string
  coord: [string | number, number]
  value: string
  itemStyle: { color: string }
}

interface Props {
  series:    SeriesPoint[]
  anomalies: MarkPoint[]
  title?:    string
  method?:   string
  height?:   number
}

export default function AnomalyChart({ series, anomalies, title, method, height = 320 }: Props) {
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    title: title ? {
      text:      title,
      subtext:   method ? `Método: ${method}` : undefined,
      textStyle: { color: '#e2e8f0', fontSize: 13 },
      subtextStyle: { color: '#94a3b8', fontSize: 11 },
    } : undefined,
    tooltip: {
      trigger:   'axis',
      formatter: (params: any[]) => {
        const p = params[0]
        return `${p.axisValue}<br/><b>${p.value}</b>`
      },
    },
    grid:   { top: title ? 60 : 20, right: 20, bottom: 40, left: 50 },
    xAxis:  {
      type: 'category',
      data: series.map((s) => s.x),
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      axisLine:  { lineStyle: { color: '#334155' } },
    },
    yAxis:  {
      type:      'value',
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [{
      type:      'line',
      data:      series.map((s) => s.y),
      smooth:    true,
      lineStyle: { color: '#6366f1', width: 2 },
      areaStyle: { color: 'rgba(99,102,241,0.08)' },
      symbol:    'none',
      markPoint: {
        symbol:     'pin',
        symbolSize: (val: number) => 20 + val * 20,
        label: { formatter: '{b}', fontSize: 9, color: '#fff' },
        data: anomalies,
      },
      markLine: anomalies.length > 0 ? {
        silent: true,
        lineStyle: { color: '#ef444466', type: 'dashed', width: 1 },
        data: anomalies.map((a) => ({ xAxis: a.coord[0] })),
      } : undefined,
    }],
  }), [series, anomalies, title, method])

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
      <ReactECharts
        option={option}
        style={{ height, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
      {anomalies.length > 0 && (
        <p className="text-xs text-slate-500 mt-2 text-right">
          {anomalies.length} anomalía{anomalies.length !== 1 ? 's' : ''} detectada{anomalies.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
