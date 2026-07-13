'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { messages, type Lang } from './messages'

const STORAGE_KEY = 'epda-lang'
const DEFAULT_LANG: Lang = 'en'

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  /** Translate a key; supports `{var}` interpolation. Falls back to the key itself. */
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return DEFAULT_LANG
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'vi' || stored === 'en' ? stored : DEFAULT_LANG
  })

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const toggle = useCallback(() => setLang(lang === 'vi' ? 'en' : 'vi'), [lang, setLang])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const table = messages[lang] as Record<string, string>
      let value = table[key] ?? (messages.en as Record<string, string>)[key] ?? key
      if (vars) {
        for (const [name, val] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{${name}\\}`, 'g'), String(val))
        }
      }
      return value
    },
    [lang],
  )

  return <I18nContext.Provider value={{ lang, setLang, toggle, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Safe fallback when used outside the provider: English, no persistence.
    const t = (key: string, vars?: Record<string, string | number>) => {
      let value = (messages.en as Record<string, string>)[key] ?? key
      if (vars) for (const [n, v] of Object.entries(vars)) value = value.replace(new RegExp(`\\{${n}\\}`, 'g'), String(v))
      return value
    }
    return { lang: 'en', setLang: () => {}, toggle: () => {}, t }
  }
  return ctx
}
