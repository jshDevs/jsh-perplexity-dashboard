import es from './locales/es.json'
import en from './locales/en.json'

export type Locale = 'es' | 'en'
type NestedRecord = { [k: string]: string | NestedRecord }

const locales: Record<Locale, NestedRecord> = { es, en }

function resolve(obj: NestedRecord, path: string): string | undefined {
  return path.split('.').reduce<string | NestedRecord | undefined>(
    (cur, p) => (cur && typeof cur === 'object' ? (cur as NestedRecord)[p] : undefined),
    obj
  ) as string | undefined
}

function interpolate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : `{{${k}}}`))
}

export function t(
  locale: Locale,
  key: string,
  vars: Record<string, string | number> = {}
): string {
  const tpl = resolve(locales[locale], key) ?? resolve(locales['en'], key) ?? key
  return interpolate(tpl as string, vars)
}

export const SUPPORTED_LOCALES: Locale[] = ['es', 'en']
