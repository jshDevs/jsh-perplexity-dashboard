import Plot from 'react-plotly.js'
import type { UnifiedChartProps } from '../types'

export default function PlotlyAdapter({ chartType, data, title, xKey = 'x', yKey = 'y', categoryKey = 'name', height = 420 }: UnifiedChartProps) {
  let traces: any[] = []

  if (chartType === 'violin') {
    traces = [{
      type: 'violin',
      x: data.map((d) => d[categoryKey]),
      y: data.map((d) => d[yKey]),
      box: { visible: true },
      meanline: { visible: true },
    }]
  } else if (chartType === 'splom') {
    const keys = Object.keys(data[0] ?? {}).filter((k) => typeof data[0]?.[k] === 'number').slice(0, 4)
    traces = [{
      type: 'splom',
      dimensions: keys.map((k) => ({ label: k, values: data.map((d) => d[k]) })),
      text: data.map((_, i) => String(i + 1)),
      marker: { color: '#6366f1', size: 6 },
    }]
  } else if (chartType === 'ternary') {
    traces = [{
      type: 'scatterternary',
      mode: 'markers',
      a: data.map((d) => d.a),
      b: data.map((d) => d.b),
      c: data.map((d) => d.c),
      text: data.map((d) => d[categoryKey] ?? ''),
      marker: { size: 8, color: '#06b6d4' },
    }]
  }

  return (
    <Plot
      data={traces}
      layout={{
        title,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#e2e8f0' },
        margin: { t: 48, r: 24, b: 40, l: 48 },
        height: typeof height === 'number' ? height : 420,
        autosize: true,
      }}
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
      config={{ displayModeBar: false, responsive: true }}
    />
  )
}
