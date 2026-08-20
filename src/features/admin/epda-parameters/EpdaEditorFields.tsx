'use client'

import { useId } from 'react'
import type { CommodityType } from '@/modules/gallery/services/commodityService'
import {
  withAutoGrtTierLabels,
  withAutoLoaTierLabels,
  type CargoAgencyRate,
  type GrtTier,
  type LoaTier,
} from '@/modules/inquiries/components/common/quoteParameters'
import { NumberInput } from '@/shared/components/NumberInput'
import { useI18n } from '@/shared/i18n/I18nProvider'
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
import { buildCanonicalCargoAgencyRates } from './cargoAgencyRateRules'

export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  const inputId = useId()

  return (
    <div className='grid gap-2'>
      <Label
        htmlFor={inputId}
        className='text-sm font-medium text-muted-foreground'
      >
        {label}
      </Label>
      <NumberInput
        id={inputId}
        value={value}
        decimalScale={6}
        onValueChange={(next) => onChange(next ?? 0)}
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
                  <NumberInput
                    className='text-base tabular-nums'
                    value={row.maxGrt}
                    placeholder='∞'
                    onValueChange={(next) => setTier(i, { maxGrt: next })}
                  />
                </TableCell>
                <TableCell>
                  <NumberInput
                    className='text-base tabular-nums'
                    value={row.amount}
                    onValueChange={(next) => setTier(i, { amount: next ?? 0 })}
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
                  <NumberInput
                    className='text-base tabular-nums'
                    value={row.minLoa}
                    onValueChange={(next) => setTier(i, { minLoa: next ?? 0 })}
                  />
                </TableCell>
                <TableCell>
                  <NumberInput
                    className='text-base tabular-nums'
                    value={row.amount}
                    onValueChange={(next) => setTier(i, { amount: next ?? 0 })}
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

/**
 * "Agency fee on cargo" table — one USD/MT rate per database Commodity Type.
 */
export function CargoAgencyRateTable({
  rates,
  commodityTypes,
  onChange,
}: {
  rates: CargoAgencyRate[]
  commodityTypes: CommodityType[]
  onChange: (rates: CargoAgencyRate[]) => void
}) {
  const { t } = useI18n()

  const rateFor = (commodityTypeId: number) =>
    rates.find((row) => row.commodityTypeId === commodityTypeId)?.rate ?? 0

  const setRate = (type: CommodityType, rate: number) =>
    onChange(
      buildCanonicalCargoAgencyRates(commodityTypes, rates, type.id, rate)
    )

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
          {commodityTypes.map((type) => (
            <TableRow key={type.id}>
              <TableCell className='text-base'>{type.name}</TableCell>
              <TableCell>
                <NumberInput
                  className='text-base tabular-nums'
                  value={rateFor(type.id)}
                  decimalScale={6}
                  onValueChange={(next) => setRate(type, next ?? 0)}
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
