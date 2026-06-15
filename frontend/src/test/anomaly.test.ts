import { describe, it, expect } from 'vitest'
import {
  detectIQR,
  detectZScoreMAD,
  detectCUSUM,
  detectAnomalies,
} from '@/analytics/anomaly'

// Dataset con outliers conocidos en índice 5 (valor 999)
const normal   = [10, 12, 11, 13, 10, 12, 11, 14, 10, 13]
const withHigh = [10, 12, 11, 13, 10, 999, 11, 14, 10, 13]
const drift    = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]

describe('detectIQR', () => {
  it('no detecta anomalías en serie normal', () => {
    expect(detectIQR(normal)).toHaveLength(0)
  })

  it('detecta outlier alto en índice 5', () => {
    const result = detectIQR(withHigh)
    expect(result.some((a) => a.index === 5)).toBe(true)
  })

  it('outlier alto tiene severity high o medium', () => {
    const result = detectIQR(withHigh)
    const a5 = result.find((a) => a.index === 5)!
    expect(['high', 'medium']).toContain(a5.severity)
  })

  it('retorna array vacío con menos de 4 valores', () => {
    expect(detectIQR([1, 2, 3])).toHaveLength(0)
  })
})

describe('detectZScoreMAD', () => {
  it('no detecta anomalías en serie normal', () => {
    expect(detectZScoreMAD(normal)).toHaveLength(0)
  })

  it('detecta outlier alto en índice 5', () => {
    const result = detectZScoreMAD(withHigh)
    expect(result.some((a) => a.index === 5)).toBe(true)
  })

  it('retorna vacío si todos los valores son iguales (MAD=0)', () => {
    expect(detectZScoreMAD([5, 5, 5, 5, 5])).toHaveLength(0)
  })
})

describe('detectCUSUM', () => {
  it('detecta deriva sostenida al alza', () => {
    const result = detectCUSUM(drift)
    expect(result.length).toBeGreaterThan(0)
  })

  it('retorna vacío con menos de 8 valores', () => {
    expect(detectCUSUM([1, 2, 3, 4])).toHaveLength(0)
  })
})

describe('detectAnomalies (ensemble)', () => {
  it('detecta el outlier índice 5 con métodos combinados', () => {
    const result = detectAnomalies(withHigh)
    const hit = result.find((a) => a.index === 5)
    expect(hit).toBeDefined()
  })

  it('high severity si ≥2 métodos coinciden', () => {
    const result = detectAnomalies(withHigh)
    const hit = result.find((a) => a.index === 5)
    // 999 es outlier extremo → IQR + MAD deben coincidir → high
    expect(hit?.severity).toBe('high')
  })
})
