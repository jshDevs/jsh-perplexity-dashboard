import esLocale from './locales/es.json' assert { type: 'json' }
import enLocale from './locales/en.json' assert { type: 'json' }

export type Locale = 'es' | 'en'
type NestedRecord = { [k: string]: string | NestedRecord }

const locales: Record<Locale, NestedRecord> = { es: esLocale, en: enLocale }

/** Resolve a dot-path key like 'insights.trend_up' from a nested object */
function resolve(obj: NestedRecord, path: string): string | undefined {
  const parts = path.split('.')
  let cur: string | NestedRecord = obj
  for (const p of parts) {
    if (typeof cur !== 'object' || !(p in cur)) return undefined
    cur = (cur as NestedRecord)[p]
  }
  return typeof cur === 'string' ? cur : undefined
}

/** Interpolate {{var}} placeholders */
function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{{${key}}}`
  )
}

/**
 * Translate a dot-path key with optional interpolation vars.
 * Falls back to English, then returns the raw key if not found.
 *
 * @example
 *   t('es', 'insights.trend_up', { metric: 'Incidentes', pct: 12 })
 *   // => "Incidentes aumentó 12% en el período seleccionado."
 */
export function t(
  locale: Locale,
  key: string,
  vars: Record<string, string | number> = {}
): string {
  const template =
    resolve(locales[locale], key) ??
    resolve(locales['en'], key) ??
    key
  return interpolate(template, vars)
}

export function getSupportedLocales(): Locale[] {
  return Object.keys(locales) as Locale[]
}
