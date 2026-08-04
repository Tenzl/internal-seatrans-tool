'use client'

import { useState } from 'react'
import {
  withAutoLoaTierLabels,
  type LoaTier,
} from '@/modules/inquiries/components/common/quoteParameters'
import { PURPOSE_OF_CALLING_OPTIONS } from '@/modules/inquiries/constants/shippingAgencyInquiryOptions'
import type { EpdaParameterValues } from '@/modules/inquiries/services/epdaParametersService'
import { NumberInput } from '@/shared/components/NumberInput'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { parseFiniteNumber } from '@/shared/utils/parseNumber'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QUARANTINE_CARGO_OPTIONS } from '@/features/admin/components/invoice/epdaFormParameters'
import { boldNumbers, fmtNum, ScanRow } from './EpdaCalculatorPrimitives'

function shipQuarantineTrips(purpose: string): number {
  if (purpose === 'NHAP_XUAT') return 2
  if (purpose === 'NHAP_CHUYEN_CANG' || purpose === 'CHUYEN_CANG_XUAT') return 1
  return 0
}

/**
 * Live quarantine calculator. Inputs mirror Create EPDA: a GRT, a purpose-of-calling
 * select (→ ship trips) and a quarantine-cargo select (→ cargo trips). Ship unit is
 * low/high by GRT vs threshold; fee = unit × ship trips + cargoPerTrip × cargo trips.
 */
export function QuarantineCalculator({
  q,
}: {
  q: EpdaParameterValues['quarantine']
}) {
  const { t } = useI18n()
  const [grtText, setGrtText] = useState('')
  const [purpose, setPurpose] = useState('')
  const [cargoMode, setCargoMode] = useState('')
  const grt = parseFiniteNumber(grtText) ?? 0

  const shipTrips = shipQuarantineTrips(purpose)
  const cargoTrips =
    QUARANTINE_CARGO_OPTIONS.find((o) => o.value === cargoMode)?.trips ?? 0
  const unit = grt >= q.shipThresholdGrt ? q.shipUnitHighGrt : q.shipUnitLowGrt
  const ship = unit * shipTrips
  const cargo = q.cargoPerTrip * cargoTrips
  const total = ship + cargo

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('quarantineCalc.title')}</h4>

      {/* Inputs — match Create EPDA (GRT + purpose + quarantine-cargo selects) */}
      <div className='grid gap-3 sm:max-w-2xl sm:grid-cols-3'>
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
            {t('epda.purpose')}
          </Label>
          <Select value={purpose} onValueChange={setPurpose}>
            <SelectTrigger className='h-11 w-full'>
              <SelectValue placeholder={t('ph.purpose')} />
            </SelectTrigger>
            <SelectContent>
              {PURPOSE_OF_CALLING_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t('opt.purpose.' + o.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label className='text-sm font-medium text-muted-foreground'>
            {t('epda.quarantineCargo')}
          </Label>
          <Select value={cargoMode} onValueChange={setCargoMode}>
            <SelectTrigger className='h-11 w-full'>
              <SelectValue placeholder={t('ph.quarantineCargo')} />
            </SelectTrigger>
            <SelectContent>
              {QUARANTINE_CARGO_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t('opt.quarantine.' + o.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Detail below */}
      <div className='space-y-2'>
        <p className='text-sm font-medium tracking-wide text-muted-foreground uppercase'>
          {t('tonnageCalc.detail')}
        </p>
        <div className='space-y-1'>
          <ScanRow
            label={boldNumbers(
              t('quarantineCalc.shipLine', {
                unit: fmtNum(unit),
                trips: fmtNum(shipTrips),
              })
            )}
            test={boldNumbers(`= USD ${fmtNum(ship)}`)}
          />
          <ScanRow
            label={boldNumbers(
              t('quarantineCalc.cargoLine', {
                rate: fmtNum(q.cargoPerTrip),
                trips: fmtNum(cargoTrips),
              })
            )}
            test={boldNumbers(`= USD ${fmtNum(cargo)}`)}
          />
          <ScanRow
            label={boldNumbers(t('quarantineCalc.totalLine'))}
            test={boldNumbers(`= USD ${fmtNum(total)}`)}
            hit
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Live tug calculator. Staff type a ship LOA and the matched band + charge appear.
 * Rule (same as the quote): take the band with the highest Min LOA that is still ≤
 * the ship's LOA. If the LOA is below every band, no tug charge applies.
 */
export function TugCalculator({ tiers }: { tiers: LoaTier[] }) {
  const { t } = useI18n()
  const [loaText, setLoaText] = useState('')
  const [customText, setCustomText] = useState('')
  const hasInput = loaText.trim() !== ''
  const loa = parseFiniteNumber(loaText) ?? 0
  const labeledTiers = withAutoLoaTierLabels(tiers)

  let matched: LoaTier | undefined
  let matchedMinLoa = -Infinity
  let matchedAmount = -Infinity
  labeledTiers.forEach((tr) => {
    const minLoa = parseFiniteNumber(tr.minLoa)
    const amount = parseFiniteNumber(tr.amount) ?? 0
    if (minLoa === null || amount <= 0) return
    if (loa < minLoa) return
    if (
      minLoa > matchedMinLoa ||
      (minLoa === matchedMinLoa && amount >= matchedAmount)
    ) {
      matched = tr
      matchedMinLoa = minLoa
      matchedAmount = amount
    }
  })

  // Above the highest band's Min LOA, the tug charge is negotiable → let the user type it.
  const activeMinLoas = labeledTiers
    .filter((tr) => (parseFiniteNumber(tr.amount) ?? 0) > 0)
    .map((tr) => parseFiniteNumber(tr.minLoa))
    .filter((n): n is number => n !== null)
  const maxMinLoa = activeMinLoas.length ? Math.max(...activeMinLoas) : 0
  const isOverLast = hasInput && matched !== undefined && loa >= maxMinLoa

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('tugCalc.title')}</h4>

      {/* LOA input */}
      <div className='grid gap-2 sm:max-w-xs'>
        <Label className='text-sm font-medium text-muted-foreground'>
          {t('tugCalc.loaLabel')}
        </Label>
        <NumberInput
          placeholder='0'
          value={loaText}
          onValueChange={(_value, canonical) => setLoaText(canonical)}
          className='h-11 text-base tabular-nums'
        />
      </div>

      {/* Result — matched band + charge. Over the last band the amount is entered manually. */}
      <div className='flex items-center justify-between gap-3 rounded-md border bg-background/70 px-4 py-3'>
        <span className='text-sm font-medium text-muted-foreground'>
          {!hasInput
            ? t('tugCalc.enterLoa')
            : matched
              ? matched.label || `≥ ${fmtNum(matched.minLoa)}m`
              : t('tugCalc.noCharge')}
        </span>
        {isOverLast ? (
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium text-muted-foreground'>
              USD
            </span>
            <NumberInput
              placeholder={fmtNum(matched!.amount)}
              value={customText}
              onValueChange={(_value, canonical) => setCustomText(canonical)}
              className='h-9 w-32 text-right text-base font-bold tabular-nums'
            />
          </div>
        ) : (
          <span className='text-lg font-bold tabular-nums'>
            {hasInput && matched ? `USD ${fmtNum(matched.amount)}` : '—'}
          </span>
        )}
      </div>
      {isOverLast && (
        <p className='text-xs text-muted-foreground'>{t('tugCalc.overLast')}</p>
      )}
    </div>
  )
}
