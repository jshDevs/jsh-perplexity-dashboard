import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { ChartRecommendation } from '@/types/dashboard'
import { useMemo } from 'react'

interface DynamicChartProps {
  recommendation: ChartRecommendation
  data:           Record<string, unknown>[]
  title?:         string
  height?:        string
}

function buildOption(
  rec: ChartRecommendation,
  data: Record<string, unknown>[]
): EChartsOption {
  const cfg = rec.config as Record<string, unknown>

  const PALETTE = [
    '#6366f1', '#22d3ee', '#a3e635', '#f59e0b',
    '#f43f5e', '#8b5cf6', '#10b981', '#fb923c',
  ]

  switch (rec.chart_type) {
    case 'line':
    case 'line_grouped': {
      const xField  = cfg.x as string
      const yFields = Array.isArray(cfg.y) ? cfg.y as string[] : [cfg.y as string]
      return {
        tooltip: { trigger: 'axis' },
        legend:  { show: yFields.length > 1, textStyle: { color: '#94a3b8' } },
        grid:    { left: 60, right: 20, top: 40, bottom: 60, containLabel: true },
        xAxis:   { type: 'category', data: data.map((r) => r[xField] as string),
                   axisLine: { lineStyle: { color: '#334155' } },
                   axisLabel: { color: '#94a3b8', rotate: 30 } },
        yAxis:   { type: 'value', axisLabel: { color: '#94a3b8' },
                   splitLine: { lineStyle: { color: '#1e293b' } } },
        series: yFields.map((field, i) => ({
          name: field,
          type: 'line',
          smooth: true,
          data: data.map((r) => r[field] as number),
          lineStyle: { color: PALETTE[i % PALETTE.length] },
          itemStyle: { color: PALETTE[i % PALETTE.length] },
          areaStyle: yFields.length === 1 ? { opacity: 0.15, color: PALETTE[0] } : undefined,
        })),
        backgroundColor: 'transparent',
      }
    }
    case 'bar':
    case 'bar_grouped': {
      const xField  = cfg.x as string
      const yFields = Array.isArray(cfg.y) ? cfg.y as string[] : [cfg.y as string]
      return {
        tooltip: { trigger: 'axis' },
        legend:  { show: yFields.length > 1, textStyle: { color: '#94a3b8' } },
        grid:    { left: 60, right: 20, top: 40, bottom: 60, containLabel: true },
        xAxis:   { type: 'category', data: data.map((r) => r[xField] as string),
                   axisLabel: { color: '#94a3b8', rotate: 30 } },
        yAxis:   { type: 'value', axisLabel: { color: '#94a3b8' },
                   splitLine: { lineStyle: { color: '#1e293b' } } },
        series: yFields.map((field, i) => ({
          name: field, type: 'bar',
          data: data.map((r) => r[field] as number),
          itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: [4, 4, 0, 0] },
        })),
        backgroundColor: 'transparent',
      }
    }
    case 'pie': {
      const label = cfg.label as string
      const value = cfg.value as string
      return {
        tooltip:  { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend:   { orient: 'vertical', right: 0, textStyle: { color: '#94a3b8' } },
        series: [{
          name: label, type: 'pie', radius: ['35%', '65%'],
          data: data.map((r, i) => ({
            name:  String(r[label]),
            value: r[value] as number,
            itemStyle: { color: PALETTE[i % PALETTE.length] },
          })),
          label:     { color: '#f1f5f9' },
          emphasis:  { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
        }],
        backgroundColor: 'transparent',
      }
    }
    case 'scatter': {
      const xField = cfg.x as string
      const yField = cfg.y as string
      return {
        tooltip: { trigger: 'item' },
        grid:    { left: 60, right: 20, top: 40, bottom: 60 },
        xAxis:   { type: 'value', axisLabel: { color: '#94a3b8' },
                   splitLine: { lineStyle: { color: '#1e293b' } } },
        yAxis:   { type: 'value', axisLabel: { color: '#94a3b8' },
                   splitLine: { lineStyle: { color: '#1e293b' } } },
        series: [{
          type: 'scatter',
          data: data.map((r) => [r[xField], r[yField]]),
          itemStyle: { color: PALETTE[0], opacity: 0.8 },
          symbolSize: 8,
        }],
        backgroundColor: 'transparent',
      }
    }
    case 'treemap': {
      const labelField = cfg.label as string
      const valueField = cfg.value as string
      return {
        tooltip:  { formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value}` },
        series: [{
          type: 'treemap',
          data: data.map((r, i) => ({
            name:  String(r[labelField]),
            value: r[valueField] as number,
            itemStyle: { color: PALETTE[i % PALETTE.length] },
          })),
          label: { color: '#fff', fontSize: 12 },
        }],
        backgroundColor: 'transparent',
      }
    }
    default:
      return { title: { text: `Chart type "${rec.chart_type}" not yet rendered`, textStyle: { color: '#94a3b8' } } }
  }
}

export default function DynamicChart({ recommendation, data, title, height = '320px' }: DynamicChartProps) {
  const option = useMemo(() => buildOption(recommendation, data), [recommendation, data])

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      {title && <h3 className="text-sm font-semibold text-slate-300 mb-3">{title}</h3>}
      <ReactECharts
        option={option}
        style={{ height }}
        opts={{ renderer: recommendation.renderer }}
        notMerge
        lazyUpdate={false}
      />
    </div>
  )
}
