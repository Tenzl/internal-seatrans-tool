'use client'

import { cn } from '@/shared/lib/utils'
import { useI18n } from './I18nProvider'

/** Compact VI / EN segmented switch. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n()
  return (
    <div
      role="group"
      aria-label="Language"
      className={cn('inline-flex items-center rounded-md border bg-background p-0.5 text-sm', className)}
    >
      {(['vi', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            'rounded-[5px] px-2.5 py-1 font-medium uppercase transition-colors',
            lang === code ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
