/**
 * forecast.ts — forecasting sin LLM, pure TypeScript (Q8 deep research).
 *
 * Algoritmos:
 *   1. SMA  — Simple Moving Average
 *   2. WMA  — Weighted Moving Average
 *   3. ETS  — Simple Exponential Smoothing (Holt)
 *   4. Holt-Winters — Triple Exponential Smoothing (trend + estacionalidad)
 *
 * Todos retornan ForecastResult con puntos históricos + proyección.
 */

export interface ForecastPoint {
  index:      number
  value:      number
  predicted?: number
  isForcast:  boolean   // true = punto proyectado
  lower95?:   number    // intervalo de confianza 95%
  upper95?:   number
}

export interface ForecastResult {
  points:     ForecastPoint[]
  method:     'sma' | 'wma' | 'ets' | 'holt_winters'
  horizon:    number
  mape?:      number    // error en datos históricos
  rmse?:      number
}

// ── Utilidades ─────────────────────────────────────────────────────────────────
function mape(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length)
  if (n === 0) return 0
  let sum = 0
  for (let i = 0; i < n; i++) {
    if (actual[i] !== 0) sum += Math.abs((actual[i] - predicted[i]) / actual[i])
  }
  return (sum / n) * 100
}

function rmse(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length)
  if (n === 0) return 0
  const sum = actual.slice(0, n).reduce((acc, v, i) => acc + (v - predicted[i]) ** 2, 0)
  return Math.sqrt(sum / n)
}

function stdDev(arr: number[]): number {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length)
}

// ── 1. SMA ─────────────────────────────────────────────────────────────────
export function forecastSMA(
  values:  number[],
  window:  number = 3,
  horizon: number = 5,
): ForecastResult {
  if (values.length < window) {
    return { points: values.map((v, i) => ({ index: i, value: v, isForcast: false })), method: 'sma', horizon }
  }

  const predicted: number[] = []
  for (let i = window - 1; i < values.length; i++) {
    const slice = values.slice(i - window + 1, i + 1)
    predicted.push(slice.reduce((a, b) => a + b, 0) / window)
  }

  const lastWindow = values.slice(-window)
  const lastAvg    = lastWindow.reduce((a, b) => a + b, 0) / window
  const sd         = stdDev(predicted) * 1.96

  const points: ForecastPoint[] = values.map((v, i) => ({
    index: i, value: v,
    predicted: i >= window - 1 ? predicted[i - (window - 1)] : undefined,
    isForcast: false,
  }))

  for (let h = 1; h <= horizon; h++) {
    points.push({
      index:    values.length + h - 1,
      value:    lastAvg,
      isForcast: true,
      lower95:  lastAvg - sd,
      upper95:  lastAvg + sd,
    })
  }

  return {
    points,
    method:  'sma',
    horizon,
    mape:    mape(values.slice(window - 1), predicted),
    rmse:    rmse(values.slice(window - 1), predicted),
  }
}

// ── 2. ETS (Holt — trend) ───────────────────────────────────────────────────
export function forecastETS(
  values:  number[],
  alpha:   number = 0.3,   // suavizado nivel (0-1)
  beta:    number = 0.1,   // suavizado trend (0-1)
  horizon: number = 5,
): ForecastResult {
  if (values.length < 2) {
    return { points: values.map((v, i) => ({ index: i, value: v, isForcast: false })), method: 'ets', horizon }
  }

  let level = values[0]
  let trend = values[1] - values[0]
  const predicted: number[] = []

  for (let i = 0; i < values.length; i++) {
    const forecast = level + trend
    predicted.push(forecast)
    const prevLevel = level
    level = alpha * values[i] + (1 - alpha) * (level + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
  }

  const sd = stdDev(values.map((v, i) => v - predicted[i])) * 1.96

  const points: ForecastPoint[] = values.map((v, i) => ({
    index: i, value: v, predicted: predicted[i], isForcast: false,
  }))

  for (let h = 1; h <= horizon; h++) {
    const proj = level + h * trend
    points.push({
      index:    values.length + h - 1,
      value:    proj,
      isForcast: true,
      lower95:  proj - sd * Math.sqrt(h),
      upper95:  proj + sd * Math.sqrt(h),
    })
  }

  return {
    points,
    method: 'ets',
    horizon,
    mape:   mape(values, predicted),
    rmse:   rmse(values, predicted),
  }
}

// ── 3. Holt-Winters (Triple ES) ────────────────────────────────────────────────
export function forecastHoltWinters(
  values:   number[],
  season:   number = 12,   // período estacional (12=mensual, 4=trimestral)
  alpha:    number = 0.3,
  beta:     number = 0.1,
  gamma:    number = 0.2,
  horizon:  number = season,
): ForecastResult {
  if (values.length < 2 * season) {
    // Fallback a ETS si no hay suficientes datos para estacionalidad
    return { ...forecastETS(values, alpha, beta, horizon), method: 'holt_winters' }
  }

  // Inicializar componentes
  let level = values.slice(0, season).reduce((a, b) => a + b, 0) / season
  let trend = (
    values.slice(season, 2 * season).reduce((a, b) => a + b, 0) / season -
    values.slice(0, season).reduce((a, b) => a + b, 0) / season
  ) / season

  const seasonal: number[] = values.slice(0, season).map((v) => v / level)
  const predicted: number[] = []

  for (let i = 0; i < values.length; i++) {
    const s       = seasonal[i % season]
    const forecast = (level + trend) * s
    predicted.push(forecast)

    const prevLevel = level
    level   = alpha * (values[i] / s) + (1 - alpha) * (level + trend)
    trend   = beta  * (level - prevLevel) + (1 - beta) * trend
    seasonal[i % season] = gamma * (values[i] / level) + (1 - gamma) * s
  }

  const sd = stdDev(values.map((v, i) => v - predicted[i])) * 1.96

  const points: ForecastPoint[] = values.map((v, i) => ({
    index: i, value: v, predicted: predicted[i], isForcast: false,
  }))

  for (let h = 1; h <= horizon; h++) {
    const s    = seasonal[(values.length + h - 1) % season]
    const proj = (level + h * trend) * s
    points.push({
      index:    values.length + h - 1,
      value:    proj,
      isForcast: true,
      lower95:  proj - sd * Math.sqrt(h),
      upper95:  proj + sd * Math.sqrt(h),
    })
  }

  return {
    points,
    method:  'holt_winters',
    horizon,
    mape:    mape(values, predicted),
    rmse:    rmse(values, predicted),
  }
}

// ── Auto-select: elige el mejor algoritmo según datos ───────────────────────
export function autoForecast(
  values:  number[],
  horizon: number = 5,
): ForecastResult {
  if (values.length < 8)  return forecastSMA(values, 3, horizon)
  if (values.length < 24) return forecastETS(values, 0.3, 0.1, horizon)
  // Con ≥24 puntos intentar Holt-Winters con season=12
  const hw = forecastHoltWinters(values, 12, 0.3, 0.1, 0.2, horizon)
  return hw
}
