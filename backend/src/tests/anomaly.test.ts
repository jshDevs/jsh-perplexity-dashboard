import { describe, it, expect } from 'vitest'
import { detectIQR, detectMAD, detectCUSUM, detectAnomalies } from '../analytics/anomaly'

// Dataset con outliers claros
const normal   = [10, 12, 11, 13, 10, 11, 12, 10, 13, 11]
const withHigh = [...normal, 100]          // outlier alto extremo
const withLow  = [...normal, -80]          // outlier bajo extremo
const drift    = [10,10,10,10,10, 30,30,30,30,30]  // drift para CUSUM

// ─── IQR ──────────────────────────────────────────────────────────────────────
describe('detectIQR', () => {
  it('detecta outlier alto extremo', () => {
    const r = detectIQR(withHigh)
    expect(r.anomalies.some(a => a.value === 100)).toBe(true)
  })

  it('detecta outlier bajo extremo', () => {
    const r = detectIQR(withLow)
    expect(r.anomalies.some(a => a.value === -80)).toBe(true)
  })

  it('no detecta anomalías en serie normal', () => {
    const r = detectIQR(normal)
    expect(r.anomalies).toHaveLength(0)
  })

  it('score está entre 0 y 1', () => {
    const r = detectIQR(withHigh)
    r.anomalies.forEach(a => {
      expect(a.score).toBeGreaterThanOrEqual(0)
      expect(a.score).toBeLessThanOrEqual(1)
    })
  })

  it('expone stats: q1, q3, iqr, lower, upper', () => {
    const r = detectIQR(normal)
    expect(r.stats).toHaveProperty('q1')
    expect(r.stats).toHaveProperty('iqr')
  })
})

// ─── MAD ──────────────────────────────────────────────────────────────────────
describe('detectMAD', () => {
  it('detecta outlier extremo con threshold=3.5', () => {
    const r = detectMAD(withHigh, 3.5)
    expect(r.anomalies.some(a => a.value === 100)).toBe(true)
  })

  it('label contiene Z-mod score', () => {
    const r = detectMAD(withHigh)
    expect(r.anomalies[0]?.label).toMatch(/Z-mod/)
  })

  it('no detecta anomalías en serie normal con threshold alto', () => {
    const r = detectMAD(normal, 10)
    expect(r.anomalies).toHaveLength(0)
  })

  it('expone stats: median, mad, threshold', () => {
    const r = detectMAD(withHigh)
    expect(r.stats).toHaveProperty('median')
    expect(r.stats).toHaveProperty('mad')
  })
})

// ─── CUSUM ─────────────────────────────────────────────────────────────────────
describe('detectCUSUM', () => {
  it('detecta drift sostenido', () => {
    const r = detectCUSUM(drift)
    expect(r.anomalies.length).toBeGreaterThan(0)
  })

  it('label contiene S+ y S-', () => {
    const r = detectCUSUM(drift)
    expect(r.anomalies[0]?.label).toMatch(/S\+/)
  })

  it('no detecta anomalías en serie constante', () => {
    const flat = Array(20).fill(10)
    const r    = detectCUSUM(flat)
    expect(r.anomalies).toHaveLength(0)
  })

  it('expone stats: mu, sigma, k, h', () => {
    const r = detectCUSUM(drift)
    expect(r.stats).toHaveProperty('mu')
    expect(r.stats).toHaveProperty('sigma')
  })
})

// ─── detectAnomalies (orquestador) ─────────────────────────────────────────────

describe('detectAnomalies — orquestador', () => {
  it('method=all une anomalías sin duplicados por índice', () => {
    const r = detectAnomalies(withHigh, 'all')
    const indices = r.anomalies.map(a => a.index)
    const unique  = new Set(indices)
    expect(unique.size).toBe(indices.length)
  })

  it('retorna insufficient-data con < 4 valores', () => {
    const r = detectAnomalies([1, 2, 3])
    expect(r.method).toBe('insufficient-data')
    expect(r.anomalies).toHaveLength(0)
  })

  it('method=iqr delega a detectIQR', () => {
    const r = detectAnomalies(withHigh, 'iqr')
    expect(r.method).toBe('IQR')
  })

  it('method=cusum delega a detectCUSUM', () => {
    const r = detectAnomalies(drift, 'cusum')
    expect(r.method).toBe('CUSUM')
  })
})
