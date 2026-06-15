import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from '@/i18n'

interface LocaleState {
  locale: Locale
  setLocale: (l: Locale) => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale:    (navigator.language?.slice(0, 2) as Locale) === 'en' ? 'en' : 'es',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'jsh-locale' }
  )
)
