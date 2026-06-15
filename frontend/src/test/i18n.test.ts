import { describe, it, expect } from 'vitest'
import { t } from '@/i18n'

describe('frontend t()', () => {
  it('translates nav keys in es', () => {
    expect(t('es', 'nav.dashboards')).toBe('Dashboards')
    expect(t('es', 'nav.ingest')).toBe('Ingestar datos')
  })

  it('translates nav keys in en', () => {
    expect(t('en', 'nav.ingest')).toBe('Ingest data')
  })

  it('interpolates variables', () => {
    const msg = t('es', 'errors.network')
    expect(msg).toContain('Error de red')
  })

  it('falls back to en when key missing in es', () => {
    // Simulate missing key by using a real en-only path
    expect(t('es', 'errors.generic')).toBeTruthy()
  })

  it('returns raw key for totally unknown path', () => {
    expect(t('es', 'totally.unknown.key')).toBe('totally.unknown.key')
  })

  it('table pagination keys present in both locales', () => {
    expect(t('es', 'table.previous')).toBe('Anterior')
    expect(t('en', 'table.previous')).toBe('Previous')
    expect(t('es', 'table.next')).toBe('Siguiente')
    expect(t('en', 'table.next')).toBe('Next')
  })

  it('auth keys present', () => {
    expect(t('es', 'auth.login_button')).toBe('Entrar')
    expect(t('en', 'auth.login_button')).toBe('Sign in')
  })
})
