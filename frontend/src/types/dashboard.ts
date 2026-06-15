// ── Core domain types for JSH Dashboard ──

export type ColumnType = 'METRIC' | 'DIMENSION' | 'TIME' | 'ID' | 'TEXT'

export interface ColumnMeta {
  name:               string
  type:               ColumnType
  numeric_ratio:      number
  cardinality_ratio:  number
  distinct_values:    number
  total_samples:      number
  nullable:           boolean
  manually_overridden?: boolean
}

export interface DatasetSchema {
  dataset_id: string
  row_count:  number
  columns:    Record<string, ColumnMeta>
  summary: {
    metrics:    number
    dimensions: number
    time_cols:  number
    ids:        number
    text_cols:  number
  }
}

export type ChartType =
  | 'kpi'
  | 'line'
  | 'line_grouped'
  | 'bar'
  | 'bar_grouped'
  | 'pie'
  | 'scatter'
  | 'heatmap'
  | 'treemap'
  | 'table'

export interface ChartRecommendation {
  chart_type: ChartType
  config:     Record<string, unknown>
  renderer:   'canvas' | 'svg'
  rationale:  string
}

export interface DashboardListItem {
  slug:        string
  title:       string
  description: string | null
  updated_at:  string
}

export interface DashboardConfig {
  version:    string
  title:      string
  description?: string
  datasource: {
    type:   string
    path?:  string
    query?: string
  }
  time_dimension?: {
    column:        string
    granularities: string[]
  }
  dimensions?: Array<{
    name:        string
    column:      string
    label:       string
    filter_type: 'multiselect' | 'select' | 'daterange'
    cardinality?: number
  }>
  measures?: Array<{
    name:       string
    expression: string
    label:      string
    format:     'number' | 'currency' | 'percent' | 'decimal'
  }>
  filters?: Array<{
    field:   string
    type:    string
    default: string
  }>
  charts?: ChartRecommendation[]
}

export interface QueryFilter {
  field:    string
  operator: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'IN' | 'BETWEEN' | 'LIKE'
  value:    string | number | string[] | number[]
}

export interface QueryResult {
  data:  Record<string, unknown>[]
  count: number
  meta:  Record<string, unknown>
}

export interface AnomalyResult {
  anomalies: boolean[]
  scores:    number[]
  algorithm: string
  count:     number
}

export interface ForecastResult {
  algorithm:       string
  smoothed:        number[]
  forecast:        number[]
  forecast_count:  number
  accuracy: {
    mape: number
    rmse: number
  }
}
