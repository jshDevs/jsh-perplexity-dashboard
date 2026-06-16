/**
 * anomaly.js — Detección de anomalías sin ML.
 * Algoritmos: IQR, Z-score modificado (MAD), CUSUM básico.
 * Retorna índices de filas anómalas y metadatos.
 */

/**
 * IQR — Interquartile Range
 * @param {number[]} values
 * @param {number}   multiplier  default 1.5
 * @returns {{ outliers: number[], q1, q3, iqr, lower, upper }}
 */
export function iqrOutliers(values, multiplier = 1.5) {
  const sorted = [...values].filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b)
  if (sorted.length < 4) return { outliers: [], q1: 0, q3: 0, iqr: 0, lower: 0, upper: 0 }

  const q1 = percentile(sorted, 25)
  const q3 = percentile(sorted, 75)
  const iqr   = q3 - q1
  const lower = q1 - multiplier * iqr
  const upper = q3 + multiplier * iqr

  const outliers = values
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => typeof v === 'number' && !isNaN(v) && (v < lower || v > upper))
    .map(({ i }) => i)

  return { outliers, q1, q3, iqr, lower, upper }
}

/**
 * Modified Z-score usando MAD (Median Absolute Deviation)
 * Más robusto que Z-score clásico para distribuciones no normales.
 * @param {number[]} values
 * @param {number}   threshold  default 3.5
 */
export function madOutliers(values, threshold = 3.5) {
  const nums   = values.filter(v => typeof v === 'number' && !isNaN(v))
  const median = percentile([...nums].sort((a, b) => a - b), 50)
  const diffs  = nums.map(v => Math.abs(v - median))
  const mad    = percentile([...diffs].sort((a, b) => a - b), 50)

  // Si MAD = 0, fallback a IQR
  if (mad === 0) return iqrOutliers(values)

  const outliers = values
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => {
      if (typeof v !== 'number' || isNaN(v)) return false
      const mz = 0.6745 * Math.abs(v - median) / mad
      return mz > threshold
    })
    .map(({ i }) => i)

  return { outliers, median, mad }
}

/**
 * CUSUM — Detección de cambios de nivel en series temporales.
 * @param {number[]} values
 * @param {number}   k   slack (default 0.5 * std)
 * @param {number}   h   umbral (default 5 * std)
 * @returns {{ changePoints: number[] }}
 */
export function cusum(values, k, h) {
  const nums = values.filter(v => typeof v === 'number' && !isNaN(v))
  if (nums.length < 5) return { changePoints: [] }

  const mean = nums.reduce((s, v) => s + v, 0) / nums.length
  const std  = Math.sqrt(nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length)

  k = k ?? 0.5 * std
  h = h ?? 5  * std

  let cuP = 0, cuN = 0
  const changePoints = []

  values.forEach((v, i) => {
    if (typeof v !== 'number' || isNaN(v)) return
    cuP = Math.max(0, cuP + v - mean - k)
    cuN = Math.max(0, cuN - v + mean - k)
    if (cuP > h || cuN > h) {
      changePoints.push(i)
      cuP = 0; cuN = 0  // reset
    }
  })

  return { changePoints, mean, std, k, h }
}

/**
 * Analiza un dataset completo y retorna anomalías por columna METRIC.
 * @param {Object[]} rows
 * @param {Array<{field,type}>} schema
 * @returns {Object}  { [field]: { iqr: [], mad: [], cusum: [] } }
 */
export function analyzeAnomalies(rows, schema) {
  const result = {}
  schema
    .filter(s => s.type === 'METRIC')
    .forEach(({ field }) => {
      const values = rows.map(r => r[field])
      result[field] = {
        iqr:   iqrOutliers(values).outliers,
        mad:   madOutliers(values).outliers,
        cusum: cusum(values).changePoints,
      }
    })
  return result
}

// Cálculo de percentil
function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1)
  const lo  = Math.floor(idx)
  const hi  = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}
