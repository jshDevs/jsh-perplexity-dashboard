import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, ScatterChart, HeatmapChart, TreemapChart, RadarChart, GraphChart, MapChart, CandlestickChart, SankeyChart, GaugeChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, VisualMapComponent, DatasetComponent, GeoComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import type { UnifiedChartProps } from '../types'

echarts.use([
  BarChart, LineChart, PieChart, ScatterChart, HeatmapChart, TreemapChart,
  RadarChart, GraphChart, MapChart, CandlestickChart, SankeyChart, GaugeChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  VisualMapComponent, DatasetComponent, GeoComponent, CanvasRenderer,
])

function buildOption(props: UnifiedChartProps): EChartsOption {
  const { chartType, data, title, xKey = 'x', yKey = 'y', categoryKey = 'name', theme = 'dark' } = props
  const textColor = theme === 'dark' ? '#e2e8f0' : '#0f172a'

  switch (chartType) {
    case 'bar':
      return {
        title: { text: title, textStyle: { color: textColor } },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: data.map((d) => d[xKey]) },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: data.map((d) => d[yKey]) }],
      }
    case 'line':
    case 'area':
      return {
        title: { text: title, textStyle: { color: textColor } },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: data.map((d) => d[xKey]) },
        yAxis: { type: 'value' },
        series: [{ type: 'line', areaStyle: chartType === 'area' ? {} : undefined, data: data.map((d) => d[yKey]) }],
      }
    case 'pie':
    case 'donut':
      return {
        title: { text: title, textStyle: { color: textColor } },
        tooltip: { trigger: 'item' },
        series: [{
          type: 'pie',
          radius: chartType === 'donut' ? ['45%', '70%'] : '70%',
          data: data.map((d) => ({ name: d[categoryKey], value: d[yKey] })),
        }],
      }
    case 'scatter':
      return {
        title: { text: title, textStyle: { color: textColor } },
        tooltip: { trigger: 'item' },
        xAxis: { type: 'value' },
        yAxis: { type: 'value' },
        series: [{ type: 'scatter', data: data.map((d) => [d[xKey], d[yKey]]) }],
      }
    default:
      return {
        title: {
          text: `${title ?? 'Chart'} (${chartType})`,
          subtext: 'Fallback ECharts adapter',
          textStyle: { color: textColor },
        },
        tooltip: {},
        xAxis: { type: 'category', data: data.map((d) => d[xKey] ?? d[categoryKey]) },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: data.map((d) => d[yKey] ?? 0) }],
      }
  }
}

export default function EChartsAdapter(props: UnifiedChartProps) {
  const option = buildOption(props)
  return (
    <ReactECharts
      option={option}
      style={{ height: props.height ?? 380, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge
      onEvents={props.onFilter ? {
        click: (params: any) => {
          const field = props.categoryKey ?? props.xKey ?? 'category'
          const value = params?.name ?? params?.value?.[0] ?? params?.value
          if (value != null) props.onFilter?.({ field, value })
        },
      } : {}}
    />
  )
}
