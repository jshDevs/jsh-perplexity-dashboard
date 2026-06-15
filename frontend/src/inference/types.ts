import type { LogicalChartType } from '@/charts/registry'

/**
 * Rol semántico inferido de un campo (sin LLM).
 * Se determina por análisis estadístico puro:
 *   - ratio numérico, cardinalidad, patrones de nombre, detección ISO-date
 */
export type FieldRole =
  | 'METRIC'      // número agregable: ventas, ingresos, cantidad
  | 'DIMENSION'   // categoría de baja cardinalidad: zona, estado, producto
  | 'TIME'        // fecha/tiempo: fecha, created_at, year, month
  | 'ID'          // identificador único: *_id, uuid, pk
  | 'TEXT'        // texto libre / alta cardinalidad no agregable
  | 'BOOLEAN'     // true/false / 0/1 con ≤2 valores únicos
  | 'UNKNOWN'

export interface FieldMeta {
  name:           string
  role:           FieldRole
  dtype:          'number' | 'string' | 'boolean' | 'mixed' | 'null'
  nullRatio:      number       // 0..1
  numericRatio:   number       // proporción de valores parseables como float
  uniqueCount:    number
  totalCount:     number
  cardinalityRatio: number     // uniqueCount / totalCount
  sampleValues:   unknown[]
  min?:           number
  max?:           number
  mean?:          number
}

export interface InferredSchema {
  fields:     FieldMeta[]
  metrics:    FieldMeta[]   // role === 'METRIC'
  dimensions: FieldMeta[]   // role === 'DIMENSION'
  timeFields: FieldMeta[]   // role === 'TIME'
  idFields:   FieldMeta[]   // role === 'ID'
  rowCount:   number
  sampleSize: number
}

export interface RecommendedChart {
  type:          LogicalChartType
  confidence:    number          // 0..1
  reason:        string
  x_key?:        string
  y_key?:        string
  category_key?: string
  title?:        string
}
