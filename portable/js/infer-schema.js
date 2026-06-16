/**
 * infer-schema.js v2 — Inferencia automática de tipos de columna.
 * Sin LLM. Fase Local 2: agrega detección mejorada + relaciones semánticas.
 * Tipos: METRIC | DIMENSION | TIME | ID | TEXT | BOOLEAN
 */

const TIME_PATTERNS  = /date|fecha|time|tiempo|mes|month|year|año|periodo|semana|week|dia|day|ts|timestamp|created|updated|modified/i
const ID_PATTERNS    = /^id$|_id$|^id_|codigo|code|sku|uuid|key$|ref$|_ref$/i
const METRIC_NAMES   = /total|monto|amount|revenue|ingreso|ventas|sales|price|precio|costo|cost|qty|cantidad|units|count|suma|promedio|avg|avg_|rate|tasa|score|value|valor|profit|ganancia|gasto|expense|balance|saldo|pago|payment|descuento|discount|impuesto|tax/i
const DIM_NAMES      = /nombre|name|categoria|category|tipo|type|region|zone|zona|estado|status|country|pais|ciudad|city|producto|product|cliente|customer|usuario|user|grupo|group|marca|brand|departamento|dept|canal|channel|proveedor|supplier|tienda|store|sucursal/i
const BOOL_PATTERNS  = /activo|active|enabled|disabled|isActive|is_active|visible|flag|bool/i

/**
 * Infiere el schema de un array de filas.
 * @param {Object[]} rows
 * @returns {Array<{field, type, sample, confidence}>}
 */
export function inferSchema(rows) {
  if (!rows || rows.length === 0) return []
  const keys = Object.keys(rows[0])
  const n    = rows.length

  return keys.map(field => {
    const values = rows.map(r => r[field]).filter(v => v !== null && v !== undefined && v !== '')
    const { type, confidence } = inferType(field, values, n)
    const sample = values.slice(0, 3).join(', ')
    return { field, type, sample, confidence }
  })
}

function inferType(field, values, total) {
  if (values.length === 0) return { type: 'TEXT', confidence: 0.5 }

  // Boolean exacto
  const boolSet = new Set(['true','false','1','0','yes','no','si','sí'])
  const isBool  = values.every(v => boolSet.has(String(v).toLowerCase()))
  if (isBool) return { type: 'BOOLEAN', confidence: 0.98 }

  // ID por patrón de nombre
  if (ID_PATTERNS.test(field)) return { type: 'ID', confidence: 0.92 }

  // TIME por patrón de nombre
  if (TIME_PATTERNS.test(field)) return { type: 'TIME', confidence: 0.9 }

  // Ratio numérico
  const numCount = values.filter(v => typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== '')).length
  const numRatio = numCount / values.length

  // Cardinalidad relativa
  const uniq      = new Set(values.map(String)).size
  const cardRatio = uniq / total

  // Detección de fechas por valor
  if (numRatio < 0.5 && looksLikeDate(values)) return { type: 'TIME', confidence: 0.85 }

  // METRIC: nombre + alta numerosidad
  if (METRIC_NAMES.test(field) && numRatio > 0.7) return { type: 'METRIC', confidence: 0.9 }

  // METRIC: alta numerosidad + alta cardinalidad
  if (numRatio > 0.85 && cardRatio > 0.3) return { type: 'METRIC', confidence: 0.8 }

  // DIMENSION: alta numerosidad + baja cardinalidad (año, rating)
  if (numRatio > 0.85 && cardRatio <= 0.08) return { type: 'DIMENSION', confidence: 0.75 }

  // DIMENSION: nombre explícito
  if (DIM_NAMES.test(field)) return { type: 'DIMENSION', confidence: 0.88 }

  // DIMENSION: baja cardinalidad
  if (cardRatio < 0.15 && uniq <= 30) return { type: 'DIMENSION', confidence: 0.7 }

  // TEXT: alta cardinalidad de strings
  if (numRatio < 0.3 && cardRatio > 0.7) return { type: 'TEXT', confidence: 0.65 }

  return { type: 'DIMENSION', confidence: 0.5 }
}

const DATE_RE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{4}|^\d{4}[-/]\d{2}$/
function looksLikeDate(values) {
  const sample = values.slice(0, 20)
  const hits   = sample.filter(v => DATE_RE.test(String(v))).length
  return hits / sample.length > 0.5
}
