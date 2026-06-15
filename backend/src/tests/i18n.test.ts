import { describe, it, expect } from 'vitest'
import { t, getSupportedLocales } from '../i18n/index.js'
import { localiseInsights, localiseWarnings, localiseQuestions } from '../i18n/applyLocale.js'

describe('t() — core translation', () => {
  it('translates insight key in Spanish', () => {
    const result = t('es', 'insights.trend_up', { metric: 'Incidentes', pct: 12 })
    expect(result).toContain('Incidentes')
    expect(result).toContain('12%')
    expect(result).toContain('aumentó')
  })

  it('translates insight key in English', () => {
    const result = t('en', 'insights.trend_up', { metric: 'Incidents', pct: 8 })
    expect(result).toContain('Incidents')
    expect(result).toContain('8%')
    expect(result).toContain('increased')
  })

  it('falls back to English for unsupported locale', () => {
    // @ts-expect-error intentional unknown locale
    const result = t('fr', 'insights.trend_up', { metric: 'X', pct: 5 })
    expect(result).toContain('increased')
  })

  it('returns raw key when key not found', () => {
    const result = t('es', 'insights.nonexistent_key')
    expect(result).toBe('insights.nonexistent_key')
  })

  it('leaves unknown placeholders intact', () => {
    const result = t('es', 'insights.trend_up', { metric: 'Ventas' })
    // pct placeholder not provided
    expect(result).toContain('{{pct}}')
  })

  it('getSupportedLocales returns es and en', () => {
    expect(getSupportedLocales()).toContain('es')
    expect(getSupportedLocales()).toContain('en')
  })
})

describe('localiseInsights()', () => {
  it('converts raw insights to localised text', () => {
    const raw = [{ type: 'trend_up', metric: 'Ventas', pct: 20 }]
    const result = localiseInsights(raw, 'es')
    expect(result[0].text).toContain('Ventas')
    expect(result[0].text).toContain('20%')
  })

  it('handles anomaly insight', () => {
    const raw = [{ type: 'anomaly', field: 'precio', value: 9999, algorithm: 'iqr', threshold: 3 }]
    const result = localiseInsights(raw, 'en')
    expect(result[0].text).toContain('precio')
    expect(result[0].text).toContain('9999')
  })
})

describe('localiseWarnings()', () => {
  it('converts high_null_rate warning', () => {
    const raw = [{ code: 'high_null_rate', field: 'ciudad', pct: 45 }]
    const result = localiseWarnings(raw, 'es')
    expect(result[0].detail).toContain('ciudad')
    expect(result[0].detail).toContain('45%')
  })
})

describe('localiseQuestions()', () => {
  it('localises confirm_metric question', () => {
    const raw = [{ field: 'monto', type: 'confirm_metric' as const, options: ['metric', 'dimension'] }]
    const result = localiseQuestions(raw, 'es')
    expect(result[0].question).toContain('monto')
  })
})
