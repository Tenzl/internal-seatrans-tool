'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  isHcmWorksheet,
  usesQnPilotage,
} from '@/modules/inquiries/components/common/quoteForm'
import {
  withAutoGrtTierLabels,
  withAutoLoaTierLabels,
  type QuoteVariant,
} from '@/modules/inquiries/components/common/quoteParameters'
import type { EpdaParameterValues } from '@/modules/inquiries/services/epdaParametersService'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  AgencyByGrtCalculator,
  CargoAgencyCalculator,
} from './EpdaAgencyCalculators'
import {
  BerthDuesCalculator,
  GarbageCalculator,
  MoorCalculator,
  PilotageCalculator,
  TonnageDuesCalculator,
} from './EpdaDuesCalculators'
import {
  CargoAgencyRateTable,
  GrtTierTable,
  LoaTierTable,
  NumberField,
} from './EpdaEditorFields'
import {
  QuarantineCalculator,
  TugCalculator,
} from './EpdaQuarantineCalculators'

/** Canonical section order used for 01–06 numbering in the parameter editor. */
const LEAD_PARAMETER_SECTION_ORDER = [
  'tonnage',
  'pilotage',
  'tug',
  'moor',
  'berth-dues',
  'quarantine',
] as const

function sectionFilterKey(ids?: readonly string[]): string {
  return ids?.join('\0') ?? ''
}

function getSectionDisplayNumber(
  sectionId: string,
  index: number,
  useGlobalSectionNumbers: boolean
): number {
  if (useGlobalSectionNumbers) {
    const globalIndex = LEAD_PARAMETER_SECTION_ORDER.indexOf(
      sectionId as (typeof LEAD_PARAMETER_SECTION_ORDER)[number]
    )
    if (globalIndex >= 0) return globalIndex + 1
  }
  return index + 1
}

/** Chips listing which sections a group/port overrides; muted note when none. */
export function OverriddenBadges({ labels }: { labels: string[] }) {
  const { t } = useI18n()
  if (labels.length === 0)
    return (
      <span className='text-sm text-muted-foreground'>
        {t('param.inheritsArea')}
      </span>
    )
  return (
    <div className='flex flex-wrap gap-1'>
      {labels.map((l) => (
        <Badge key={l} variant='secondary' className='font-normal'>
          {l}
        </Badge>
      ))}
    </div>
  )
}

// ---------- shared field editors ----------
export function ValuesEditor({
  variant,
  values,
  onChange,
  visibleSectionIds,
  hiddenSectionIds,
  useGlobalSectionNumbers = false,
}: {
  variant: QuoteVariant
  values: EpdaParameterValues
  onChange: (v: EpdaParameterValues) => void
  visibleSectionIds?: readonly string[]
  hiddenSectionIds?: readonly string[]
  useGlobalSectionNumbers?: boolean
}) {
  const { t } = useI18n()
  const setGarbage = (k: keyof EpdaParameterValues['garbage'], n: number) =>
    onChange({ ...values, garbage: { ...values.garbage, [k]: n } })
  const setQ = (k: keyof EpdaParameterValues['quarantine'], n: number) =>
    onChange({ ...values, quarantine: { ...values.quarantine, [k]: n } })
  const setCoeff = (k: keyof EpdaParameterValues['coeff'], n: number) =>
    onChange({ ...values, coeff: { ...values.coeff, [k]: n } })
  const sections: {
    id: string
    title: string
    desc: string
    body: ReactNode
  }[] = [
    {
      id: 'tonnage',
      title: t('sec.tonnage.title'),
      desc: t('sec.tonnage.desc'),
      body: (
        <div className='space-y-4'>
          {/* Editable inputs */}
          <div className='grid grid-cols-1 gap-4 sm:max-w-md sm:grid-cols-2'>
            <NumberField
              label={t('f.tonnagePerGrt')}
              value={values.coeff.tonnagePerGrt}
              onChange={(n) => setCoeff('tonnagePerGrt', n)}
            />
            <NumberField
              label={t('f.navigationPerGrt')}
              value={values.coeff.navigationPerGrt}
              onChange={(n) => setCoeff('navigationPerGrt', n)}
            />
          </div>
          {/* GRT input + live detail */}
          <TonnageDuesCalculator coeff={values.coeff} />
        </div>
      ),
    },
    {
      id: 'garbage',
      title: t('sec.garbage.title'),
      desc: t('sec.garbage.desc'),
      body: (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 gap-4 sm:max-w-md sm:grid-cols-2'>
            <NumberField
              label={t('f.garbageBerth')}
              value={values.garbage.atBerthUsd}
              onChange={(n) => setGarbage('atBerthUsd', n)}
            />
            {isHcmWorksheet(variant) && (
              <NumberField
                label={t('f.garbageBuoy')}
                value={values.garbage.atBuoyUsd}
                onChange={(n) => setGarbage('atBuoyUsd', n)}
              />
            )}
            <NumberField
              label={t('f.clearance')}
              value={values.coeff.clearanceFee}
              onChange={(n) => setCoeff('clearanceFee', n)}
            />
          </div>
          <GarbageCalculator
            variant={variant}
            garbage={values.garbage}
            clearanceFee={values.coeff.clearanceFee}
          />
        </div>
      ),
    },
    {
      id: 'quarantine',
      title: t('sec.quarantine.title'),
      desc: t('sec.quarantine.desc'),
      body: (
        <div className='space-y-6'>
          <div className='grid gap-4 lg:grid-cols-3'>
            <div className='rounded-md border p-3 lg:col-span-2'>
              <p className='mb-3 text-base font-semibold'>{t('q.shipGroup')}</p>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                <NumberField
                  label={t('q.shipSmall')}
                  value={values.quarantine.shipUnitLowGrt}
                  onChange={(n) => setQ('shipUnitLowGrt', n)}
                />
                <NumberField
                  label={t('q.shipLarge')}
                  value={values.quarantine.shipUnitHighGrt}
                  onChange={(n) => setQ('shipUnitHighGrt', n)}
                />
                <NumberField
                  label={t('q.threshold')}
                  value={values.quarantine.shipThresholdGrt}
                  onChange={(n) => setQ('shipThresholdGrt', n)}
                />
              </div>
            </div>
            <div className='rounded-md border p-3'>
              <p className='mb-3 text-base font-semibold'>
                {t('q.cargoGroup')}
              </p>
              <NumberField
                label={t('q.cargoPerTrip')}
                value={values.quarantine.cargoPerTrip}
                onChange={(n) => setQ('cargoPerTrip', n)}
              />
            </div>
          </div>

          {/* GRT + trips → live detail */}
          <QuarantineCalculator q={values.quarantine} />
        </div>
      ),
    },
    {
      id: 'coeff',
      title: t('sec.cargoAgency.title'),
      desc: t('sec.cargoAgency.desc'),
      body: (
        <div className='space-y-6'>
          <CargoAgencyRateTable
            rates={values.cargoAgencyRates}
            onChange={(rows) => onChange({ ...values, cargoAgencyRates: rows })}
          />
          <CargoAgencyCalculator rates={values.cargoAgencyRates} />
        </div>
      ),
    },
    {
      id: 'pilotage',
      title: t('sec.pilotage.title'),
      desc: t('sec.pilotage.desc'),
      body: (
        <div className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 sm:max-w-2xl sm:grid-cols-2'>
            {!usesQnPilotage(variant) ? (
              <>
                <NumberField
                  label={t('f.pilotageLeg1Rate')}
                  value={values.coeff.pilotageLeg1Rate}
                  onChange={(n) => setCoeff('pilotageLeg1Rate', n)}
                />
                <NumberField
                  label={t('f.pilotageLeg1Miles')}
                  value={values.coeff.pilotageLeg1Miles}
                  onChange={(n) => setCoeff('pilotageLeg1Miles', n)}
                />
                <NumberField
                  label={t('f.pilotageLeg2Rate')}
                  value={values.coeff.pilotageLeg2Rate}
                  onChange={(n) => setCoeff('pilotageLeg2Rate', n)}
                />
                <NumberField
                  label={t('f.pilotageLeg2Miles')}
                  value={values.coeff.pilotageLeg2Miles}
                  onChange={(n) => setCoeff('pilotageLeg2Miles', n)}
                />
                <NumberField
                  label={t('f.pilotageLeg3Rate')}
                  value={values.coeff.pilotageLeg3Rate}
                  onChange={(n) => setCoeff('pilotageLeg3Rate', n)}
                />
              </>
            ) : (
              <>
                <NumberField
                  label={t('f.pilotageSingleRate')}
                  value={values.coeff.pilotageSingleRate}
                  onChange={(n) => setCoeff('pilotageSingleRate', n)}
                />
                <NumberField
                  label={t('f.pilotageMin')}
                  value={values.coeff.pilotageMinAmount}
                  onChange={(n) => setCoeff('pilotageMinAmount', n)}
                />
              </>
            )}
          </div>
          <PilotageCalculator
            key={`${variant}:${values.hours.qnPilotageMiles}:${values.hours.pilotageThirdMiles}`}
            variant={variant}
            coeff={values.coeff}
            hours={values.hours}
          />
        </div>
      ),
    },
    {
      id: 'agency',
      title: t('sec.agency.title'),
      desc: t('sec.agency.desc'),
      body: (
        <div className='space-y-6'>
          <GrtTierTable
            title=''
            tiers={values.agencyFeeTiers}
            onChange={(rows) => onChange({ ...values, agencyFeeTiers: rows })}
          />
          <AgencyByGrtCalculator tiers={values.agencyFeeTiers} />
        </div>
      ),
    },
    {
      id: 'moor',
      title: t('sec.moor.title'),
      desc: isHcmWorksheet(variant)
        ? t('sec.moor.descHcm')
        : t('sec.moor.descQn'),
      body: (
        <div className='space-y-8'>
          <GrtTierTable
            title={isHcmWorksheet(variant) ? t('tbl.atBerth') : ''}
            tiers={values.moorUnmoorBerthTiers}
            autoLabels
            onChange={(rows) =>
              onChange({
                ...values,
                moorUnmoorBerthTiers: withAutoGrtTierLabels(rows),
              })
            }
          />
          {isHcmWorksheet(variant) && (
            <GrtTierTable
              title={t('tbl.atBuoy')}
              tiers={values.moorUnmoorBuoyTiers}
              autoLabels
              onChange={(rows) =>
                onChange({
                  ...values,
                  moorUnmoorBuoyTiers: withAutoGrtTierLabels(rows),
                })
              }
            />
          )}
          <MoorCalculator
            variant={variant}
            berthTiers={values.moorUnmoorBerthTiers}
            buoyTiers={values.moorUnmoorBuoyTiers}
          />
        </div>
      ),
    },
    {
      id: 'berth-dues',
      title: t('sec.berthDues.title'),
      desc: t('sec.berthDues.desc'),
      body: (
        <div className='space-y-6'>
          {/* Rate parameters (per GRT / hour) */}
          <div className='grid grid-cols-1 gap-4 sm:max-w-md sm:grid-cols-2'>
            <NumberField
              label={t('f.berthDue')}
              value={values.coeff.berthDuePerGrtHour}
              onChange={(n) => setCoeff('berthDuePerGrtHour', n)}
            />
            {isHcmWorksheet(variant) && (
              <NumberField
                label={t('f.buoyDue')}
                value={values.coeff.buoyDuePerGrtHour}
                onChange={(n) => setCoeff('buoyDuePerGrtHour', n)}
              />
            )}
            <NumberField
              label={t('f.anchorageDue')}
              value={values.coeff.anchoragePerGrtHour}
              onChange={(n) => setCoeff('anchoragePerGrtHour', n)}
            />
          </div>
          {/* GRT + (berth / anchorage) hours → live results */}
          <BerthDuesCalculator variant={variant} coeff={values.coeff} />
        </div>
      ),
    },
    {
      id: 'tug',
      title: t('sec.tug.title'),
      desc: t('sec.tug.desc'),
      body: (
        <div className='space-y-6'>
          <LoaTierTable
            title=''
            tiers={values.tugTiers}
            onChange={(rows) =>
              onChange({ ...values, tugTiers: withAutoLoaTierLabels(rows) })
            }
          />
          <TugCalculator tiers={values.tugTiers} />
        </div>
      ),
    },
  ]

  // Pin the lead sections in a fixed order for every template (QN + HCM):
  // 01 tonnage · 02 pilotage · 03 tug · 04 moor · 05 berth/anchorage dues · 06 quarantine · rest.
  const visibleSectionKey = sectionFilterKey(visibleSectionIds)
  const hiddenSectionKey = sectionFilterKey(hiddenSectionIds)

  const orderedSections = useMemo(() => {
    const lead: readonly string[] = LEAD_PARAMETER_SECTION_ORDER
    const picked = lead
      .map((id) => sections.find((s) => s.id === id))
      .filter((s): s is (typeof sections)[number] => Boolean(s))
    const rest = sections.filter((s) => !lead.includes(s.id))
    let filtered = [...picked, ...rest]
    if (hiddenSectionIds?.length) {
      filtered = filtered.filter(
        (section) => !hiddenSectionIds.includes(section.id)
      )
    } else if (visibleSectionIds?.length) {
      filtered = filtered.filter((section) =>
        visibleSectionIds.includes(section.id)
      )
    }
    return filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, variant, visibleSectionKey, hiddenSectionKey])

  const sectionSelectionKey = `${variant}:${visibleSectionKey}:${hiddenSectionKey}`
  const [activeSelection, setActiveSelection] = useState({
    key: sectionSelectionKey,
    index: 0,
  })
  const active =
    activeSelection.key === sectionSelectionKey ? activeSelection.index : 0
  const selectSection = (index: number) =>
    setActiveSelection({ key: sectionSelectionKey, index })
  const current = orderedSections[Math.min(active, orderedSections.length - 1)]
  const currentNumber = current
    ? getSectionDisplayNumber(current.id, active, useGlobalSectionNumbers)
    : 1

  return (
    <div className='grid gap-4 md:grid-cols-[15rem_1fr] md:gap-8'>
      {/* Numbered section rail — click to view each part. On mobile it's a
          horizontal scroll strip; on desktop a sticky vertical list. */}
      <nav
        aria-label='Parameter sections'
        className='min-w-0 md:sticky md:top-24 md:self-start'
      >
        <ol className='flex min-w-0 gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0'>
          {orderedSections.map((s, i) => {
            const isActive = i === active
            const sectionNumber = getSectionDisplayNumber(
              s.id,
              i,
              useGlobalSectionNumbers
            )
            return (
              <li key={s.id} className='shrink-0 md:shrink'>
                <button
                  type='button'
                  onClick={() => selectSection(i)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left whitespace-nowrap transition-colors md:w-full md:gap-3 md:border-0 md:py-2.5 ${
                    isActive
                      ? 'border-primary/30 bg-primary/10 text-foreground'
                      : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <span
                    className={`text-sm font-semibold tabular-nums lg:text-base ${
                      isActive ? 'text-primary' : 'text-muted-foreground/70'
                    }`}
                  >
                    {String(sectionNumber).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-sm lg:text-base ${
                      isActive
                        ? 'font-semibold'
                        : 'hidden font-medium lg:inline'
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Active section */}
      <section className='min-w-0'>
        <header className='mb-6 flex items-baseline gap-4'>
          <span className='text-4xl leading-none font-bold text-primary/30 tabular-nums'>
            {String(currentNumber).padStart(2, '0')}
          </span>
          <div className='space-y-1'>
            <h3 className='text-2xl font-semibold tracking-tight'>
              {current.title}
            </h3>
            <p className='text-sm text-muted-foreground'>{current.desc}</p>
          </div>
        </header>
        {current.body}

        {/* Mobile-only pager: previous / next section with their names. */}
        <nav
          aria-label='Section pager'
          className='mt-8 flex items-stretch justify-between gap-3 border-t pt-4 lg:hidden'
        >
          {active > 0 ? (
            <button
              type='button'
              onClick={() => {
                selectSection(active - 1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className='flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-transform active:scale-[0.98]'
            >
              <ChevronLeft className='h-5 w-5 shrink-0 text-muted-foreground' />
              <span className='min-w-0'>
                <span className='block text-[11px] font-medium tracking-wide text-muted-foreground uppercase'>
                  {t('epda.previous')}
                </span>
                <span className='block truncate text-sm font-medium'>
                  {String(
                    getSectionDisplayNumber(
                      orderedSections[active - 1].id,
                      active - 1,
                      useGlobalSectionNumbers
                    )
                  ).padStart(2, '0')}{' '}
                  {orderedSections[active - 1].title}
                </span>
              </span>
            </button>
          ) : (
            <span className='flex-1' />
          )}

          {active < orderedSections.length - 1 ? (
            <button
              type='button'
              onClick={() => {
                selectSection(active + 1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className='flex min-w-0 flex-1 items-center justify-end gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-right transition-transform active:scale-[0.98]'
            >
              <span className='min-w-0'>
                <span className='block text-[11px] font-medium tracking-wide text-primary uppercase'>
                  {t('epda.next')}
                </span>
                <span className='block truncate text-sm font-medium'>
                  {String(
                    getSectionDisplayNumber(
                      orderedSections[active + 1].id,
                      active + 1,
                      useGlobalSectionNumbers
                    )
                  ).padStart(2, '0')}{' '}
                  {orderedSections[active + 1].title}
                </span>
              </span>
              <ChevronRight className='h-5 w-5 shrink-0 text-primary' />
            </button>
          ) : (
            <span className='flex-1' />
          )}
        </nav>
      </section>
    </div>
  )
}

// ---------- edit-history button + modal ----------
