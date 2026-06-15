/**
 * Holt-Winters Triple Exponential Smoothing
 * Ported from jsh-perplexity-dashboard PHP implementation to TypeScript.
 * Zero external dependencies.
 */

export interface ForecastResult {
  algorithm:      string
  smoothed:       number[]
  forecast:       number[]
  forecast_count: number
  accuracy: { mape: number; rmse: number }
}

function sma(values: number[], window: number): number[] {
  return values.map((_, i) =>
    i < window - 1
      ? values.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1)
      : values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0) / window
  )
}

function mape(actual: number[], predicted: number[]): number {
  const pairs = actual.map((a, i) => ({ a, p: predicted[i] })).filter(({ a }) => a !== 0)
  if (!pairs.length) return 0
  return pairs.reduce((s, { a, p }) => s + Math.abs((a - p) / a), 0) / pairs.length * 100
}

function rmse(actual: number[], predicted: number[]): number {
  const mse = actual.reduce((s, a, i) => s + Math.pow(a - predicted[i], 2), 0) / actual.length
  return Math.sqrt(mse)
}

export function holtWinters(
  values: number[],
  season  = 12,
  horizon = 12,
  alpha   = 0.3,
  beta    = 0.1,
  gamma   = 0.2
): ForecastResult {
  if (values.length < season * 2) {
    // Fallback: SMA
    const window  = Math.min(7, values.length)
    const smoothed = sma(values, window)
    const last     = values[values.length - 1]
    const forecast = Array.from({ length: horizon }, () => last)
    return {
      algorithm:      'sma',
      smoothed,
      forecast,
      forecast_count: horizon,
      accuracy:       { mape: mape(values.slice(window), smoothed.slice(window)), rmse: rmse(values.slice(window), smoothed.slice(window)) },
    }
  }

  // Initial components
  let level  = values.slice(0, season).reduce((a, b) => a + b, 0) / season
  let trend  = (values.slice(season, season * 2).reduce((a, b) => a + b, 0) / season -
               values.slice(0, season).reduce((a, b) => a + b, 0) / season) / season
  const seasonal = Array.from({ length: season }, (_, i) => {
    const avg = values.slice(0, season).reduce((a, b) => a + b, 0) / season
    return avg !== 0 ? values[i] / avg : 1
  })

  const smoothed: number[] = []
  for (let i = 0; i < values.length; i++) {
    const si    = i % season
    const prevL = level
    const prevT = trend
    level        = alpha * (values[i] / seasonal[si]) + (1 - alpha) * (prevL + prevT)
    trend        = beta  * (level - prevL)             + (1 - beta)  * prevT
    seasonal[si] = gamma * (values[i] / level)         + (1 - gamma) * seasonal[si]
    smoothed.push((prevL + prevT) * seasonal[si])
  }

  const forecast: number[] = []
  for (let h = 1; h <= horizon; h++) {
    const si = (values.length + h - 1) % season
    forecast.push((level + trend * h) * seasonal[si])
  }

  return {
    algorithm:      'holt-winters',
    smoothed,
    forecast,
    forecast_count: horizon,
    accuracy:       { mape: mape(values.slice(season), smoothed.slice(season)), rmse: rmse(values.slice(season), smoothed.slice(season)) },
  }
}
