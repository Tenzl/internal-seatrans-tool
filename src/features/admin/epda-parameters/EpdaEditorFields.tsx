'use client'

import { SHIPPING_AGENCY_CARGO_TYPES } from '@/modules/gallery/shippingAgencyCargoCatalog'
import {
  withAutoGrtTierLabels,
  withAutoLoaTierLabels,
  type CargoAgencyRate,
  type GrtTier,
  type LoaTier,
} from '@/modules/inquiries/components/common/quoteParameters'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { parseFiniteNumber } from '@/shared/utils/parseNumber'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DecimalInput } from './DecimalInput'

const num = (value: string): number => parseFiniteNumber(value) ?? 0

export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className='grid gap-2'>
      <Label className='text-sm font-medium text-muted-foreground'>
        {label}
      </Label>
      <DecimalInput
        value={value}
        onChange={onChange}
        className='h-11 text-base tabular-nums'
      />
    </div>
  )
}

export function GrtTierTable({
  title,
  tiers,
  onChange,
  autoLabels = false,
}: {
  title: string
  tiers: GrtTier[]
  onChange: (tiers: GrtTier[]) => void
  /** When true, labels are derived from Max GRT (moor/unmoor). */
  autoLabels?: boolean
}) {
  const { t } = useI18n()
  const emit = (next: GrtTier[]) =>
    onChange(autoLabels ? withAutoGrtTierLabels(next) : next)
  const setTier = (i: number, patch: Partial<GrtTier>) =>
    emit(tiers.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  const addTier = () => emit([...tiers, { maxGrt: 0, amount: 0, label: '' }])
  const removeTier = (i: number) => emit(tiers.filter((_, idx) => idx !== i))
  const displayTiers = autoLabels ? withAutoGrtTierLabels(tiers) : tiers

  return (
    <div>
      <div className='mb-3 flex items-center justify-between gap-3'>
        {title ? (
          <h4 className='text-base font-medium text-muted-foreground'>
            {title}
          </h4>
        ) : (
          <span />
        )}
        <Button type='button' variant='outline' size='sm' onClick={addTier}>
          <Plus className='h-4 w-4' /> {t('tbl.addTier')}
        </Button>
      </div>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='text-sm'>
                {autoLabels ? t('tbl.labelGrt') : t('tbl.label')}
              </TableHead>
              <TableHead className='w-40 text-sm'>{t('tbl.maxGrt')}</TableHead>
              <TableHead className='w-40 text-sm'>{t('tbl.amount')}</TableHead>
              <TableHead className='w-12' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayTiers.map((row, i) => (
              <TableRow key={i}>
                <TableCell>
                  {autoLabels ? (
                    <span className='text-sm text-muted-foreground tabular-nums'>
                      {row.label}
                    </span>
                  ) : (
                    <Input
                      className='text-base'
                      value={row.label}
                      onChange={(e) => setTier(i, { label: e.target.value })}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type='number'
                    className='text-base tabular-nums'
                    value={row.maxGrt === null ? '' : String(row.maxGrt)}
                    placeholder='∞'
                    onChange={(e) =>
                      setTier(i, {
                        maxGrt:
                          e.target.value.trim() === ''
                            ? null
                            : num(e.target.value),
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  <DecimalInput
                    className='text-base tabular-nums'
                    value={row.amount}
                    onChange={(n) => setTier(i, { amount: n })}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => removeTier(i)}
                  >
                    <Trash2 className='h-4 w-4 text-destructive' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function LoaTierTable({
  title,
  tiers,
  onChange,
}: {
  title: string
  tiers: LoaTier[]
  onChange: (tiers: LoaTier[]) => void
}) {
  const { t } = useI18n()
  const emit = (next: LoaTier[]) => onChange(withAutoLoaTierLabels(next))
  const setTier = (i: number, patch: Partial<LoaTier>) =>
    emit(tiers.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  const addTier = () => emit([...tiers, { minLoa: 0, amount: 0, label: '' }])
  const removeTier = (i: number) => emit(tiers.filter((_, idx) => idx !== i))
  // Labels are derived from Min LOA — keep display in sync even if stored labels are stale.
  const displayTiers = withAutoLoaTierLabels(tiers)

  return (
    <div>
      <div className='mb-3 flex items-center justify-between gap-3'>
        {title ? (
          <h4 className='text-base font-medium text-muted-foreground'>
            {title}
          </h4>
        ) : (
          <span />
        )}
        <Button type='button' variant='outline' size='sm' onClick={addTier}>
          <Plus className='h-4 w-4' /> {t('tbl.addTier')}
        </Button>
      </div>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='text-sm'>{t('tbl.labelLoa')}</TableHead>
              <TableHead className='w-40 text-sm'>{t('tbl.minLoa')}</TableHead>
              <TableHead className='w-40 text-sm'>{t('tbl.amount')}</TableHead>
              <TableHead className='w-12' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayTiers.map((row, i) => (
              <TableRow key={i}>
                <TableCell>
                  <span className='text-sm text-muted-foreground tabular-nums'>
                    {row.label}
                  </span>
                </TableCell>
                <TableCell>
                  <Input
                    type='number'
                    className='text-base tabular-nums'
                    value={String(row.minLoa)}
                    onChange={(e) =>
                      setTier(i, { minLoa: num(e.target.value) })
                    }
                    step='any'
                    min='0'
                  />
                </TableCell>
                <TableCell>
                  <DecimalInput
                    className='text-base tabular-nums'
                    value={row.amount}
                    onChange={(n) => setTier(i, { amount: n })}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => removeTier(i)}
                  >
                    <Trash2 className='h-4 w-4 text-destructive' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

const normalizeCargoTypeCode = (value: string): string =>
  (value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

/**
 * "Agency fee on cargo" table — one USD/MT rate per cargo type. Cargo types are a
 * FIXED enum (Bag/Pack, Equipment, Bulk); staff edit only the rate, never the set.
 */
export function CargoAgencyRateTable({
  rates,
  onChange,
}: {
  rates: CargoAgencyRate[]
  onChange: (rates: CargoAgencyRate[]) => void
}) {
  const { t } = useI18n()

  const rateFor = (code: string) =>
    rates.find(
      (r) => normalizeCargoTypeCode(r.code) === normalizeCargoTypeCode(code)
    )?.rate ?? 0

  // Always emit exactly the 3 fixed types, in enum order, with the edited rate.
  const setRate = (code: string, rate: number) => {
    const edited = new Map(
      rates.map((r) => [normalizeCargoTypeCode(r.code), r.rate])
    )
    edited.set(normalizeCargoTypeCode(code), rate)
    onChange(
      SHIPPING_AGENCY_CARGO_TYPES.map((ct) => ({
        code: ct.code,
        label: ct.displayLabel,
        rate: edited.get(normalizeCargoTypeCode(ct.code)) ?? 0,
      }))
    )
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='text-sm'>{t('cargoRate.colType')}</TableHead>
            <TableHead className='w-48 text-sm'>
              {t('cargoRate.colRate')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SHIPPING_AGENCY_CARGO_TYPES.map((ct) => (
            <TableRow key={ct.code}>
              <TableCell className='text-base'>{ct.displayLabel}</TableCell>
              <TableCell>
                <DecimalInput
                  className='text-base tabular-nums'
                  value={rateFor(ct.code)}
                  onChange={(n) => setRate(ct.code, n)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Live agency-fee-on-cargo calculator. Pick a cargo type + enter quantity (MT);
 * fee = rate (USD/MT) × MT.
 */
