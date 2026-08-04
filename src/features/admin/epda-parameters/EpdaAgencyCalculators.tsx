'use client'

import { useState } from 'react'
import { SHIPPING_AGENCY_CARGO_TYPES } from '@/modules/gallery/shippingAgencyCargoCatalog'
import type {
  CargoAgencyRate,
  GrtTier,
} from '@/modules/inquiries/components/common/quoteParameters'
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
import {
  boldNumbers,
  fmtNum,
  resolveGrtBand,
  ScanRow,
} from './EpdaCalculatorPrimitives'

const normalizeCargoTypeCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

export function CargoAgencyCalculator({ rates }: { rates: CargoAgencyRate[] }) {
  const { t } = useI18n()
  const [code, setCode] = useState(SHIPPING_AGENCY_CARGO_TYPES[0]?.code ?? '')
  const [mtText, setMtText] = useState('')
  const mt = parseFiniteNumber(mtText) ?? 0
  const rate =
    rates.find(
      (r) => normalizeCargoTypeCode(r.code) === normalizeCargoTypeCode(code)
    )?.rate ?? 0
  const fee = rate * mt

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('cargoAgencyCalc.title')}</h4>

      <div className='grid gap-3 sm:max-w-md sm:grid-cols-2'>
        <div className='grid gap-2'>
          <Label className='text-sm font-medium text-muted-foreground'>
            {t('cargoRate.colType')}
          </Label>
          <Select value={code} onValueChange={setCode}>
            <SelectTrigger className='h-11 w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHIPPING_AGENCY_CARGO_TYPES.map((ct) => (
                <SelectItem key={ct.code} value={ct.code}>
                  {ct.displayLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-2'>
          <Label className='text-sm font-medium text-muted-foreground'>
            {t('cargoAgencyCalc.mtLabel')}
          </Label>
          <NumberInput
            placeholder='0'
            value={mtText}
            onValueChange={(_value, canonical) => setMtText(canonical)}
            className='h-11 text-base tabular-nums'
          />
        </div>
      </div>

      <div className='space-y-2'>
        <p className='text-sm font-medium tracking-wide text-muted-foreground uppercase'>
          {t('tonnageCalc.detail')}
        </p>
        <div className='space-y-1'>
          <ScanRow
            label={boldNumbers(
              t('cargoAgencyCalc.line', { rate: fmtNum(rate), mt: fmtNum(mt) })
            )}
            test={boldNumbers(`= USD ${fmtNum(fee)}`)}
            hit
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Live agency-fee-by-GRT calculator. Enter a GRT; the matched tariff band's fee appears
 * (first band whose Max GRT ≥ GRT). Empty state mirrors the other GRT calculators.
 */
export function AgencyByGrtCalculator({ tiers }: { tiers: GrtTier[] }) {
  const { t } = useI18n()
  const [grtText, setGrtText] = useState('')
  const hasInput = grtText.trim() !== ''
  const grt = parseFiniteNumber(grtText) ?? 0
  const band = resolveGrtBand(tiers, grt)

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('agencyCalc.title')}</h4>

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

      <div className='flex items-center justify-between rounded-md border bg-background/70 px-4 py-3'>
        <span className='text-sm font-medium text-muted-foreground'>
          {!hasInput
            ? t('moorCalc.enterGrt')
            : band
              ? band.label ||
                (band.maxGrt === null ? '∞' : `≤ ${fmtNum(band.maxGrt)}`)
              : '—'}
        </span>
        <span className='text-lg font-bold tabular-nums'>
          {hasInput && band ? `USD ${fmtNum(band.amount)}` : '—'}
        </span>
      </div>
    </div>
  )
}

/** Wrap runs of digits (incl. , . separators) in <strong> so example numbers stand out. */
