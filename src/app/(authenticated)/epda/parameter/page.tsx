'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, History, Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useNavigate } from '@/lib/router'
import {
  AREA_OPTIONS,
  AREA_TO_VARIANT,
  type AreaOption,
} from '@/features/admin/components/invoice/epdaFormParameters'
import {
  defaultParameterValues,
  mergeParameterValues,
  type CargoAgencyRate,
  type GrtTier,
  type LoaTier,
  type QuoteVariant,
} from '@/modules/inquiries/components/common/quoteParameters'
import { commodityService, type CargoTypeCatalogItem } from '@/modules/gallery/services/commodityService'
import { serviceTypeService } from '@/modules/service-types/services/serviceTypeService'
import {
  epdaParametersService,
  type EpdaParameterSet,
  type EpdaParameterValues,
  type PartialEpdaParameterValues,
} from '@/features/admin/services/epdaParametersService'
import { portService } from '@/modules/logistics/services/portService'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { LanguageToggle } from '@/shared/i18n/LanguageToggle'

// ---------- value helpers ----------
function clone(v: EpdaParameterValues): EpdaParameterValues {
  return JSON.parse(JSON.stringify(v))
}

const num = (v: string): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Number input that keeps its own text buffer so decimals can be typed freely.
 * A plain controlled `value={String(n)}` reformats mid-entry — typing "0." snaps
 * back to "0" and the decimal point can never be entered. We only re-sync from the
 * prop when the external value actually diverges (e.g. switching area/port).
 */
function DecimalInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: number
  onChange: (n: number) => void
  className?: string
  placeholder?: string
}) {
  const [text, setText] = useState(value ? String(value) : '')
  useEffect(() => {
    if (Number(text || '0') !== value) setText(value ? String(value) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <Input
      type='number'
      step='any'
      inputMode='decimal'
      className={className}
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const n = Number(e.target.value)
        onChange(Number.isFinite(n) ? n : 0)
      }}
    />
  )
}

/** Build the partial override = only the fields that differ from the area baseline. */
function diffValues(
  base: EpdaParameterValues,
  edited: EpdaParameterValues
): PartialEpdaParameterValues {
  const out: PartialEpdaParameterValues = {}

  const diffObj = <T extends Record<string, number>>(b: T, e: T): Partial<T> => {
    const o: Record<string, number> = {}
    ;(Object.keys(e) as (keyof T)[]).forEach((k) => {
      if (e[k] !== b[k]) o[k as string] = e[k]
    })
    return o as Partial<T>
  }

  const hours = diffObj(base.hours, edited.hours)
  if (Object.keys(hours).length) out.hours = hours
  const garbage = diffObj(base.garbage, edited.garbage)
  if (Object.keys(garbage).length) out.garbage = garbage
  const quarantine = diffObj(base.quarantine, edited.quarantine)
  if (Object.keys(quarantine).length) out.quarantine = quarantine
  const coeff = diffObj(base.coeff, edited.coeff)
  if (Object.keys(coeff).length) out.coeff = coeff

  if (JSON.stringify(edited.agencyFeeTiers) !== JSON.stringify(base.agencyFeeTiers))
    out.agencyFeeTiers = edited.agencyFeeTiers
  if (JSON.stringify(edited.moorUnmoorBerthTiers) !== JSON.stringify(base.moorUnmoorBerthTiers))
    out.moorUnmoorBerthTiers = edited.moorUnmoorBerthTiers
  if (JSON.stringify(edited.moorUnmoorBuoyTiers) !== JSON.stringify(base.moorUnmoorBuoyTiers))
    out.moorUnmoorBuoyTiers = edited.moorUnmoorBuoyTiers
  if (JSON.stringify(edited.tugTiers) !== JSON.stringify(base.tugTiers))
    out.tugTiers = edited.tugTiers
  if (JSON.stringify(edited.cargoAgencyRates) !== JSON.stringify(base.cargoAgencyRates))
    out.cargoAgencyRates = edited.cargoAgencyRates
  return out
}

// ---------- shared field editors ----------
function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number
  step?: string
  onChange: (n: number) => void
}) {
  return (
    <div className='grid gap-2'>
      <Label className='text-sm font-medium text-muted-foreground'>{label}</Label>
      <Input
        type='number'
        step={step ?? 'any'}
        value={String(value)}
        onChange={(e) => onChange(num(e.target.value))}
        className='h-11 text-base tabular-nums'
      />
    </div>
  )
}

function GrtTierTable({
  title,
  tiers,
  onChange,
}: {
  title: string
  tiers: GrtTier[]
  onChange: (tiers: GrtTier[]) => void
}) {
  const { t } = useI18n()
  const setTier = (i: number, patch: Partial<GrtTier>) =>
    onChange(tiers.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  const addTier = () =>
    onChange([...tiers, { maxGrt: 0, amount: 0, label: '' }])
  const removeTier = (i: number) => onChange(tiers.filter((_, idx) => idx !== i))

  return (
    <div>
      <div className='mb-3 flex items-center justify-between gap-3'>
        {title ? (
          <h4 className='text-base font-medium text-muted-foreground'>{title}</h4>
        ) : (
          <span />
        )}
        <Button type='button' variant='outline' size='sm' onClick={addTier}>
          <Plus className='h-4 w-4' /> {t('tbl.addTier')}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='text-sm'>{t('tbl.label')}</TableHead>
            <TableHead className='w-40 text-sm'>{t('tbl.maxGrt')}</TableHead>
            <TableHead className='w-40 text-sm'>{t('tbl.amount')}</TableHead>
            <TableHead className='w-12' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((row, i) => (
            <TableRow key={i}>
              <TableCell>
                <Input className='text-base' value={row.label} onChange={(e) => setTier(i, { label: e.target.value })} />
              </TableCell>
              <TableCell>
                <Input
                  type='number'
                  className='text-base tabular-nums'
                  value={row.maxGrt === null ? '' : String(row.maxGrt)}
                  placeholder='∞'
                  onChange={(e) =>
                    setTier(i, {
                      maxGrt: e.target.value.trim() === '' ? null : num(e.target.value),
                    })
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  type='number'
                  className='text-base tabular-nums'
                  value={String(row.amount)}
                  onChange={(e) => setTier(i, { amount: num(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Button type='button' variant='ghost' size='icon' onClick={() => removeTier(i)}>
                  <Trash2 className='h-4 w-4 text-destructive' />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LoaTierTable({
  title,
  tiers,
  onChange,
}: {
  title: string
  tiers: LoaTier[]
  onChange: (tiers: LoaTier[]) => void
}) {
  const { t } = useI18n()
  const setTier = (i: number, patch: Partial<LoaTier>) =>
    onChange(tiers.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  const addTier = () => onChange([...tiers, { minLoa: 0, amount: 0, label: '' }])
  const removeTier = (i: number) => onChange(tiers.filter((_, idx) => idx !== i))

  return (
    <div>
      <div className='mb-3 flex items-center justify-between gap-3'>
        {title ? (
          <h4 className='text-base font-medium text-muted-foreground'>{title}</h4>
        ) : (
          <span />
        )}
        <Button type='button' variant='outline' size='sm' onClick={addTier}>
          <Plus className='h-4 w-4' /> {t('tbl.addTier')}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='text-sm'>{t('tbl.label')}</TableHead>
            <TableHead className='w-40 text-sm'>{t('tbl.minLoa')}</TableHead>
            <TableHead className='w-40 text-sm'>{t('tbl.amount')}</TableHead>
            <TableHead className='w-12' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((row, i) => (
            <TableRow key={i}>
              <TableCell>
                <Input className='text-base' value={row.label} onChange={(e) => setTier(i, { label: e.target.value })} />
              </TableCell>
              <TableCell>
                <Input
                  type='number'
                  className='text-base tabular-nums'
                  value={String(row.minLoa)}
                  onChange={(e) => setTier(i, { minLoa: num(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Input
                  type='number'
                  className='text-base tabular-nums'
                  value={String(row.amount)}
                  onChange={(e) => setTier(i, { amount: num(e.target.value) })}
                />
              </TableCell>
              <TableCell>
                <Button type='button' variant='ghost' size='icon' onClick={() => removeTier(i)}>
                  <Trash2 className='h-4 w-4 text-destructive' />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const normalizeCargoTypeCode = (value: string): string =>
  (value || '').trim().toUpperCase().replace(/[\s-]+/g, '_')

/**
 * Dynamic "Agency fee on cargo" table: one USD/MT rate per cargo type, freely
 * add/remove. Cargo types are loaded from the catalog (Shipping Agency). Types
 * without a row fall back to the bag/equip/bulk coefficient defaults at quote time.
 */
function CargoAgencyRateTable({
  rates,
  onChange,
}: {
  rates: CargoAgencyRate[]
  onChange: (rates: CargoAgencyRate[]) => void
}) {
  const { t } = useI18n()

  const { data: cargoTypes } = useQuery({
    queryKey: ['cargo-types', 'SHIPPING_AGENCY'],
    queryFn: async () => {
      const services = await serviceTypeService.getAllServiceTypes()
      const sa = services.find(
        (s) => normalizeCargoTypeCode(s.name) === 'SHIPPING_AGENCY',
      )
      if (!sa?.id) return [] as CargoTypeCatalogItem[]
      return commodityService.getCargoTypesByServiceType(sa.id)
    },
  })

  const options = cargoTypes ?? []

  const setRate = (i: number, patch: Partial<CargoAgencyRate>) =>
    onChange(rates.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  const removeRate = (i: number) => onChange(rates.filter((_, idx) => idx !== i))
  const addRate = () => {
    // Pre-select the first cargo type not already in the table.
    const used = new Set(rates.map((r) => normalizeCargoTypeCode(r.code)))
    const next = options.find((o) => !used.has(normalizeCargoTypeCode(o.code)))
    onChange([
      ...rates,
      next
        ? { code: next.code, label: next.displayLabel, rate: 0 }
        : { code: '', label: '', rate: 0 },
    ])
  }

  const labelFor = (code: string) =>
    options.find((o) => normalizeCargoTypeCode(o.code) === normalizeCargoTypeCode(code))?.displayLabel ||
    code

  return (
    <div>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <p className='max-w-prose text-sm text-muted-foreground'>{t('cargoRate.desc')}</p>
        <Button type='button' variant='outline' size='sm' onClick={addRate}>
          <Plus className='h-4 w-4' /> {t('cargoRate.add')}
        </Button>
      </div>
      {rates.length === 0 ? (
        <p className='rounded-md border border-dashed bg-muted/20 px-3 py-3 text-sm text-muted-foreground'>
          {t('cargoRate.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='text-sm'>{t('cargoRate.colType')}</TableHead>
              <TableHead className='w-48 text-sm'>{t('cargoRate.colRate')}</TableHead>
              <TableHead className='w-12' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((row, i) => (
              <TableRow key={i}>
                <TableCell>
                  {options.length > 0 ? (
                    <Select
                      value={row.code}
                      onValueChange={(code) => setRate(i, { code, label: labelFor(code) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('cargoRate.selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((o) => (
                          <SelectItem key={o.code} value={o.code}>
                            {o.displayLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className='text-base'
                      value={row.label || row.code}
                      placeholder={t('cargoRate.selectType')}
                      onChange={(e) =>
                        setRate(i, {
                          code: normalizeCargoTypeCode(e.target.value),
                          label: e.target.value,
                        })
                      }
                    />
                  )}
                </TableCell>
                <TableCell>
                  <DecimalInput
                    className='text-base tabular-nums'
                    value={row.rate}
                    onChange={(n) => setRate(i, { rate: n })}
                  />
                </TableCell>
                <TableCell>
                  <Button type='button' variant='ghost' size='icon' onClick={() => removeRate(i)}>
                    <Trash2 className='h-4 w-4 text-destructive' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

/** Collapsible worked example. Click the summary to reveal the table. */
function ExampleDetails({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className='group rounded-lg border bg-muted/30 [&_summary::-webkit-details-marker]:hidden'>
      <summary className='flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-base font-medium'>
        <ChevronRight className='h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90' />
        {summary}
      </summary>
      <div className='border-t px-4 py-4'>{children}</div>
    </details>
  )
}

/** Wrap runs of digits (incl. , . separators) in <strong> so example numbers stand out. */
function boldNumbers(text: string): ReactNode {
  return text.split(/(\d[\d.,]*)/g).map((part, i) =>
    /^\d/.test(part) ? (
      <strong key={i} className='font-semibold text-foreground'>
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

const fmtNum = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

/** Pick a representative GRT that lands inside a middle band of the given tiers. */
function sampleGrtFor(tiers: GrtTier[]): number {
  if (!tiers.length) return 0
  const i = Math.floor((tiers.length - 1) / 2)
  const tier = tiers[i]
  const prevMax = i > 0 ? tiers[i - 1].maxGrt ?? 0 : 0
  if (tier.maxGrt === null) return prevMax + 5000
  return Math.round((prevMax + tier.maxGrt) / 2)
}

/** Pick a representative LOA that lands inside a middle band of the given tiers. */
function sampleLoaFor(tiers: LoaTier[]): number {
  if (!tiers.length) return 0
  const i = Math.floor(tiers.length / 2)
  const tier = tiers[i]
  const next = tiers[i + 1]
  return next ? Math.round((tier.minLoa + next.minLoa) / 2) : tier.minLoa + 15
}

/** Compact two-column row used inside the guide example tables. */
function ScanRow({
  label,
  test,
  hit,
}: {
  label: ReactNode
  test: ReactNode
  hit?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-md px-3 py-2 text-base ${
        hit ? 'bg-primary/10 font-semibold text-foreground' : 'text-muted-foreground'
      }`}
    >
      <span>{label}</span>
      <span className='tabular-nums'>{test}</span>
    </div>
  )
}

/**
 * Dynamic garbage worked example. Garbage = rate/cbm × ⌈days / 2⌉ × cbm. HCM shows
 * berth-due (3 days) and buoy-due (6 days); QN (MIDDLE) has no buoy due, berth only.
 * Recomputes live as the rates / volume above are edited (like the quarantine example).
 */
function GarbageExample({
  variant,
  garbage,
}: {
  variant: QuoteVariant
  garbage: EpdaParameterValues['garbage']
}) {
  const { t } = useI18n()
  const cbm = garbage.cbmAmount || 1
  const berthDays = 3
  const buoyDays = 6
  const berthBlocks = Math.ceil(berthDays / 2)
  const buoyBlocks = Math.ceil(buoyDays / 2)
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const berthResult = garbage.atBerthUsd * berthBlocks * cbm
  const buoyResult = garbage.atBuoyUsd * buoyBlocks * cbm

  return (
    <div className='space-y-3 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('garbageEx.title')}</h4>
      <p className='max-w-prose text-sm text-muted-foreground'>
        {variant === 'HCM' ? t('garbageEx.bodyHcm') : t('garbageEx.bodyQn')}
      </p>
      <ExampleDetails summary={variant === 'HCM' ? t('garbageEx.summary') : t('garbageEx.summaryQn')}>
        <div className='space-y-1'>
          <ScanRow
            label={boldNumbers(
              t('garbageEx.berth', {
                days: berthDays,
                blocks: berthBlocks,
                rate: fmt(garbage.atBerthUsd),
                cbm,
              }),
            )}
            test={boldNumbers(`= USD ${fmt(berthResult)}`)}
            hit
          />
          {variant === 'HCM' && (
            <ScanRow
              label={boldNumbers(
                t('garbageEx.buoy', {
                  days: buoyDays,
                  blocks: buoyBlocks,
                  rate: fmt(garbage.atBuoyUsd),
                  cbm,
                }),
              )}
              test={boldNumbers(`= USD ${fmt(buoyResult)}`)}
              hit
            />
          )}
        </div>
      </ExampleDetails>
    </div>
  )
}

/**
 * How a GRT tier table is read at quote time (agency + moor). The worked example is
 * computed live from THIS area's tiers (not a shared HCM sample), with numbers bolded.
 */
function GrtLookupGuide({ tiers, sampleGrt }: { tiers: GrtTier[]; sampleGrt: number }) {
  const { t } = useI18n()
  let matchedIndex = tiers.findIndex((tr) => tr.maxGrt === null || sampleGrt <= tr.maxGrt)
  if (matchedIndex < 0) matchedIndex = tiers.length - 1
  const matched = tiers[matchedIndex]

  const scanText = (i: number): string => {
    if (i > matchedIndex) return t('guide.cmpSkip')
    const tr = tiers[i]
    if (tr.maxGrt === null) return t('guide.cmpYes')
    return `${fmtNum(sampleGrt)} ≤ ${fmtNum(tr.maxGrt)}? ${sampleGrt <= tr.maxGrt ? t('guide.cmpYes') : t('guide.cmpNo')}`
  }
  const rowLabel = (tr: GrtTier): string => {
    const range = tr.label || (tr.maxGrt === null ? '∞' : `≤ ${fmtNum(tr.maxGrt)}`)
    return `${range} → ${fmtNum(tr.amount)}`
  }

  return (
    <div className='space-y-3 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('guide.grtTitle')}</h4>
      <p className='max-w-prose text-sm text-muted-foreground'>{t('guide.grtBody')}</p>
      <ExampleDetails summary={t('guide.grtExSummary', { grt: fmtNum(sampleGrt) })}>
        <div className='space-y-1'>
          {tiers.map((tr, i) => (
            <ScanRow key={i} label={boldNumbers(rowLabel(tr))} test={boldNumbers(scanText(i))} hit={i === matchedIndex} />
          ))}
        </div>
        <p className='mt-3 text-base text-muted-foreground'>
          {boldNumbers(
            t('guide.grtExResult', { amount: fmtNum(matched?.amount ?? 0), label: matched?.label ?? '' }),
          )}
        </p>
      </ExampleDetails>
    </div>
  )
}

/**
 * How the LOA tier table is read at quote time (tug). Computed live from THIS area's
 * tug tiers — highest Min LOA ≤ ship LOA wins — with numbers bolded.
 */
function LoaLookupGuide({ tiers, sampleLoa }: { tiers: LoaTier[]; sampleLoa: number }) {
  const { t } = useI18n()
  let matchedIndex = -1
  tiers.forEach((tr, i) => {
    if (sampleLoa >= tr.minLoa && (matchedIndex < 0 || tr.minLoa >= tiers[matchedIndex].minLoa)) {
      matchedIndex = i
    }
  })
  const matched = matchedIndex >= 0 ? tiers[matchedIndex] : undefined

  const scanText = (i: number): string => {
    const tr = tiers[i]
    const ans = sampleLoa >= tr.minLoa ? t('guide.cmpYes') : t('guide.cmpNo')
    return `${fmtNum(sampleLoa)} ≥ ${fmtNum(tr.minLoa)}? ${ans}`
  }
  const rowLabel = (tr: LoaTier): string =>
    `${tr.label || `≥ ${fmtNum(tr.minLoa)}m`} → ${fmtNum(tr.amount)}`

  return (
    <div className='space-y-3 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('guide.loaTitle')}</h4>
      <p className='max-w-prose text-sm text-muted-foreground'>{t('guide.loaBody')}</p>
      <ExampleDetails summary={t('guide.loaExSummary', { loa: fmtNum(sampleLoa) })}>
        <div className='space-y-1'>
          {tiers.map((tr, i) => (
            <ScanRow key={i} label={boldNumbers(rowLabel(tr))} test={boldNumbers(scanText(i))} hit={i === matchedIndex} />
          ))}
        </div>
        <p className='mt-3 text-base text-muted-foreground'>
          {boldNumbers(
            t('guide.loaExResult', { amount: fmtNum(matched?.amount ?? 0), label: matched?.label ?? '' }),
          )}
        </p>
      </ExampleDetails>
    </div>
  )
}

function ValuesEditor({
  variant,
  values,
  onChange,
}: {
  variant: QuoteVariant
  values: EpdaParameterValues
  onChange: (v: EpdaParameterValues) => void
}) {
  const { t } = useI18n()
  const setGarbage = (k: keyof EpdaParameterValues['garbage'], n: number) =>
    onChange({ ...values, garbage: { ...values.garbage, [k]: n } })
  const setQ = (k: keyof EpdaParameterValues['quarantine'], n: number) =>
    onChange({ ...values, quarantine: { ...values.quarantine, [k]: n } })
  const setCoeff = (k: keyof EpdaParameterValues['coeff'], n: number) =>
    onChange({ ...values, coeff: { ...values.coeff, [k]: n } })

  const sections: { id: string; title: string; desc: string; body: ReactNode }[] = [
    {
      id: 'garbage',
      title: t('sec.garbage.title'),
      desc: t('sec.garbage.desc'),
      body: (
        <div className='space-y-6'>
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
            <NumberField label={t('f.garbageBerth')} value={values.garbage.atBerthUsd} onChange={(n) => setGarbage('atBerthUsd', n)} />
            {variant === 'HCM' && (
              <NumberField label={t('f.garbageBuoy')} value={values.garbage.atBuoyUsd} onChange={(n) => setGarbage('atBuoyUsd', n)} />
            )}
            <NumberField label={t('f.garbageCbm')} value={values.garbage.cbmAmount} onChange={(n) => setGarbage('cbmAmount', n)} />
          </div>
          <GarbageExample variant={variant} garbage={values.garbage} />
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
                <NumberField label={t('q.shipSmall')} value={values.quarantine.shipUnitLowGrt} onChange={(n) => setQ('shipUnitLowGrt', n)} />
                <NumberField label={t('q.shipLarge')} value={values.quarantine.shipUnitHighGrt} onChange={(n) => setQ('shipUnitHighGrt', n)} />
                <NumberField label={t('q.threshold')} value={values.quarantine.shipThresholdGrt} onChange={(n) => setQ('shipThresholdGrt', n)} />
              </div>
              <p className='mt-2 text-sm font-medium text-foreground'>
                {t('q.shipExample', {
                  threshold: values.quarantine.shipThresholdGrt,
                  low: values.quarantine.shipUnitLowGrt,
                  high: values.quarantine.shipUnitHighGrt,
                })}
              </p>
            </div>
            <div className='rounded-md border p-3'>
              <p className='mb-3 text-base font-semibold'>{t('q.cargoGroup')}</p>
              <NumberField label={t('q.cargoPerTrip')} value={values.quarantine.cargoPerTrip} onChange={(n) => setQ('cargoPerTrip', n)} />
              <p className='mt-2 text-sm text-muted-foreground'>{t('q.cargoHint')}</p>
            </div>
          </div>

          <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='rounded-md border bg-background/60 p-3'>
                <p className='text-base font-semibold'>{t('q.card1Title')}</p>
                <p className='mt-1 text-base text-muted-foreground'>{t('q.card1Body')}</p>
                <p className='mt-2 text-base text-muted-foreground'>{t('q.card1Trips')}</p>
                <ul className='mt-1 space-y-1 text-base text-muted-foreground'>
                  <li>• {t('q.card1T2')}</li>
                  <li>• {t('q.card1T1')}</li>
                  <li>• {t('q.card1T0')}</li>
                </ul>
                <p className='mt-2 text-base'>{t('q.card1Formula')}</p>
              </div>

              <div className='rounded-md border bg-background/60 p-3'>
                <p className='text-base font-semibold'>{t('q.card2Title')}</p>
                <p className='mt-1 text-base text-muted-foreground'>{t('q.card2Body')}</p>
                <ul className='mt-1 space-y-1 text-base text-muted-foreground'>
                  <li>• {t('q.card2L1')}</li>
                  <li>• {t('q.card2L2')}</li>
                  <li>• {t('q.card2L0')}</li>
                </ul>
                <p className='mt-2 text-base'>{t('q.card2Formula')}</p>
              </div>
            </div>

            <p className='text-base'>
              <span className='font-semibold'>{t('q.total')}</span>
            </p>

            <ExampleDetails summary={t('q.exampleSummary')}>
              <p className='mb-2 text-base text-muted-foreground'>
                {boldNumbers(t('q.exIntro', { threshold: fmtNum(values.quarantine.shipThresholdGrt) }))}
              </p>
              <div className='space-y-1'>
                <ScanRow
                  label={boldNumbers(t('q.exShip', { high: fmtNum(values.quarantine.shipUnitHighGrt) }))}
                  test={boldNumbers(`= ${fmtNum(values.quarantine.shipUnitHighGrt * 2)}`)}
                />
                <ScanRow
                  label={boldNumbers(t('q.exCargo', { cargo: fmtNum(values.quarantine.cargoPerTrip) }))}
                  test={boldNumbers(`= ${fmtNum(values.quarantine.cargoPerTrip * 2)}`)}
                />
                <ScanRow
                  label={boldNumbers(t('q.exTotal'))}
                  test={boldNumbers(
                    `= ${fmtNum(values.quarantine.shipUnitHighGrt * 2 + values.quarantine.cargoPerTrip * 2)}`,
                  )}
                  hit
                />
              </div>
              <p className='mt-3 text-base text-muted-foreground'>
                {boldNumbers(
                  t('q.exSmall', {
                    threshold: fmtNum(values.quarantine.shipThresholdGrt),
                    low: fmtNum(values.quarantine.shipUnitLowGrt),
                    total: fmtNum(values.quarantine.shipUnitLowGrt * 2),
                  }),
                )}
              </p>
            </ExampleDetails>
          </div>
        </div>
      ),
    },
    {
      id: 'coeff',
      title: t('sec.coeff.title'),
      desc: t('sec.coeff.desc'),
      body: (
        <div className='space-y-7'>
          {/* Berth / buoy / anchorage dues (per GRT / hour) */}
          <div className='space-y-3'>
            <h4 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>{t('f.duesGroup')}</h4>
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
              <NumberField label={t('f.berthDue')} value={values.coeff.berthDuePerGrtHour} onChange={(n) => setCoeff('berthDuePerGrtHour', n)} />
              {variant === 'HCM' && (
                <NumberField label={t('f.buoyDue')} value={values.coeff.buoyDuePerGrtHour} onChange={(n) => setCoeff('buoyDuePerGrtHour', n)} />
              )}
              <NumberField label={t('f.anchorageDue')} value={values.coeff.anchoragePerGrtHour} onChange={(n) => setCoeff('anchoragePerGrtHour', n)} />
            </div>
          </div>

          {/* Clearance & ocean freight */}
          <div className='space-y-3'>
            <h4 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>{t('f.freightGroup')}</h4>
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
              <NumberField label={t('f.clearance')} value={values.coeff.clearanceFee} onChange={(n) => setCoeff('clearanceFee', n)} />
              <NumberField label={t('f.oceanFrtRate')} value={values.coeff.oceanFrtDefaultRate} onChange={(n) => setCoeff('oceanFrtDefaultRate', n)} />
              <NumberField label={t('f.oceanFrtTax')} value={values.coeff.oceanFrtTaxRate} onChange={(n) => setCoeff('oceanFrtTaxRate', n)} />
            </div>
          </div>

          {/* Ship type factor (tonnage multiplier per ship type) */}
          <div className='space-y-3'>
            <h4 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>{t('f.shipFactor')}</h4>
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
              <NumberField label={t('f.bulkFactor')} value={values.coeff.bulkFactor} onChange={(n) => setCoeff('bulkFactor', n)} />
              <NumberField label={t('f.tankerFactor')} value={values.coeff.tankerFactor} onChange={(n) => setCoeff('tankerFactor', n)} />
            </div>
          </div>

          {/* Agency fee on cargo (per cargo type) */}
          <div className='space-y-4'>
            <h4 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>{t('f.cargoAgency')}</h4>
            <CargoAgencyRateTable
              rates={values.cargoAgencyRates}
              onChange={(rows) => onChange({ ...values, cargoAgencyRates: rows })}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'tonnage-pilotage',
      title: t('sec.tonnagePilotage.title'),
      desc: t('sec.tonnagePilotage.desc'),
      body: (
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
            <NumberField label={t('f.tonnagePerGrt')} value={values.coeff.tonnagePerGrt} onChange={(n) => setCoeff('tonnagePerGrt', n)} />
            <NumberField label={t('f.navigationPerGrt')} value={values.coeff.navigationPerGrt} onChange={(n) => setCoeff('navigationPerGrt', n)} />
          </div>

          <div>
            {/* Formula sits on the same row as the "Pilotage" heading */}
            <div className='mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1'>
              <h4 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>{t('f.pilotage')}</h4>
              <span className='text-sm text-muted-foreground'>
                {variant === 'HCM' ? t('f.pilotageFormulaHcm') : t('f.pilotageFormulaQn')}
              </span>
            </div>
            <div className='grid gap-4 lg:grid-cols-2'>
              {/* Left: editable inputs */}
              <div className='grid grid-cols-2 gap-4'>
                {variant === 'HCM' ? (
                  <>
                    <NumberField label={t('f.pilotageLeg1Rate')} value={values.coeff.pilotageLeg1Rate} onChange={(n) => setCoeff('pilotageLeg1Rate', n)} />
                    <NumberField label={t('f.pilotageLeg1Miles')} value={values.coeff.pilotageLeg1Miles} onChange={(n) => setCoeff('pilotageLeg1Miles', n)} />
                    <NumberField label={t('f.pilotageLeg2Rate')} value={values.coeff.pilotageLeg2Rate} onChange={(n) => setCoeff('pilotageLeg2Rate', n)} />
                    <NumberField label={t('f.pilotageLeg2Miles')} value={values.coeff.pilotageLeg2Miles} onChange={(n) => setCoeff('pilotageLeg2Miles', n)} />
                    <NumberField label={t('f.pilotageLeg3Rate')} value={values.coeff.pilotageLeg3Rate} onChange={(n) => setCoeff('pilotageLeg3Rate', n)} />
                  </>
                ) : (
                  <>
                    <NumberField label={t('f.pilotageSingleRate')} value={values.coeff.pilotageSingleRate} onChange={(n) => setCoeff('pilotageSingleRate', n)} />
                    <NumberField label={t('f.pilotageMin')} value={values.coeff.pilotageMinAmount} onChange={(n) => setCoeff('pilotageMinAmount', n)} />
                  </>
                )}
              </div>
              {/* Right: worked example — one line per leg */}
              <div className='rounded-md border bg-muted/20 p-3'>
                {variant === 'HCM' ? (
                  <div className='space-y-0.5 text-sm leading-relaxed text-foreground'>
                    <p>{t('f.pilotageLeg1Ex', { rate: values.coeff.pilotageLeg1Rate, miles: values.coeff.pilotageLeg1Miles })}</p>
                    <p>{t('f.pilotageLeg2Ex', { rate: values.coeff.pilotageLeg2Rate, miles: values.coeff.pilotageLeg2Miles, after: values.coeff.pilotageLeg1Miles })}</p>
                    <p>{t('f.pilotageLeg3Ex', { rate: values.coeff.pilotageLeg3Rate, after: values.coeff.pilotageLeg1Miles + values.coeff.pilotageLeg2Miles })}</p>
                    <p className='font-medium'>{t('f.pilotageTotalEx')}</p>
                  </div>
                ) : (
                  <div className='space-y-0.5 text-sm leading-relaxed text-foreground'>
                    <p>{t('f.pilotageQnEx', { rate: values.coeff.pilotageSingleRate })}</p>
                    <p className='font-medium'>{t('f.pilotageQnMin', { min: values.coeff.pilotageMinAmount })}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
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
          <GrtLookupGuide tiers={values.agencyFeeTiers} sampleGrt={sampleGrtFor(values.agencyFeeTiers)} />
        </div>
      ),
    },
    {
      id: 'moor',
      title: t('sec.moor.title'),
      desc: variant === 'HCM' ? t('sec.moor.descHcm') : t('sec.moor.descQn'),
      body: (
        <div className='space-y-8'>
          <GrtTierTable
            title={variant === 'HCM' ? t('tbl.atBerth') : ''}
            tiers={values.moorUnmoorBerthTiers}
            onChange={(rows) => onChange({ ...values, moorUnmoorBerthTiers: rows })}
          />
          {variant === 'HCM' && (
            <GrtTierTable
              title={t('tbl.atBuoy')}
              tiers={values.moorUnmoorBuoyTiers}
              onChange={(rows) => onChange({ ...values, moorUnmoorBuoyTiers: rows })}
            />
          )}
          <GrtLookupGuide
            tiers={values.moorUnmoorBerthTiers}
            sampleGrt={sampleGrtFor(values.moorUnmoorBerthTiers)}
          />
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
            onChange={(rows) => onChange({ ...values, tugTiers: rows })}
          />
          <LoaLookupGuide tiers={values.tugTiers} sampleLoa={sampleLoaFor(values.tugTiers)} />
        </div>
      ),
    },
  ]

  const [active, setActive] = useState(0)
  const current = sections[Math.min(active, sections.length - 1)]

  return (
    <div className='grid gap-8 lg:grid-cols-[15rem_1fr]'>
      {/* Numbered section rail — click to view each part */}
      <nav aria-label='Parameter sections' className='lg:sticky lg:top-24 lg:self-start'>
        <ol className='flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0'>
          {sections.map((s, i) => {
            const isActive = i === active
            return (
              <li key={s.id} className='shrink-0 lg:shrink'>
                <button
                  type='button'
                  onClick={() => setActive(i)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <span
                    className={`text-base font-semibold tabular-nums ${
                      isActive ? 'text-primary' : 'text-muted-foreground/70'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={`text-base ${isActive ? 'font-semibold' : 'font-medium'}`}>
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
          <span className='text-4xl font-bold tabular-nums leading-none text-primary/30'>
            {String(active + 1).padStart(2, '0')}
          </span>
          <div className='space-y-1'>
            <h3 className='text-2xl font-semibold tracking-tight'>{current.title}</h3>
            <p className='text-sm text-muted-foreground'>{current.desc}</p>
          </div>
        </header>
        {current.body}
      </section>
    </div>
  )
}

// ---------- edit-history button + modal ----------
function ParamHistoryButton({ area }: { area: AreaOption }) {
  const { t } = useI18n()
  const { data: logs } = useQuery({
    queryKey: ['epda-param-logs', area],
    queryFn: () => epdaParametersService.listChangeLogs({ area, limit: 50 }),
  })

  if (!logs || logs.length === 0) return null

  const sectionLabel = (k: string): string =>
    ({
      hours: t('sec.hours.title'),
      garbage: t('sec.garbage.title'),
      quarantine: t('sec.quarantine.title'),
      coeff: t('sec.coeff.title'),
      agencyFeeTiers: t('sec.agency.title'),
      moorUnmoorBerthTiers: `${t('sec.moor.title')} (${t('tbl.atBerth')})`,
      moorUnmoorBuoyTiers: `${t('sec.moor.title')} (${t('tbl.atBuoy')})`,
      tugTiers: t('sec.tug.title'),
    })[k] ?? k

  const changedSections = (
    before: PartialEpdaParameterValues | null,
    after: PartialEpdaParameterValues | null,
  ): string[] => {
    const b = (before ?? {}) as Record<string, unknown>
    const a = (after ?? {}) as Record<string, unknown>
    const keys = new Set([...Object.keys(b), ...Object.keys(a)])
    const out: string[] = []
    keys.forEach((k) => {
      if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) out.push(sectionLabel(k))
    })
    return out
  }

  const actionLabel = (action: string) =>
    action === 'UPSERT_AREA'
      ? t('phist.upsertArea')
      : action === 'UPSERT_PORT'
        ? t('phist.upsertPort')
        : t('phist.deletePort')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' className='gap-2'>
          <History className='h-4 w-4' /> {t('phist.btn')} ({logs.length})
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <History className='h-4 w-4 text-muted-foreground' />
            {t('phist.title', { area })}
          </DialogTitle>
        </DialogHeader>
        <ul className='max-h-[60vh] space-y-2 overflow-y-auto pr-1'>
          {logs.map((log) => {
            const isCreate = !log.beforeValues && log.action !== 'DELETE_PORT'
            const sections =
              log.action === 'DELETE_PORT' || isCreate
                ? []
                : changedSections(log.beforeValues, log.afterValues)
            return (
              <li key={log.id} className='rounded-md border border-border/50 bg-muted/20 px-3 py-2.5 text-sm'>
                <div className='flex flex-wrap items-baseline justify-between gap-x-3'>
                  <p className='font-medium'>
                    {actionLabel(log.action)}
                    {log.scope === 'PORT' && log.portId != null ? ` · ${t('phist.port')} #${log.portId}` : ''}
                  </p>
                  <p className='text-[11px] text-muted-foreground'>{new Date(log.createdAt).toLocaleString()}</p>
                </div>
                {log.action !== 'DELETE_PORT' ? (
                  <p className='mt-1 text-[12px] text-muted-foreground'>
                    {isCreate ? t('phist.created') : `${t('phist.changed')}: ${sections.join(', ') || '—'}`}
                  </p>
                ) : null}
                <p className='mt-0.5 text-[11px] text-muted-foreground'>
                  {log.changedBy.fullName ||
                    log.changedBy.email ||
                    (log.changedBy.id ? `User #${log.changedBy.id}` : '—')}
                </p>
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

// ---------- page ----------
export default function Page() {
  const qc = useQueryClient()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [area, setArea] = useState<AreaOption>('NORTHERN')
  // Href the user clicked while there were unsaved edits — drives the leave popup.
  const [leaveHref, setLeaveHref] = useState<string | null>(null)
  // Area tab the user tried to switch to while there were unsaved edits.
  const [pendingArea, setPendingArea] = useState<AreaOption | null>(null)

  const { data: sets, isLoading } = useQuery({
    queryKey: ['epda-parameters'],
    queryFn: () => epdaParametersService.listAll(),
  })

  const variant = AREA_TO_VARIANT[area]
  const areaSet = useMemo<EpdaParameterSet | undefined>(
    () => sets?.find((s) => s.scope === 'AREA' && s.area === area),
    [sets, area]
  )
  const areaValues = useMemo(
    () => mergeParameterValues(defaultParameterValues(variant), areaSet?.values),
    [areaSet, variant]
  )

  const [draft, setDraft] = useState<EpdaParameterValues>(areaValues)
  useEffect(() => setDraft(clone(areaValues)), [areaValues])

  const saveArea = useMutation({
    mutationFn: () => epdaParametersService.upsertArea(area, draft),
    onSuccess: () => {
      toast.success(`Saved parameters for ${area}`)
      qc.invalidateQueries({ queryKey: ['epda-parameters'] })
      qc.invalidateQueries({ queryKey: ['epda-param-logs'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save'),
  })

  // Dirty when the editable draft differs from the saved server values.
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(areaValues),
    [draft, areaValues],
  )

  // Warn before leaving with unsaved area edits — covers refresh/close (beforeunload)
  // and in-app link clicks (e.g. switching to another route via the sidebar).
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || anchor.target === '_blank') return
      // Intercept the in-app navigation and show a styled confirm popup instead
      // of the native window.confirm.
      e.preventDefault()
      e.stopPropagation()
      setLeaveHref(href)
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [isDirty])

  // Switching area tabs is not an <a> click, so guard unsaved edits explicitly here.
  const handleAreaChange = (next: AreaOption) => {
    if (next === area) return
    if (isDirty) {
      setPendingArea(next)
      return
    }
    setArea(next)
  }

  // Discard unsaved edits — switch to the pending area, or go to the captured href.
  const confirmLeave = () => {
    if (pendingArea) {
      setArea(pendingArea)
      setPendingArea(null)
      return
    }
    const href = leaveHref
    setLeaveHref(null)
    if (href) navigate({ to: href })
  }

  // Save the area first, then switch area / continue to the captured destination.
  const saveThenLeave = () => {
    const href = leaveHref
    const nextArea = pendingArea
    saveArea.mutate(undefined, {
      onSuccess: () => {
        if (nextArea) {
          setArea(nextArea)
          setPendingArea(null)
          return
        }
        setLeaveHref(null)
        if (href) navigate({ to: href })
      },
    })
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <LanguageToggle />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div className='space-y-1.5'>
            <h2 className='text-3xl font-bold tracking-tight'>{t('param.title')}</h2>
            <p className='max-w-2xl text-base text-muted-foreground'>{t('param.subtitle')}</p>
          </div>
        </div>

        {isLoading ? (
          <div className='flex min-h-[200px] items-center justify-center'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='mt-4 space-y-6'>
            <Tabs value={area} onValueChange={(v) => handleAreaChange(v as AreaOption)}>
              <TabsList className='h-auto'>
                {AREA_OPTIONS.map((a) => (
                  <TabsTrigger key={a} value={a} className='px-5 py-2 text-base font-medium'>
                    {a}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between'>
                <div>
                  <CardTitle className='text-xl'>
                    {t('param.areaSet', { area })}{' '}
                    <span className='text-base font-normal text-muted-foreground'>
                      ({t('param.template', { variant })})
                    </span>
                  </CardTitle>
                  <CardDescription className='text-base'>{t('param.areaDesc')}</CardDescription>
                </div>
                <div className='flex items-center gap-2'>
                  <ParamHistoryButton area={area} />
                  <Button onClick={() => saveArea.mutate()} disabled={!isDirty || saveArea.isPending}>
                    {saveArea.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}
                    {t('param.saveArea')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ValuesEditor variant={variant} values={draft} onChange={setDraft} />
              </CardContent>
            </Card>

            <PortOverridesCard
              area={area}
              variant={variant}
              areaValues={areaValues}
              overrides={(sets ?? []).filter((s) => s.scope === 'PORT' && s.area === area)}
            />
          </div>
        )}
      </Main>

      <AlertDialog
        open={leaveHref !== null || pendingArea !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLeaveHref(null)
            setPendingArea(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('param.unsavedTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('param.unsavedBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-2'>
            <AlertDialogCancel>{t('param.stay')}</AlertDialogCancel>
            <Button variant='destructive' onClick={confirmLeave} disabled={saveArea.isPending}>
              {t('param.leave')}
            </Button>
            <AlertDialogAction onClick={saveThenLeave} disabled={saveArea.isPending}>
              {saveArea.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}
              {t('param.saveAndLeave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function PortOverridesCard({
  area,
  variant,
  areaValues,
  overrides,
}: {
  area: AreaOption
  variant: QuoteVariant
  areaValues: EpdaParameterValues
  overrides: EpdaParameterSet[]
}) {
  const qc = useQueryClient()
  const { t } = useI18n()
  const [editingPortId, setEditingPortId] = useState<number | null>(null)
  const [draft, setDraft] = useState<EpdaParameterValues>(areaValues)

  const { data: ports } = useQuery({
    queryKey: ['ports-by-area', area],
    queryFn: () => portService.getPortsByArea(area),
  })

  const overrideByPort = useMemo(() => {
    const m = new Map<number, EpdaParameterSet>()
    overrides.forEach((o) => {
      if (o.portId != null) m.set(o.portId, o)
    })
    return m
  }, [overrides])

  // Show the same label Create EPDA uses (portOfCall), falling back to name.
  const portName = (id: number) => {
    const p = ports?.find((x) => x.id === id)
    return p?.portOfCall?.trim() || p?.name || `Port #${id}`
  }

  const beginEdit = (portId: number) => {
    const ov = overrideByPort.get(portId)
    setDraft(mergeParameterValues(areaValues, ov?.values))
    setEditingPortId(portId)
  }

  const save = useMutation({
    mutationFn: () =>
      epdaParametersService.upsertPort(editingPortId!, diffValues(areaValues, draft)),
    onSuccess: () => {
      toast.success('Port override saved')
      qc.invalidateQueries({ queryKey: ['epda-parameters'] })
      qc.invalidateQueries({ queryKey: ['epda-param-logs'] })
      setEditingPortId(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save'),
  })

  const remove = useMutation({
    mutationFn: (portId: number) => epdaParametersService.deletePort(portId),
    onSuccess: () => {
      toast.success('Override removed (port now inherits area)')
      qc.invalidateQueries({ queryKey: ['epda-parameters'] })
      qc.invalidateQueries({ queryKey: ['epda-param-logs'] })
      setEditingPortId(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to remove'),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('param.portOverrides', { area })}</CardTitle>
        <CardDescription>{t('param.portOverridesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex flex-wrap items-end gap-3'>
          <div className='grid gap-1.5'>
            <Label className='text-xs text-muted-foreground'>{t('param.addEditPort')}</Label>
            <Select value={editingPortId ? String(editingPortId) : ''} onValueChange={(v) => beginEdit(Number(v))}>
              <SelectTrigger className='w-72'>
                <SelectValue placeholder={t('param.selectPort')} />
              </SelectTrigger>
              <SelectContent>
                {(ports ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.portOfCall?.trim() || p.name}
                    {overrideByPort.has(p.id) ? `  ${t('param.overrideTag')}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {overrides.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('param.colPort')}</TableHead>
                <TableHead>{t('param.colOverridden')}</TableHead>
                <TableHead className='w-28' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {overrides.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className='font-medium'>{portName(o.portId!)}</TableCell>
                  <TableCell className='text-muted-foreground'>
                    {Object.keys(o.values ?? {}).join(', ') || '—'}
                  </TableCell>
                  <TableCell className='flex gap-1'>
                    <Button variant='ghost' size='sm' onClick={() => beginEdit(o.portId!)}>
                      {t('common.edit')}
                    </Button>
                    <Button variant='ghost' size='icon' onClick={() => remove.mutate(o.portId!)}>
                      <RotateCcw className='h-4 w-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {editingPortId && (
          <Card className='border-primary/40'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <CardTitle className='text-base'>{t('param.overrideTitle', { port: portName(editingPortId) })}</CardTitle>
              <div className='flex gap-2'>
                <Button variant='outline' size='sm' onClick={() => setEditingPortId(null)}>
                  {t('common.cancel')}
                </Button>
                <Button size='sm' onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}
                  {t('param.saveOverride')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ValuesEditor variant={variant} values={draft} onChange={setDraft} />
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
