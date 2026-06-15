import type { LogicalChartType } from '../registry'

export interface UnifiedChartProps {
  chartType: LogicalChartType
  data: any[]
  title?: string
  xKey?: string
  yKey?: string
  categoryKey?: string
  theme?: 'light' | 'dark'
  height?: number | string
  onFilter?: (payload: { field: string; value: string | number }) => void
}

export interface ChartAdapterComponent {
  (props: UnifiedChartProps): JSX.Element
}
