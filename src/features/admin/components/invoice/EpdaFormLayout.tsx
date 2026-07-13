'use client'

import { cn } from '@/shared/lib/utils'
import { useI18n } from '@/shared/i18n/I18nProvider'
import {
  EPDA_CUSTOMER_SECTION,
  EPDA_SECTIONS,
  epdaSectionNumber,
  type EpdaSectionId,
} from './epdaFormLayout.config'


/** Optional leading section "00" — shown only for externally-created (customer) inquiries. */

const SECTION_LABEL_KEY: Record<EpdaSectionId, string> = {
  'epda-customer': 'epda.secCustomer',
  'epda-general': 'epda.secGeneral',
  'epda-dues': 'epda.secDues',
  'epda-agency': 'epda.secAgency',
}

/** Display number for the rail/section badge: customer → "00", others → 1-based position. */
/** Numbered, click-to-select rail (one section at a time), styled like the EPDA parameter editor. */
export function EpdaSectionRail({
  active,
  onSelect,
  className,
  includeCustomer = false,
}: {
  active: EpdaSectionId
  onSelect: (id: EpdaSectionId) => void
  className?: string
  /** Prepend the "00 Customer information" entry (external/customer inquiries only). */
  includeCustomer?: boolean
}) {
  const { t } = useI18n()
  const sections = includeCustomer
    ? [EPDA_CUSTOMER_SECTION, ...EPDA_SECTIONS]
    : [...EPDA_SECTIONS]
  return (
    <nav className={className} aria-label="EPDA form sections">
      <ol className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
        {sections.map((section) => {
          const isActive = section.id === active
          return (
            <li key={section.id} className="shrink-0 md:shrink">
              <button
                type="button"
                onClick={() => onSelect(section.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  isActive
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'text-base font-semibold tabular-nums',
                    isActive ? 'text-primary' : 'text-muted-foreground/70',
                  )}
                >
                  {epdaSectionNumber(section.id)}
                </span>
                <span className={cn('text-base', isActive ? 'font-semibold' : 'font-medium')}>
                  {t(SECTION_LABEL_KEY[section.id])}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface EpdaFormSectionProps {
  id: EpdaSectionId
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  /** When set, the section is hidden unless it is the active one (single-section rail mode). */
  activeId?: EpdaSectionId
}

export function EpdaFormSection({ id, title, description, children, className, activeId }: EpdaFormSectionProps) {
  const stepNumber = epdaSectionNumber(id) || undefined
  const railMode = activeId !== undefined
  const isHidden = railMode && activeId !== id

  return (
    <section
      id={id}
      hidden={isHidden}
      className={cn(
        'scroll-mt-36 space-y-6',
        railMode ? 'border-t-0 pt-0' : 'border-t border-border/50 pt-9 first:border-t-0 first:pt-0',
        isHidden && 'hidden',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {stepNumber ? (
          <span
            aria-hidden
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold tabular-nums text-primary"
          >
            {stepNumber}
          </span>
        ) : null}
        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
          {description ? (
            <p className="max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  )
}

export interface EpdaSummaryItem {
  label: string
  value: string
  hint?: string
}

export function EpdaComputedSummary({
  items,
  className,
}: {
  items: EpdaSummaryItem[]
  className?: string
}) {
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        'grid gap-3 rounded-lg border border-border/60 bg-muted/25 p-4 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
      role="region"
      aria-label="Calculated amounts"
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          <p className="font-mono text-sm font-semibold tabular-nums tracking-tight text-foreground">
            {item.value}
          </p>
          {item.hint ? (
            <p className="text-[11px] leading-snug text-muted-foreground">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function EpdaFormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-10 animate-pulse rounded-md bg-muted/60"
          style={{ width: `${88 - index * 12}%` }}
        />
      ))}
    </div>
  )
}
