// ─── Tipos del semantic layer ────────────────────────────────────────────────

export type FieldType = 'METRIC' | 'DIMENSION' | 'TIME' | 'ID' | 'TEXT' | 'BOOLEAN'

export interface MetricDefinition {
  name:        string          // slug único, ej: "revenue"
  label:       string          // etiqueta UI: "Ingresos totales"
  expression:  string          // SQL expression: "SUM(price * qty)"
  format?:     string          // "currency" | "percent" | "number"
  description?: string
}

export interface DimensionDefinition {
  name:    string
  label:   string
  field:   string              // nombre de columna real
  type:    'categorical' | 'time' | 'boolean'
}

export interface MetricsRegistry {
  namespace:   string          // ej: "ventas"
  metrics:     MetricDefinition[]
  dimensions:  DimensionDefinition[]
}

export interface VirtualDataset {
  id:          string
  label:       string
  query:       string          // SQL base (puede tener {{params}})
  sourceDatasetId?: string    // dataset de origen en Redis
  params?:     QueryParam[]
}

export interface QueryParam {
  name:        string          // nombre sin llaves: "fecha_inicio"
  type:        'string' | 'number' | 'date' | 'boolean'
  default?:    string | number | boolean
  required?:   boolean
}

export interface ResolvedQuery {
  sql:     string
  params:  Record<string, string | number | boolean>
  errors:  string[]
}
