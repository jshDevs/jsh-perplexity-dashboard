import { useLocaleStore } from '@/store/localeStore'
import { SUPPORTED_LOCALES, type Locale } from '@/i18n'
import { cn } from '@/lib/utils'

const LABELS: Record<Locale, string> = { es: 'ES', en: 'EN' }

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocaleStore()

  return (
    <div className="flex items-center gap-0.5 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
      {SUPPORTED_LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            'px-2 py-1 rounded text-xs font-semibold transition-fast',
            locale === l
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white'
          )}
          aria-label={`Switch language to ${l}`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  )
}
