import { describe, it, expect } from 'vitest'
import {
  forecastSMA, forecastWMA, forecastETS,
  forecastHoltWinters, runForecast,
} from '../analytics/forecast'

// Serie de 24 meses con tendencia y estacionalidad clara
const monthly = [
  100,110,120,130,125,115,105,95,105,115,125,135,
  140,150,160,170,165,155,145,135,145,155,165,175,
]
const simple  = [10, 12, 11, 13, 14, 15, 13, 14, 16, 17, 15, 18]
const tiny    = [1, 2]

// ─── SMA ─────────────────────────────────────────────────────────────────────
describe('forecastSMA', () => {
  it('fitted tiene la misma longitud que values', () => {
    const r = forecastSMA(simple, 3, 6)
    expect(r.fitted).toHaveLength(simple.length)
  })

  it('forecast tiene longitud h', () => {
    const r = forecastSMA(simple, 3, 6)
    expect(r.forecast).toHaveLength(6)
  })

  it('MAPE es número finito', () => {
    const r = forecastSMA(simple, 3, 6)
    expect(isFinite(r.metrics.mape)).toBe(true)
  })

  it('proyección es constante (nivel plano)', () => {
    const r = forecastSMA(simple, 3, 3)
    expect(r.forecast[0]).toBeCloseTo(r.forecast[1])
    expect(r.forecast[1]).toBeCloseTo(r.forecast[2])
  })
})

// ─── WMA ─────────────────────────────────────────────────────────────────────
describe('forecastWMA', () => {
  it('fitted tiene la misma longitud que values', () => {
    const r = forecastWMA(simple, 3, 4)
    expect(r.fitted).toHaveLength(simple.length)
  })

  it('WMA da más peso al último valor (forecast ≥ promedio simple)', () => {
    const ascending = [10, 20, 30, 40, 50]
    const wma = forecastWMA(ascending, 3, 1)
    const sma = forecastSMA(ascending, 3, 1)
    expect(wma.forecast[0]).toBeGreaterThanOrEqual(sma.forecast[0])
  })
})

// ─── ETS ─────────────────────────────────────────────────────────────────────
describe('forecastETS', () => {
  it('lanza error si alpha fuera de (0,1)', () => {
    expect(() => forecastETS(simple, 0)).toThrow()
    expect(() => forecastETS(simple, 1)).toThrow()
  })

  it('fitted converge hacia los valores reales', () => {
    const r = forecastETS(simple, 0.9, 1)
    // Con alpha alto, fitted debe acercarse bastante al valor real
    expect(r.metrics.mae).toBeLessThan(5)
  })

  it('forecast es constante (nivel sin tendencia)', () => {
    const r = forecastETS(simple, 0.3, 4)
    expect(r.forecast.every(v => Math.abs(v - r.forecast[0]) < 0.001)).toBe(true)
  })
})

// ─── Holt-Winters ────────────────────────────────────────────────────────────────
describe('forecastHoltWinters', () => {
  it('fitted tiene la misma longitud que values', () => {
    const r = forecastHoltWinters(monthly, 12)
    expect(r.fitted).toHaveLength(monthly.length)
  })

  it('forecast tiene longitud h', () => {
    const r = forecastHoltWinters(monthly, 12, 0.3, 0.1, 0.2, 12)
    expect(r.forecast).toHaveLength(12)
  })

  it('MAPE sobre serie mensual < 30%', () => {
    const r = forecastHoltWinters(monthly, 12)
    expect(r.metrics.mape).toBeLessThan(30)
  })

  it('fallback a ETS si no hay suficiente historia', () => {
    const r = forecastHoltWinters([1,2,3,4,5], 12)
    expect(r.method).toContain('fallback')
  })
})

// ─── runForecast ──────────────────────────────────────────────────────────────────
describe('runForecast — orquestador', () => {
  it('insufficient-data con < 3 valores', () => {
    const r = runForecast(tiny, 'ets', 3)
    expect(r.method).toBe('insufficient-data')
  })

  it('método sma expone method=SMA', () => {
    const r = runForecast(simple, 'sma', 3)
    expect(r.method).toBe('SMA')
  })

  it('método hw expone method=Holt-Winters o fallback', () => {
    const r = runForecast(monthly, 'hw', 6)
    expect(r.method).toMatch(/Holt-Winters|fallback/)
  })

  it('métricas MAPE/RMSE/MAE existen en el resultado', () => {
    const r = runForecast(simple, 'ets', 4)
    expect(r.metrics).toHaveProperty('mape')
    expect(r.metrics).toHaveProperty('rmse')
    expect(r.metrics).toHaveProperty('mae')
  })
})
