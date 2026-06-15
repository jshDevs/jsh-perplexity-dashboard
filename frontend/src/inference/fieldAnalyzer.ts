/**
 * fieldAnalyzer — analiza un array de valores raw y devuelve FieldMeta.
 * 100% determinista, sin LLM, O(n·m) donde n=filas, m=columnas.
 */
import type { FieldMeta, FieldRole } from './types'

// Patrones de nombre que indican un rol específico
const TIME_PATTERNS    = /^(date|fecha|time|tiempo|created|updated|timestamp|at|year|año|month|mes|week|semana|day|dia|periodo|period)$/i
const ID_PATTERNS      = /(_id|_pk|_uuid|^id$|^pk$|^uuid$|^code$|^codigo$|^ref$)/i
const METRIC_PATTERNS  = /^(total|sum|count|amount|qty|quantity|revenue|ingreso|venta|sale|price|precio|cost|costo|value|valor|weight|peso|rate|tasa|score|monto|importe|ganancia|profit|loss|perdida|unidades|units)$/i
const BOOL_VALUES      = new Set(['true','false','1','0','yes','no','si','sí','verdadero','falso'])

// Detecta si un string es una fecha ISO o fecha de negocio común
const ISO_DATE_RE      = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/
const YEAR_MONTH_RE    = /^\d{4}-(0[1-9]|1[0-2])$/
const YEAR_ONLY_RE     = /^(19|20)\d{2}$/
const ES_DATE_RE       = /^\d{2}[\/.-]\d{2}[\/.-]\d{4}$/

function isDateLike(v: string): boolean {
  return ISO_DATE_RE.test(v) || YEAR_MONTH_RE.test(v) || YEAR_ONLY_RE.test(v) || ES_DATE_RE.test(v)
}

function detectRole(
  name:           string,
  numericRatio:   number,
  cardinalityRatio: number,
  uniqueCount:    number,
  totalCount:     number,
  dateLikeRatio:  number,
  sampleValues:   unknown[],
): FieldRole {
  // 1 — ID: patrón de nombre explícito
  if (ID_PATTERNS.test(name)) return 'ID'

  // 2 — TIME: nombre de tiempo O dateLikeRatio alto
  if (TIME_PATTERNS.test(name) || dateLikeRatio > 0.8) return 'TIME'

  // 3 — BOOLEAN: ≤2 valores únicos con valores booleanos canónicos
  if (uniqueCount <= 2) {
    const strVals = sampleValues.map((v) => String(v).toLowerCase())
    if (strVals.every((v) => BOOL_VALUES.has(v))) return 'BOOLEAN'
  }

  // 4 — METRIC: mayoría numérica + nombre de métrica O cardinalidad alta
  if (numericRatio >= 0.85) {
    if (METRIC_PATTERNS.test(name) || cardinalityRatio > 0.5) return 'METRIC'
    // numérico con baja cardinalidad → puede ser DIMENSION (ej: año, código)
    if (cardinalityRatio < 0.15 && uniqueCount <= 30) return 'DIMENSION'
    return 'METRIC'
  }

  // 5 — DIMENSION: baja cardinalidad, no numérico
  if (cardinalityRatio < 0.15 && uniqueCount <= 50) return 'DIMENSION'

  // 6 — TEXT: alta cardinalidad, string
  return 'TEXT'
}

export function analyzeField(
  name:   string,
  values: unknown[],
): FieldMeta {
  const totalCount  = values.length
  const nonNull     = values.filter((v) => v !== null && v !== undefined && v !== '')
  const nullRatio   = 1 - nonNull.length / totalCount

  // Intentar parsear como número
  const numericCount = nonNull.filter((v) => !isNaN(parseFloat(String(v))) && isFinite(Number(v))).length
  const numericRatio = nonNull.length > 0 ? numericCount / nonNull.length : 0

  // Valores únicos
  const uniqueSet   = new Set(nonNull.map((v) => String(v)))
  const uniqueCount = uniqueSet.size
  const cardinalityRatio = totalCount > 0 ? uniqueCount / totalCount : 0

  // Detección de fecha
  const strVals     = nonNull.map((v) => String(v))
  const dateLikeCount = strVals.filter(isDateLike).length
  const dateLikeRatio = nonNull.length > 0 ? dateLikeCount / nonNull.length : 0

  // dtype predominante
  const boolCount   = nonNull.filter((v) => typeof v === 'boolean').length
  const strCount    = nonNull.filter((v) => typeof v === 'string').length
  const numCount    = nonNull.filter((v) => typeof v === 'number').length
  let dtype: FieldMeta['dtype'] = 'mixed'
  if (nonNull.length === 0)           dtype = 'null'
  else if (boolCount === nonNull.length) dtype = 'boolean'
  else if (numCount  >= nonNull.length * 0.9) dtype = 'number'
  else if (strCount  >= nonNull.length * 0.9) dtype = 'string'

  // Estadísticas numéricas
  let min: number | undefined
  let max: number | undefined
  let mean: number | undefined
  if (numericRatio >= 0.85) {
    const nums = nonNull.map((v) => parseFloat(String(v))).filter((n) => !isNaN(n))
    if (nums.length > 0) {
      min  = Math.min(...nums)
      max  = Math.max(...nums)
      mean = nums.reduce((a, b) => a + b, 0) / nums.length
    }
  }

  // Sample valores (máx 5)
  const sampleValues = [...uniqueSet].slice(0, 5)

  const role = detectRole(name, numericRatio, cardinalityRatio, uniqueCount, totalCount, dateLikeRatio, sampleValues)

  return {
    name, role, dtype, nullRatio, numericRatio,
    uniqueCount, totalCount, cardinalityRatio,
    sampleValues, min, max, mean,
  }
}
