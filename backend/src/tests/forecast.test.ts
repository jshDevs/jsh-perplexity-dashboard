import { describe, it, expect } from 'vitest'
import { holtWinters } from '../services/forecast.js'

describe('holtWinters', () => {
  it('returns forecast array of correct length', () => {
    const values = Array.from({ length: 36 }, (_, i) => 100 + Math.sin(i / 6) * 20 + i * 0.5)
    const result = holtWinters(values, 12, 6)
    expect(result.forecast).toHaveLength(6)
    expect(result.algorithm).toBe('holt-winters')
  })

  it('falls back to SMA for short series', () => {
    const values = [10, 12, 11, 13, 14, 15, 13]
    const result = holtWinters(values, 12, 3)
    expect(result.algorithm).toBe('sma')
    expect(result.forecast).toHaveLength(3)
  })

  it('MAPE is a finite positive number', () => {
    const values = Array.from({ length: 36 }, (_, i) => 50 + i * 2 + Math.random() * 5)
    const result = holtWinters(values, 12, 12)
    expect(result.accuracy.mape).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(result.accuracy.mape)).toBe(true)
  })

  it('smoothed length equals input length', () => {
    const values = Array.from({ length: 24 }, (_, i) => 100 + i)
    const result = holtWinters(values, 12, 12)
    expect(result.smoothed).toHaveLength(24)
  })
})
