/**
 * schemaInferrer — dado un array de records (JSON plano),
 * extrae columnas, analiza cada campo y devuelve InferredSchema.
 *
 * Soporta muestra configurable (default 300 filas) para datasets grandes.
 */
import { analyzeField } from './fieldAnalyzer'
import type { InferredSchema, FieldMeta } from './types'

const SAMPLE_SIZE_DEFAULT = 300

function extractColumns(data: Record<string, unknown>[]): string[] {
  // Unión de todas las keys del dataset (por si hay rows con campos faltantes)
  const keySet = new Set<string>()
  data.forEach((row) => Object.keys(row).forEach((k) => keySet.add(k)))
  return [...keySet]
}

function sampleData(
  data: Record<string, unknown>[],
  sampleSize: number,
): Record<string, unknown>[] {
  if (data.length <= sampleSize) return data
  // Muestra estratificada simple: toma cada N-ésimo elemento
  const step = Math.floor(data.length / sampleSize)
  return data.filter((_, i) => i % step === 0).slice(0, sampleSize)
}

export function inferSchema(
  data:       Record<string, unknown>[],
  sampleSize: number = SAMPLE_SIZE_DEFAULT,
): InferredSchema {
  if (!data || data.length === 0) {
    return {
      fields:     [],
      metrics:    [],
      dimensions: [],
      timeFields: [],
      idFields:   [],
      rowCount:   0,
      sampleSize: 0,
    }
  }

  const sample  = sampleData(data, sampleSize)
  const columns = extractColumns(sample)

  const fields: FieldMeta[] = columns.map((col) => {
    const values = sample.map((row) => row[col] ?? null)
    return analyzeField(col, values)
  })

  return {
    fields,
    metrics:    fields.filter((f) => f.role === 'METRIC'),
    dimensions: fields.filter((f) => f.role === 'DIMENSION'),
    timeFields: fields.filter((f) => f.role === 'TIME'),
    idFields:   fields.filter((f) => f.role === 'ID'),
    rowCount:   data.length,
    sampleSize: sample.length,
  }
}
