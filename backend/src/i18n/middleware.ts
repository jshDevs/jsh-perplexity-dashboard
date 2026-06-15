import { createMiddleware } from 'hono/factory'
import type { Locale }     from './index.js'

declare module 'hono' {
  interface ContextVariableMap {
    locale: Locale
  }
}

const SUPPORTED: Locale[] = ['es', 'en']
const DEFAULT_LOCALE: Locale = (process.env.DEFAULT_LOCALE ?? 'es') as Locale

/**
 * Resolves locale from (priority order):
 *   1. ?lang= query param
 *   2. Accept-Language header (first match)
 *   3. DEFAULT_LOCALE env var (default: 'es')
 */
export const localeMiddleware = () => createMiddleware(async (c, next) => {
  const queryLang = c.req.query('lang') as Locale | undefined
  if (queryLang && SUPPORTED.includes(queryLang)) {
    c.set('locale', queryLang)
    return next()
  }

  const acceptLang = c.req.header('Accept-Language') ?? ''
  const match = acceptLang
    .split(',')
    .map((s) => s.split(';')[0].trim().slice(0, 2).toLowerCase())
    .find((lang) => SUPPORTED.includes(lang as Locale))

  c.set('locale', (match as Locale | undefined) ?? DEFAULT_LOCALE)
  return next()
})
