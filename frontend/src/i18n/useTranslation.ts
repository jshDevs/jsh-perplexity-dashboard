import { useLocaleStore } from '@/store/localeStore'
import { t, type Locale } from './index'

/**
 * React hook — returns a `t()` function bound to the current locale.
 *
 * @example
 *   const { t } = useTranslation()
 *   <button>{t('filters.clear')}</button>
 */
export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale)
  return {
    t: (key: string, vars?: Record<string, string | number>) => t(locale, key, vars ?? {}),
    locale,
  }
}
