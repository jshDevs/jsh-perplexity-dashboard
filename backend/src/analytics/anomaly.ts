/**
 * anomaly.ts — detección de anomalías sin ML (Q7 del deep research).
 *
 * Algoritmos implementados:
 *   1. IQR  — Interquartile Range (robusto a outliers, no asume distribución)
 *   2. MAD  — Modified Z-score con Median Absolute Deviation
 *   3. CUSUM — Cumulative Sum Control Chart (series temporales)
 *
 * Todos son O(n log n) o O(n) puro, sin dependencias externas.
 */

export interface AnomalyPoint {
  index:  number
  value:  number
  score:  number          // severidad relativa 0–1
  method: 'iqr' | 'mad' | 'cusum'
  label:  string          // descripción legible
}

export interface AnomalyResult {
  anomalies:  AnomalyPoint[]
  stats:      Record<string, number>
  method:     string
}

// ─── Utilidades estadísticas ────────────────────────────────────────────────────

function sortedCopy(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b)
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const lo  = Math.floor(pos)
  const hi  = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

function median(sorted: number[]): number {
  return quantile(sorted, 0.5)
}

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function stddev(arr: number[], mu: number): number {
  const variance = arr.reduce((s, v) => s + (v - mu) ** 2, 0) / arr.length
  return Math.sqrt(variance)
}

// ─── 1. IQR ────────────────────────────────────────────────────────────────────
/**
 * IQR Outlier Detection.
 * Outlier si: value < Q1 - k*IQR  OR  value > Q3 + k*IQR
 * k = 1.5 (leve) | 3.0 (extremo). Default k=1.5.
 */
export function detectIQR(
  values: number[],
  k:      number = 1.5,
): AnomalyResult {
  const sorted = sortedCopy(values)
  const q1     = quantile(sorted, 0.25)
  const q3     = quantile(sorted, 0.75)
  const iqr    = q3 - q1
  const lower  = q1 - k * iqr
  const upper  = q3 + k * iqr

  const anomalies: AnomalyPoint[] = values
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v < lower || v > upper)
    .map(({ v, i }) => {
      const dist  = v < lower ? lower - v : v - upper
      const score = Math.min(dist / (iqr || 1), 1)
      return {
        index:  i,
        value:  v,
        score,
        method: 'iqr' as const,
        label:  v > upper ? `Alto (>${upper.toFixed(2)})` : `Bajo (<${lower.toFixed(2)})`,
      }
    })

  return {
    anomalies,
    stats: { q1, q3, iqr, lower, upper, k },
    method: 'IQR',
  }
}

// ─── 2. Modified Z-score (MAD) ────────────────────────────────────────────────────
/**
 * Modified Z-score usando MAD (Median Absolute Deviation).
 * M_i = 0.6745 * (x_i - median) / MAD
 * Anomalía si |M_i| > threshold (default 3.5, Iglewicz & Hoaglin 1993).
 * Más robusto que Z-score clásico porque usa mediana en vez de media.
 */
export function detectMAD(
  values:    number[],
  threshold: number = 3.5,
): AnomalyResult {
  const sorted  = sortedCopy(values)
  const med     = median(sorted)
  const absDevs = values.map((v) => Math.abs(v - med))
  const mad     = median(sortedCopy(absDevs))

  // Si MAD = 0 (todos los valores iguales), usar stddev como fallback
  const scale   = mad !== 0 ? mad : (stddev(values, mean(values)) || 1)

  const anomalies: AnomalyPoint[] = values
    .map((v, i) => {
      const mScore = Math.abs(0.6745 * (v - med) / scale)
      return { i, v, mScore }
    })
    .filter(({ mScore }) => mScore > threshold)
    .map(({ i, v, mScore }) => ({
      index:  i,
      value:  v,
      score:  Math.min(mScore / (threshold * 2), 1),
      method: 'mad' as const,
      label:  `Z-mod: ${mScore.toFixed(2)} (umbral ${threshold})`,
    }))

  return {
    anomalies,
    stats: { median: med, mad, scale, threshold },
    method: 'Modified Z-score (MAD)',
  }
}

// ─── 3. CUSUM ────────────────────────────────────────────────────────────────────
/**
 * CUSUM — Cumulative Sum Control Chart.
 * Detecta cambios sostenidos en la media (drift) en series temporales.
 * S+ = max(0, S+_prev + (x - (mu + k)))
 * S- = max(0, S-_prev - (x - (mu - k)))
 * Alarma cuando S+ > h  o  S- > h
 *
 * Parámetros estándar:
 *   k = 0.5 * sigma (allowance / slack)
 *   h = 4 * sigma   (decision interval)
 */
export function detectCUSUM(
  values: number[],
  kFactor: number = 0.5,
  hFactor: number = 4.0,
): AnomalyResult {
  const mu    = mean(values)
  const sigma = stddev(values, mu) || 1
  const k     = kFactor * sigma
  const h     = hFactor * sigma

  let sPlus  = 0
  let sMinus = 0
  const anomalies: AnomalyPoint[] = []

  values.forEach((v, i) => {
    sPlus  = Math.max(0, sPlus  + (v - mu - k))
    sMinus = Math.max(0, sMinus - (v - mu + k))

    if (sPlus > h || sMinus > h) {
      const score = Math.min(Math.max(sPlus, sMinus) / (h * 2), 1)
      anomalies.push({
        index:  i,
        value:  v,
        score,
        method: 'cusum',
        label:  `CUSUM S+=${sPlus.toFixed(2)} S-=${sMinus.toFixed(2)} (h=${h.toFixed(2)})`,
      })
      // Reset tras alarma
      sPlus  = 0
      sMinus = 0
    }
  })

  return {
    anomalies,
    stats: { mu, sigma, k, h, kFactor, hFactor },
    method: 'CUSUM',
  }
}

// ─── Orquestador ───────────────────────────────────────────────────────────────────

export type AnomalyMethod = 'iqr' | 'mad' | 'cusum' | 'all'

export function detectAnomalies(
  values:  number[],
  method:  AnomalyMethod = 'mad',
  options: Record<string, number> = {},
): AnomalyResult {
  if (values.length < 4) {
    return { anomalies: [], stats: {}, method: 'insufficient-data' }
  }

  switch (method) {
    case 'iqr':   return detectIQR(values,   options.k ?? 1.5)
    case 'mad':   return detectMAD(values,   options.threshold ?? 3.5)
    case 'cusum': return detectCUSUM(values, options.k ?? 0.5, options.h ?? 4.0)
    case 'all': {
      // Unión de anomalías detectadas por los 3 métodos
      const iqr   = detectIQR(values)
      const mad   = detectMAD(values)
      const cusum = detectCUSUM(values)
      const seen  = new Set<number>()
      const combined: AnomalyPoint[] = []
      for (const r of [iqr, mad, cusum]) {
        r.anomalies.forEach((a) => {
          if (!seen.has(a.index)) { seen.add(a.index); combined.push(a) }
        })
      }
      combined.sort((a, b) => a.index - b.index)
      return { anomalies: combined, stats: {}, method: 'all' }
    }
    default: return detectMAD(values)
  }
}
