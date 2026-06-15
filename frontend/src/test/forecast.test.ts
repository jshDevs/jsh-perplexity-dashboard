import { describe, it, expect } from 'vitest'
import {
  forecastSMA,
  forecastETS,
  forecastHoltWinters,
  autoForecast,
} from '@/analytics/forecast'

// Serie sintética: 24 meses con tendencia + estacionalidad
const monthly = [
  100, 110, 105, 120, 115, 130, 125, 140, 135, 150, 145, 160,
  105, 115, 110, 125, 120, 135, 130, 145, 140, 155, 150, 165,
]

describe('forecastSMA', () => {
  it('genera horizon=5 puntos de forecast', () => {
    const r = forecastSMA([10,12,11,13,10,12], 3, 5)
    const forecasted = r.points.filter((p) => p.isForcast)
    expect(forecasted).toHaveLength(5)
  })

  it('puntos de forecast son números finitos', () => {
    const r = forecastSMA([10,12,11,13,10,12], 3, 3)
    r.points.filter((p) => p.isForcast).forEach((p) => {
      expect(isFinite(p.value)).toBe(true)
    })
  })

  it('MAPE es número no negativo', () => {
    const r = forecastSMA(monthly, 3, 5)
    expect(r.mape).toBeGreaterThanOrEqual(0)
  })
})

describe('forecastETS (Holt)', () => {
  it('genera horizon=6 puntos de forecast', () => {
    const r = forecastETS(monthly, 0.3, 0.1, 6)
    expect(r.points.filter((p) => p.isForcast)).toHaveLength(6)
  })

  it('intervalo de confianza: upper95 > lower95', () => {
    const r = forecastETS(monthly, 0.3, 0.1, 3)
    r.points.filter((p) => p.isForcast).forEach((p) => {
      expect(p.upper95!).toBeGreaterThan(p.lower95!)
    })
  })

  it('RMSE es número positivo', () => {
    const r = forecastETS(monthly)
    expect(r.rmse).toBeGreaterThanOrEqual(0)
  })
})

describe('forecastHoltWinters (triple ES)', () => {
  it('genera horizon=12 puntos con datos suficientes', () => {
    const r = forecastHoltWinters(monthly, 12, 0.3, 0.1, 0.2, 12)
    expect(r.points.filter((p) => p.isForcast)).toHaveLength(12)
  })

  it('fallback a ETS si datos insuficientes para season', () => {
    const r = forecastHoltWinters([10,12,11,13], 12)
    // fallback: method sigue siendo holt_winters pero usa ETS internamente
    expect(r.points.length).toBeGreaterThan(0)
  })

  it('CI se expande con el horizonte', () => {
    const r = forecastHoltWinters(monthly, 12, 0.3, 0.1, 0.2, 6)
    const fc = r.points.filter((p) => p.isForcast)
    const width0 = fc[0].upper95! - fc[0].lower95!
    const width5 = fc[5].upper95! - fc[5].lower95!
    expect(width5).toBeGreaterThanOrEqual(width0)
  })
})

describe('autoForecast', () => {
  it('usa SMA para series cortas (<8 puntos)', () => {
    const r = autoForecast([1,2,3,4,5], 3)
    expect(r.method).toBe('sma')
  })

  it('usa ETS para series medianas (8-23 puntos)', () => {
    const r = autoForecast(monthly.slice(0, 15), 5)
    expect(r.method).toBe('ets')
  })

  it('usa Holt-Winters para series largas (≥24 puntos)', () => {
    const r = autoForecast(monthly, 6)
    expect(r.method).toBe('holt_winters')
  })
})
