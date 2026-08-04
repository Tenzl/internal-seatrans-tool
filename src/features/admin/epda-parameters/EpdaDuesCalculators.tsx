'use client'

import { useState } from 'react'
import {
  isHcmWorksheet,
  usesQnPilotage,
} from '@/modules/inquiries/components/common/quoteForm'
import type {
  GrtTier,
  QuoteVariant,
} from '@/modules/inquiries/components/common/quoteParameters'
import type { EpdaParameterValues } from '@/modules/inquiries/services/epdaParametersService'
import { NumberInput } from '@/shared/components/NumberInput'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { formatNumberInputValue } from '@/shared/utils/numberInput'
import { parseFiniteNumber } from '@/shared/utils/parseNumber'
import { Label } from '@/components/ui/label'
import {
  boldNumbers,
  fmtNum,
  resolveGrtBand,
  ScanRow,
} from './EpdaCalculatorPrimitives'

export function GarbageCalculator({
  variant,
  garbage,
  clearanceFee,
}: {
  variant: QuoteVariant
  garbage: EpdaParameterValues['garbage']
  clearanceFee: number
}) {
  const { t } = useI18n()
  const [berthDaysText, setBerthDaysText] = useState('')
  const [buoyDaysText, setBuoyDaysText] = useState('')
  const berthDays = parseFiniteNumber(berthDaysText) ?? 0
  const buoyDays = parseFiniteNumber(buoyDaysText) ?? 0
  const berthBlocks = Math.ceil(berthDays / 2)
  const buoyBlocks = Math.ceil(buoyDays / 2)
  const berth = garbage.atBerthUsd * berthBlocks
  const buoy = garbage.atBuoyUsd * buoyBlocks
  const total = berth + (isHcmWorksheet(variant) ? buoy : 0) + clearanceFee

  const inputField = (
    label: string,
    value: string,
    onChange: (v: string) => void
  ) => (
    <div className='grid gap-2'>
      <Label className='text-sm font-medium text-muted-foreground'>
        {label}
      </Label>
      <NumberInput
        placeholder='0'
        value={value}
        onValueChange={(_number, canonical) => onChange(canonical)}
        className='h-11 text-base tabular-nums'
      />
    </div>
  )

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('garbageCalc.title')}</h4>

      {/* Inputs (days) */}
      <div className='grid gap-3 sm:max-w-md sm:grid-cols-2'>
        {inputField(
          t('garbageCalc.berthDays'),
          berthDaysText,
          setBerthDaysText
        )}
        {isHcmWorksheet(variant) &&
          inputField(t('garbageCalc.buoyDays'), buoyDaysText, setBuoyDaysText)}
      </div>

      {/* Detail below */}
      <div className='space-y-2'>
        <p className='text-sm font-medium tracking-wide text-muted-foreground uppercase'>
          {t('tonnageCalc.detail')}
        </p>
        <div className='space-y-1'>
          <ScanRow
            label={boldNumbers(
              t('garbageEx.berth', {
                days: fmtNum(berthDays),
                blocks: berthBlocks,
                rate: fmtNum(garbage.atBerthUsd),
              })
            )}
            test={boldNumbers(`= USD ${fmtNum(berth)}`)}
          />
          {isHcmWorksheet(variant) && (
            <ScanRow
              label={boldNumbers(
                t('garbageEx.buoy', {
                  days: fmtNum(buoyDays),
                  blocks: buoyBlocks,
                  rate: fmtNum(garbage.atBuoyUsd),
                })
              )}
              test={boldNumbers(`= USD ${fmtNum(buoy)}`)}
            />
          )}
          <ScanRow
            label={boldNumbers(t('f.clearance'))}
            test={boldNumbers(`= USD ${fmtNum(clearanceFee)}`)}
          />
          <ScanRow
            label={boldNumbers(t('garbageCalc.totalLine'))}
            test={boldNumbers(`= USD ${fmtNum(total)}`)}
            hit
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Live tonnage & navigation-dues calculator. Staff type a GRT and the detail lines +
 * result recompute from the rates above. Mirrors the quote formula:
 *   tonnage    = tonnagePerGrt    × GRT × 2 (in & out)
 *   navigation = navigationPerGrt × GRT × 2 (in & out)
 */
export function TonnageDuesCalculator({
  coeff,
}: {
  coeff: EpdaParameterValues['coeff']
}) {
  const { t } = useI18n()
  const [grtText, setGrtText] = useState('')
  const grt = parseFiniteNumber(grtText) ?? 0
  const tonnage = coeff.tonnagePerGrt * grt * 2
  const navigation = coeff.navigationPerGrt * grt * 2

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('tonnageCalc.title')}</h4>

      {/* GRT input */}
      <div className='grid gap-2 sm:max-w-xs'>
        <Label className='text-sm font-medium text-muted-foreground'>
          {t('tonnageCalc.grtLabel')}
        </Label>
        <NumberInput
          placeholder='0'
          value={grtText}
          onValueChange={(_value, canonical) => setGrtText(canonical)}
          className='h-11 text-base tabular-nums'
        />
      </div>

      {/* Detail — recomputes live from the GRT above */}
      <div className='space-y-2'>
        <p className='text-sm font-medium tracking-wide text-muted-foreground uppercase'>
          {t('tonnageCalc.detail')}
        </p>
        <div className='space-y-1'>
          <ScanRow
            label={boldNumbers(
              t('tonnageCalc.tonnageLine', {
                rate: coeff.tonnagePerGrt,
                grt: fmtNum(grt),
              })
            )}
            test={boldNumbers(`= USD ${fmtNum(tonnage)}`)}
          />
          <ScanRow
            label={boldNumbers(
              t('tonnageCalc.navLine', {
                rate: coeff.navigationPerGrt,
                grt: fmtNum(grt),
              })
            )}
            test={boldNumbers(`= USD ${fmtNum(navigation)}`)}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Live pilotage calculator. Staff type a GRT (+ miles / buoy position) and the detail
 * lines recompute from the rates above. Mirrors the quote formula per variant:
 *   QN:  max(singleRate × GRT × 2 × miles, minAmount)   (miles only counts when > 1)
 *   HCM: leg1 + leg2 + leg3, each = legRate × GRT × 2 × legMiles, where leg miles are
 *        derived from the buoy position (leg1/leg2 are flat bands, leg3 is the remainder)
 */
export function PilotageCalculator({
  variant,
  coeff,
  hours,
}: {
  variant: QuoteVariant
  coeff: EpdaParameterValues['coeff']
  hours: EpdaParameterValues['hours']
}) {
  const { t } = useI18n()
  const defaultMiles = usesQnPilotage(variant)
    ? hours.qnPilotageMiles
    : hours.pilotageThirdMiles
  const [grtText, setGrtText] = useState('')
  const [milesText, setMilesText] = useState(() =>
    formatNumberInputValue(defaultMiles)
  )
  const grt = parseFiniteNumber(grtText) ?? 0
  const miles = parseFiniteNumber(milesText) ?? 0

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('pilotageCalc.title')}</h4>

      {/* GRT + miles / position inputs */}
      <div className='grid gap-4 sm:max-w-md sm:grid-cols-2'>
        <div className='grid gap-2'>
          <Label className='text-sm font-medium text-muted-foreground'>
            {t('tonnageCalc.grtLabel')}
          </Label>
          <NumberInput
            placeholder='0'
            value={grtText}
            onValueChange={(_value, canonical) => setGrtText(canonical)}
            className='h-11 text-base tabular-nums'
          />
        </div>
        <div className='grid gap-2'>
          <Label className='text-sm font-medium text-muted-foreground'>
            {usesQnPilotage(variant)
              ? t('pilotageCalc.milesLabel')
              : t('pilotageCalc.positionLabel')}
          </Label>
          <NumberInput
            placeholder='0'
            value={milesText}
            onValueChange={(_value, canonical) => setMilesText(canonical)}
            className='h-11 text-base tabular-nums'
          />
        </div>
      </div>

      {/* Detail — recomputes live from the inputs above */}
      <div className='space-y-2'>
        <p className='text-sm font-medium tracking-wide text-muted-foreground uppercase'>
          {t('tonnageCalc.detail')}
        </p>
        {!usesQnPilotage(variant)
          ? (() => {
              const leg1Width = coeff.pilotageLeg1Miles
              const leg2Width = coeff.pilotageLeg2Miles
              const leg1Miles = miles > 0 ? leg1Width : 0
              const leg2Miles = miles > leg1Width ? leg2Width : 0
              const leg3Miles = Math.max(miles - leg1Width - leg2Width, 0)
              const leg1 = coeff.pilotageLeg1Rate * grt * 2 * leg1Miles
              const leg2 = coeff.pilotageLeg2Rate * grt * 2 * leg2Miles
              const leg3 = coeff.pilotageLeg3Rate * grt * 2 * leg3Miles
              const total = leg1 + leg2 + leg3
              return (
                <div className='space-y-1'>
                  <ScanRow
                    label={boldNumbers(
                      t('pilotageCalc.leg1', {
                        rate: coeff.pilotageLeg1Rate,
                        grt: fmtNum(grt),
                        miles: fmtNum(leg1Miles),
                      })
                    )}
                    test={boldNumbers(`= USD ${fmtNum(leg1)}`)}
                  />
                  <ScanRow
                    label={boldNumbers(
                      t('pilotageCalc.leg2', {
                        rate: coeff.pilotageLeg2Rate,
                        grt: fmtNum(grt),
                        miles: fmtNum(leg2Miles),
                      })
                    )}
                    test={boldNumbers(`= USD ${fmtNum(leg2)}`)}
                  />
                  <ScanRow
                    label={boldNumbers(
                      t('pilotageCalc.leg3', {
                        rate: coeff.pilotageLeg3Rate,
                        grt: fmtNum(grt),
                        miles: fmtNum(leg3Miles),
                      })
                    )}
                    test={boldNumbers(`= USD ${fmtNum(leg3)}`)}
                  />
                  <ScanRow
                    label={boldNumbers(t('pilotageCalc.total'))}
                    test={boldNumbers(`= USD ${fmtNum(total)}`)}
                    hit
                  />
                </div>
              )
            })()
          : (() => {
              const multiplier = miles > 1 ? miles : 1
              const raw = coeff.pilotageSingleRate * grt * 2 * multiplier
              const value = Math.max(raw, coeff.pilotageMinAmount)
              return (
                <div className='space-y-1'>
                  <ScanRow
                    label={boldNumbers(
                      t('pilotageCalc.qnLine', {
                        rate: coeff.pilotageSingleRate,
                        grt: fmtNum(grt),
                        miles: fmtNum(multiplier),
                      })
                    )}
                    test={boldNumbers(`= USD ${fmtNum(raw)}`)}
                  />
                  <ScanRow
                    label={boldNumbers(
                      t('pilotageCalc.qnMin', {
                        min: fmtNum(coeff.pilotageMinAmount),
                      })
                    )}
                    test={boldNumbers(`= USD ${fmtNum(value)}`)}
                    hit
                  />
                </div>
              )
            })()}
      </div>
    </div>
  )
}

/** Resolve a GRT tier: the first band whose Max GRT ≥ GRT (last band = the ∞ catch-all). */
export function MoorCalculator({
  variant,
  berthTiers,
  buoyTiers,
}: {
  variant: QuoteVariant
  berthTiers: GrtTier[]
  buoyTiers: GrtTier[]
}) {
  const { t } = useI18n()
  const [grtText, setGrtText] = useState('')
  const hasInput = grtText.trim() !== ''
  const grt = parseFiniteNumber(grtText) ?? 0
  const berth = resolveGrtBand(berthTiers, grt)
  const buoy = resolveGrtBand(buoyTiers, grt)

  const resultRow = (label: string, band: GrtTier | undefined) => (
    <div className='flex items-center justify-between rounded-md border bg-background/70 px-4 py-3'>
      <span className='text-sm font-medium text-muted-foreground'>{label}</span>
      <span className='text-lg font-bold tabular-nums'>
        {hasInput && band ? `USD ${fmtNum(band.amount)}` : '—'}
      </span>
    </div>
  )

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('moorCalc.title')}</h4>

      {/* GRT input */}
      <div className='grid gap-2 sm:max-w-xs'>
        <Label className='text-sm font-medium text-muted-foreground'>
          {t('tonnageCalc.grtLabel')}
        </Label>
        <NumberInput
          placeholder='0'
          value={grtText}
          onValueChange={(_value, canonical) => setGrtText(canonical)}
          className='h-11 text-base tabular-nums'
        />
      </div>

      {/* Result(s) — empty state mirrors the tug calculator's row style */}
      {!hasInput ? (
        resultRow(t('moorCalc.enterGrt'), undefined)
      ) : isHcmWorksheet(variant) ? (
        <div className='grid gap-2 sm:grid-cols-2'>
          {resultRow(t('tbl.atBerth'), berth)}
          {resultRow(t('tbl.atBuoy'), buoy)}
        </div>
      ) : (
        resultRow(t('sec.moor.title'), berth)
      )}
    </div>
  )
}

/**
 * Live berth / buoy / anchorage dues calculator. Staff enter HOURS; the detail shows the
 * day-based form (days = hours ÷ 24) and the amount. Each due = rate × hours × GRT. Berth
 * due uses berth hours; anchorage (and HCM buoy due) use anchorage hours — the two differ,
 * matching the quote. Layout: inputs on top, detail below (full width).
 */
export function BerthDuesCalculator({
  variant,
  coeff,
}: {
  variant: QuoteVariant
  coeff: EpdaParameterValues['coeff']
}) {
  const { t } = useI18n()
  const [grtText, setGrtText] = useState('')
  const [berthHoursText, setBerthHoursText] = useState('')
  const [anchorageHoursText, setAnchorageHoursText] = useState('')
  const grt = parseFiniteNumber(grtText) ?? 0
  const berthHours = parseFiniteNumber(berthHoursText) ?? 0
  const anchorageHours = parseFiniteNumber(anchorageHoursText) ?? 0

  // Each due = rate × hours × GRT.
  const berth = coeff.berthDuePerGrtHour * berthHours * grt
  const buoy = coeff.buoyDuePerGrtHour * anchorageHours * grt
  const anchorage = coeff.anchoragePerGrtHour * anchorageHours * grt

  const inputField = (
    label: string,
    value: string,
    onChange: (v: string) => void
  ) => (
    <div className='grid gap-2'>
      <Label className='text-sm font-medium text-muted-foreground'>
        {label}
      </Label>
      <NumberInput
        placeholder='0'
        value={value}
        onValueChange={(_number, canonical) => onChange(canonical)}
        className='h-11 text-base tabular-nums'
      />
    </div>
  )

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('berthDuesCalc.title')}</h4>

      {/* Inputs (hours) */}
      <div className='grid gap-3 sm:max-w-2xl sm:grid-cols-3'>
        {inputField(t('tonnageCalc.grtLabel'), grtText, setGrtText)}
        {inputField(t('f.berthHours'), berthHoursText, setBerthHoursText)}
        {inputField(
          t('f.anchorageHours'),
          anchorageHoursText,
          setAnchorageHoursText
        )}
      </div>

      {/* Detail below — recomputes live from the inputs */}
      <div className='space-y-2'>
        <p className='text-sm font-medium tracking-wide text-muted-foreground uppercase'>
          {t('tonnageCalc.detail')}
        </p>
        <div className='space-y-1'>
          <ScanRow
            label={boldNumbers(
              t('berthDuesCalc.berthLine', {
                rate: coeff.berthDuePerGrtHour,
                hours: fmtNum(berthHours),
                grt: fmtNum(grt),
              })
            )}
            test={boldNumbers(`= USD ${fmtNum(berth)}`)}
          />
          {isHcmWorksheet(variant) && (
            <ScanRow
              label={boldNumbers(
                t('berthDuesCalc.buoyLine', {
                  rate: coeff.buoyDuePerGrtHour,
                  hours: fmtNum(anchorageHours),
                  grt: fmtNum(grt),
                })
              )}
              test={boldNumbers(`= USD ${fmtNum(buoy)}`)}
            />
          )}
          <ScanRow
            label={boldNumbers(
              t('berthDuesCalc.anchorageLine', {
                rate: coeff.anchoragePerGrtHour,
                hours: fmtNum(anchorageHours),
                grt: fmtNum(grt),
              })
            )}
            test={boldNumbers(`= USD ${fmtNum(anchorage)}`)}
          />
        </div>
      </div>
    </div>
  )
}

/** Ship-quarantine trips by purpose of calling — same mapping the quote/EPDA uses. */
