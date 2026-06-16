/**
 * infer-schema.js — Inferencia automática de tipos de columna.
 * Sin LLM. Basado en análisis estadístico:
 *   - ratio numérico
 *   - cardinalidad relativa
 *   - patrones de nombre de campo
 *   - detección de fechas
 */

const TIME_PATTERNS  = /date|fecha|time|tiempo|mes|month|year|año|periodo|semana|week|dia|day|ts|timestamp/i
const ID_PATTERNS    = /^id$|_id$|^id_|codigo|code|sku|uuid|key$/i
const METRIC_NAMES   = /total|monto|amount|revenue|ingreso|ventas|sales|price|precio|costo|cost|qty|cantidad|units|count|suma|promedio|avg|avg_|rate|tasa|score|value|valor|profit|ganancia|gasto|expense/i
const DIM_NAMES      = /nombre|name|categoria|category|tipo|type|region|zone|zona|estado|status|country|pais|ciudad|city|producto|product|cliente|customer|usuario|user|grupo|group|marca|brand|departamento|dept|canal|channel/i

/**
 * Infiere el schema de un array de filas.
 * @param {Object[]} rows
 * @returns {Array<{field, type, sample}>}
 */
export function inferSchema(rows) {
  if (!rows || rows.length === 0) return []
  const keys = Object.keys(rows[0])
  const n = rows.length

  return keys.map(field => {
    const values  = rows.map(r => r[field]).filter(v => v !== null && v !== undefined && v !== '')
    const type    = inferType(field, values, n)
    const sample  = values.slice(0, 3).join(', ')
    return { field, type, sample }
  })
}

function inferType(field, values, total) {
  if (values.length === 0) return 'TEXT'

  // 1. Patrón de nombre → ID
  if (ID_PATTERNS.test(field)) return 'ID'

  // 2. Patrón de nombre → TIME
  if (TIME_PATTERNS.test(field)) return 'TIME'

  // 3. Ratio numérico
  const numCount = values.filter(v => typeof v === 'number' || !isNaN(Number(v))).length
  const numRatio = numCount / values.length

  // 4. Cardinalidad relativa
  const uniq = new Set(values).size
  const cardRatio = uniq / total

  // 5. Detección de fechas por valor
  if (numRatio < 0.5 && looksLikeDate(values)) return 'TIME'

  // 6. Nombre → METRIC
  if (METRIC_NAMES.test(field) && numRatio > 0.7) return 'METRIC'

  // 7. Alta numerosidad + alta cardinalidad → METRIC
  if (numRatio > 0.85 && cardRatio > 0.3) return 'METRIC'

  // 8. Alta numerosidad + baja cardinalidad → DIMENSION (ej: año 2023, 2024)
  if (numRatio > 0.85 && cardRatio <= 0.1) return 'DIMENSION'

  // 9. Nombre → DIMENSION
  if (DIM_NAMES.test(field)) return 'DIMENSION'

  // 10. Baja cardinalidad → DIMENSION
  if (cardRatio < 0.15 && uniq <= 30) return 'DIMENSION'

  // 11. Muy alta cardinalidad de strings → TEXT
  if (numRatio < 0.3 && cardRatio > 0.7) return 'TEXT'

  return 'DIMENSION'
}

const DATE_RE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{4}|^\d{4}[-/]\d{2}$/
function looksLikeDate(values) {
  const sample = values.slice(0, 20)
  const hits = sample.filter(v => DATE_RE.test(String(v))).length
  return hits / sample.length > 0.5
}
