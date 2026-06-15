/**
 * anomaly.ts — detección de anomalías sin ML, pure TypeScript.
 *
 * Algoritmos implementados (Q7 del deep research):
 *   1. IQR  — Interquartile Range (robusto a skew)
 *   2. Z-score modificado (MAD) — más robusto que Z clásico
 *   3. CUSUM — Cumulative Sum para deriva en series temporales
 *
 * Todos retornan AnomalyResult[] con índice, valor y severidad.
 */

export interface AnomalyResult {
  index:    number
  value:    number
  method:   'iqr' | 'zscore_mad' | 'cusum'
  severity: 'low' | 'medium' | 'high'
  upper?:   number   // límite superior usado
  lower?:   number   // límite inferior usado
}

// ── Utilidades estadísticas ───────────────────────────────────────────────────

function sorted(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b)
}

function quantile(arr: number[], q: number): number {
  const s = sorted(arr)
  const pos = (s.length - 1) * q
  const lo  = Math.floor(pos)
  const hi  = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function median(arr: number[]): number {
  return quantile(arr, 0.5)
}

function mad(arr: number[]): number {
  const med = median(arr)
  return median(arr.map((x) => Math.abs(x - med)))
}

// ── 1. IQR ─────────────────────────────────────────────────────────────────
/**
 * IQR: outliers fuera de [Q1 - k*IQR, Q3 + k*IQR]
 * k=1.5 → outliers leves, k=3.0 → extremos
 */
export function detectIQR(
  values: number[],
  k: number = 1.5,
): AnomalyResult[] {
  if (values.length < 4) return []
  const q1  = quantile(values, 0.25)
  const q3  = quantile(values, 0.75)
  const iqr = q3 - q1
  const lower = q1 - k * iqr
  const upper = q3 + k * iqr

  return values
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v < lower || v > upper)
    .map(({ v, i }) => ({
      index:    i,
      value:    v,
      method:   'iqr' as const,
      severity: Math.abs(v - (v > upper ? upper : lower)) > iqr ? 'high' : 'medium',
      upper,
      lower,
    }))
}

// ── 2. Z-score modificado (MAD) ──────────────────────────────────────────────
/**
 * Modified Z-score: M_i = 0.6745 * (x_i - median) / MAD
 * Threshold: |M_i| > 3.5 (Iglewicz & Hoaglin 1993)
 */
export function detectZScoreMAD(
  values:    number[],
  threshold: number = 3.5,
): AnomalyResult[] {
  if (values.length < 4) return []
  const med  = median(values)
  const madV = mad(values)
  if (madV === 0) return []  // todos los valores son iguales

  return values
    .map((v, i) => ({ v, i, score: Math.abs(0.6745 * (v - med) / madV) }))
    .filter(({ score }) => score > threshold)
    .map(({ v, i, score }) => ({
      index:    i,
      value:    v,
      method:   'zscore_mad' as const,
      severity: score > threshold * 1.5 ? 'high' : score > threshold ? 'medium' : 'low',
    }))
}

// ── 3. CUSUM ─────────────────────────────────────────────────────────────────
/**
 * CUSUM: detecta deriva sostenida en series temporales.
 * S+ acumula desviaciones positivas, S- negativas.
 * Alarma cuando S+/S- superan el umbral h.
 *
 * Parámetros estándar: k=0.5 (slack), h=5 (umbral)
 */
export function detectCUSUM(
  values: number[],
  k: number = 0.5,
  h: number = 5,
): AnomalyResult[] {
  if (values.length < 8) return []
  const mu = mean(values)
  const sigma = Math.sqrt(values.reduce((acc, v) => acc + (v - mu) ** 2, 0) / values.length)
  if (sigma === 0) return []

  const anomalies: AnomalyResult[] = []
  let sp = 0, sn = 0

  for (let i = 0; i < values.length; i++) {
    const z = (values[i] - mu) / sigma
    sp = Math.max(0, sp + z - k)
    sn = Math.max(0, sn - z - k)

    if (sp > h || sn > h) {
      anomalies.push({
        index:    i,
        value:    values[i],
        method:   'cusum' as const,
        severity: (sp > h * 2 || sn > h * 2) ? 'high' : 'medium',
      })
    }
  }
  return anomalies
}

// ── Combinar todos los métodos (ensemble) ───────────────────────────────────
/**
 * detectAnomalies: ensemble — un índice es anomalía si
 * es detectado por ≥1 método. Severity: high si ≥2 métodos coinciden.
 */
export function detectAnomalies(values: number[]): AnomalyResult[] {
  const iqr  = detectIQR(values)
  const mad_ = detectZScoreMAD(values)
  const cus  = detectCUSUM(values)

  const all  = [...iqr, ...mad_, ...cus]
  const byIndex = new Map<number, AnomalyResult[]>()

  all.forEach((a) => {
    if (!byIndex.has(a.index)) byIndex.set(a.index, [])
    byIndex.get(a.index)!.push(a)
  })

  return [...byIndex.entries()].map(([index, hits]) => ({
    index,
    value:    hits[0].value,
    method:   hits[0].method,
    severity: hits.length >= 2 ? 'high' : hits[0].severity,
  }))
}
