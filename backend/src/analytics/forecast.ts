/**
 * forecast.ts — algoritmos de forecasting sin dependencias externas (Q8).
 *
 * Implementados:
 *   SMA   — Simple Moving Average
 *   WMA   — Weighted Moving Average
 *   ETS   — Simple Exponential Smoothing (nivel)
 *   HW    — Holt-Winters Triple Exponential Smoothing (nivel+tendencia+estacionalidad)
 *
 * Todos devuelven ForecastResult con:
 *   fitted[]    — valores ajustados sobre el histórico
 *   forecast[]  — proyección futura (h pasos)
 *   metrics     — MAPE, RMSE, MAE calculados sobre fitted
 */

export interface ForecastResult {
  method:    string
  fitted:    number[]       // longitud === values.length
  forecast:  number[]       // longitud === h
  metrics:   ForecastMetrics
  params:    Record<string, number>
}

export interface ForecastMetrics {
  mape: number    // Mean Absolute Percentage Error (%)
  rmse: number    // Root Mean Square Error
  mae:  number    // Mean Absolute Error
}

// ─── Métricas ────────────────────────────────────────────────────────────────────

function calcMetrics(actual: number[], fitted: number[]): ForecastMetrics {
  const n    = actual.length
  let sumAbs = 0, sumSq = 0, sumPct = 0, validPct = 0

  for (let i = 0; i < n; i++) {
    const err = actual[i] - fitted[i]
    sumAbs += Math.abs(err)
    sumSq  += err ** 2
    if (actual[i] !== 0) {
      sumPct += Math.abs(err / actual[i]) * 100
      validPct++
    }
  }

  return {
    mape: validPct > 0 ? sumPct / validPct : Infinity,
    rmse: Math.sqrt(sumSq / n),
    mae:  sumAbs / n,
  }
}

// ─── SMA ──────────────────────────────────────────────────────────────────────

export function forecastSMA(
  values:  number[],
  window:  number = 3,
  h:       number = 6,
): ForecastResult {
  const fitted: number[] = []

  for (let i = 0; i < values.length; i++) {
    if (i < window) {
      fitted.push(values.slice(0, i + 1).reduce((s, v) => s + v, 0) / (i + 1))
    } else {
      fitted.push(values.slice(i - window, i).reduce((s, v) => s + v, 0) / window)
    }
  }

  // Proyección: la última ventana se propaga como valor constante
  const lastWindow = values.slice(-window)
  const lastMa     = lastWindow.reduce((s, v) => s + v, 0) / lastWindow.length
  const forecast   = Array(h).fill(lastMa)

  return {
    method:   'SMA',
    fitted,
    forecast,
    metrics:  calcMetrics(values, fitted),
    params:   { window, h },
  }
}

// ─── WMA ──────────────────────────────────────────────────────────────────────

export function forecastWMA(
  values:  number[],
  window:  number = 3,
  h:       number = 6,
): ForecastResult {
  // Pesos lineales: más reciente tiene mayor peso
  const weights = Array.from({ length: window }, (_, i) => i + 1)
  const wSum    = weights.reduce((s, w) => s + w, 0)

  const fitted: number[] = []

  for (let i = 0; i < values.length; i++) {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1)
    const w     = weights.slice(weights.length - slice.length)
    const wS    = w.reduce((s, x) => s + x, 0)
    fitted.push(slice.reduce((s, v, j) => s + v * w[j], 0) / wS)
  }

  const lastSlice  = values.slice(-window)
  const lastForecast = lastSlice.reduce((s, v, j) => s + v * weights[j], 0) / wSum
  const forecast   = Array(h).fill(lastForecast)

  return {
    method:  'WMA',
    fitted,
    forecast,
    metrics: calcMetrics(values, fitted),
    params:  { window, h },
  }
}

// ─── ETS (Simple Exponential Smoothing) ──────────────────────────────────────────
/**
 * S_t = α * x_t + (1-α) * S_{t-1}
 * Forecast: último S_t replicado (nivel constante)
 */
export function forecastETS(
  values:  number[],
  alpha:   number = 0.3,
  h:       number = 6,
): ForecastResult {
  if (alpha <= 0 || alpha >= 1) throw new Error('alpha debe estar en (0,1)')

  const fitted: number[] = [values[0]]
  for (let i = 1; i < values.length; i++) {
    fitted.push(alpha * values[i] + (1 - alpha) * fitted[i - 1])
  }

  const lastS  = fitted[fitted.length - 1]
  const forecast = Array(h).fill(lastS)

  return {
    method:  'ETS',
    fitted,
    forecast,
    metrics: calcMetrics(values, fitted),
    params:  { alpha, h },
  }
}

// ─── Holt-Winters (Triple Exponential Smoothing) ───────────────────────────────────
/**
 * Nivel: L_t = α*(x_t/S_{t-m}) + (1-α)*(L_{t-1}+T_{t-1})
 * Tendencia: T_t = β*(L_t - L_{t-1}) + (1-β)*T_{t-1}
 * Estacional: S_t = γ*(x_t/L_t) + (1-γ)*S_{t-m}
 * Forecast: (L_n + k*T_n) * S_{n-m+k}
 */
export function forecastHoltWinters(
  values:  number[],
  season:  number = 12,   // periodo estacional (12=mensual, 4=trimestral)
  alpha:   number = 0.3,
  beta:    number = 0.1,
  gamma:   number = 0.2,
  h:       number = 12,
): ForecastResult {
  if (values.length < 2 * season) {
    // Fallback a ETS si no hay suficiente historia
    return { ...forecastETS(values, alpha, h), method: 'HW-fallback-ETS', params: { alpha, h, season } }
  }

  // Inicialización
  let L = values.slice(0, season).reduce((s, v) => s + v, 0) / season
  let T = (
    values.slice(season, 2 * season).reduce((s, v) => s + v, 0) / season -
    values.slice(0, season).reduce((s, v) => s + v, 0) / season
  ) / season

  const S: number[] = []
  const firstSeasonMean = values.slice(0, season).reduce((s, v) => s + v, 0) / season
  for (let i = 0; i < season; i++) {
    S.push(values[i] / (firstSeasonMean || 1))
  }

  const fitted: number[] = []

  for (let t = 0; t < values.length; t++) {
    const si   = S[t % season]
    const x    = values[t]
    const Lprev = L
    L = alpha * (x / (si || 1)) + (1 - alpha) * (L + T)
    T = beta  * (L - Lprev)     + (1 - beta) * T
    S[t % season] = gamma * (x / (L || 1)) + (1 - gamma) * si
    fitted.push((Lprev + T) * si)
  }

  const forecast: number[] = []
  for (let k = 1; k <= h; k++) {
    const si = S[(values.length - season + k - 1) % season] ?? 1
    forecast.push((L + k * T) * si)
  }

  return {
    method:  'Holt-Winters',
    fitted,
    forecast,
    metrics: calcMetrics(values, fitted),
    params:  { alpha, beta, gamma, season, h },
  }
}

// ─── Orquestador ───────────────────────────────────────────────────────────────────

export type ForecastMethod = 'sma' | 'wma' | 'ets' | 'hw'

export function runForecast(
  values:  number[],
  method:  ForecastMethod = 'ets',
  h:       number = 6,
  options: Record<string, number> = {},
): ForecastResult {
  if (values.length < 3) {
    return {
      method: 'insufficient-data',
      fitted: [], forecast: [],
      metrics: { mape: Infinity, rmse: Infinity, mae: Infinity },
      params: {},
    }
  }
  switch (method) {
    case 'sma': return forecastSMA(values, options.window ?? 3, h)
    case 'wma': return forecastWMA(values, options.window ?? 3, h)
    case 'ets': return forecastETS(values, options.alpha  ?? 0.3, h)
    case 'hw':  return forecastHoltWinters(
      values,
      options.season ?? 12,
      options.alpha  ?? 0.3,
      options.beta   ?? 0.1,
      options.gamma  ?? 0.2,
      h,
    )
    default: return forecastETS(values, 0.3, h)
  }
}
