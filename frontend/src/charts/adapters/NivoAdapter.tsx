import { ResponsiveWaffle } from '@nivo/waffle'
import { ResponsiveChord } from '@nivo/chord'
import type { UnifiedChartProps } from '../types'

export default function NivoAdapter({ chartType, data, title, categoryKey = 'name', yKey = 'value', height = 420 }: UnifiedChartProps) {
  if (chartType === 'waffle') {
    return (
      <div style={{ height }} className="rounded-xl bg-slate-800 p-3">
        {title && <h3 className="text-sm text-slate-200 mb-2">{title}</h3>}
        <ResponsiveWaffle
          data={data.map((d) => ({ id: d[categoryKey], label: d[categoryKey], value: d[yKey] }))}
          total={data.reduce((s, d) => s + Number(d[yKey] ?? 0), 0)}
          rows={10}
          columns={10}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          colors={{ scheme: 'nivo' }}
          borderRadius={2}
        />
      </div>
    )
  }

  if (chartType === 'chord') {
    const keys = data.map((d) => String(d[categoryKey]))
    const index = new Map(keys.map((k, i) => [k, i]))
    const matrix = Array.from({ length: keys.length }, () => Array.from({ length: keys.length }, () => 0))

    data.forEach((d) => {
      const from = index.get(String(d.source))
      const to   = index.get(String(d.target))
      if (from != null && to != null) matrix[from][to] = Number(d[yKey] ?? 0)
    })

    return (
      <div style={{ height }} className="rounded-xl bg-slate-800 p-3">
        {title && <h3 className="text-sm text-slate-200 mb-2">{title}</h3>}
        <ResponsiveChord
          matrix={matrix}
          keys={keys}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          valueFormat=".2f"
          padAngle={0.02}
          innerRadiusRatio={0.96}
          innerRadiusOffset={0.02}
          arcOpacity={1}
          arcBorderWidth={1}
          arcBorderColor="#0f172a"
          ribbonOpacity={0.6}
          ribbonBorderWidth={1}
          ribbonBorderColor="#0f172a"
          colors={{ scheme: 'set2' }}
        />
      </div>
    )
  }

  return <div className="text-sm text-slate-400">Unsupported Nivo chart: {chartType}</div>
}
