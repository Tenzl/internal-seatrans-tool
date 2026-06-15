'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, History, Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
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
  QUARANTINE_CARGO_OPTIONS,
  type AreaOption,
} from '@/features/admin/components/invoice/epdaFormParameters'
import { PURPOSE_OF_CALLING_OPTIONS } from '@/modules/inquiries/constants/shippingAgencyInquiryOptions'
import {
  defaultParameterValues,
  mergeParameterValues,
  type CargoAgencyRate,
  type GrtTier,
  type LoaTier,
  type QuoteVariant,
} from '@/modules/inquiries/components/common/quoteParameters'
import { SHIPPING_AGENCY_CARGO_TYPES } from '@/modules/gallery/shippingAgencyCargoCatalog'
import {
  epdaParametersService,
  type EpdaParameterSet,
  type EpdaParameterValues,
  type PartialEpdaParameterValues,
} from '@/features/admin/services/epdaParametersService'
import { portService } from '@/modules/logistics/services/portService'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { LanguageToggle } from '@/shared/i18n/LanguageToggle'

// Areas shown in the parameter editor. NORTHERN is temporarily hidden here (it
// stays in AREA_OPTIONS so the Create EPDA form keeps working). To bring it back,
// just use AREA_OPTIONS directly again.
const VISIBLE_AREA_OPTIONS = AREA_OPTIONS.filter((a) => a !== 'NORTHERN')

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
      <div className='overflow-x-auto'>
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
      <div className='overflow-x-auto'>
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
    </div>
  )
}

const normalizeCargoTypeCode = (value: string): string =>
  (value || '').trim().toUpperCase().replace(/[\s-]+/g, '_')

/**
 * "Agency fee on cargo" table — one USD/MT rate per cargo type. Cargo types are a
 * FIXED enum (Bag/Pack, Equipment, Bulk); staff edit only the rate, never the set.
 */
function CargoAgencyRateTable({
  rates,
  onChange,
}: {
  rates: CargoAgencyRate[]
  onChange: (rates: CargoAgencyRate[]) => void
}) {
  const { t } = useI18n()

  const rateFor = (code: string) =>
    rates.find((r) => normalizeCargoTypeCode(r.code) === normalizeCargoTypeCode(code))?.rate ?? 0

  // Always emit exactly the 3 fixed types, in enum order, with the edited rate.
  const setRate = (code: string, label: string, rate: number) => {
    const edited = new Map(rates.map((r) => [normalizeCargoTypeCode(r.code), r.rate]))
    edited.set(normalizeCargoTypeCode(code), rate)
    onChange(
      SHIPPING_AGENCY_CARGO_TYPES.map((ct) => ({
        code: ct.code,
        label: ct.displayLabel,
        rate: edited.get(normalizeCargoTypeCode(ct.code)) ?? 0,
      })),
    )
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='text-sm'>{t('cargoRate.colType')}</TableHead>
            <TableHead className='w-48 text-sm'>{t('cargoRate.colRate')}</TableHead>
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
                  onChange={(n) => setRate(ct.code, ct.displayLabel, n)}
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
function CargoAgencyCalculator({ rates }: { rates: CargoAgencyRate[] }) {
  const { t } = useI18n()
  const [code, setCode] = useState(SHIPPING_AGENCY_CARGO_TYPES[0]?.code ?? '')
  const [mtText, setMtText] = useState('')
  const mt = Number(mtText) || 0
  const rate =
    rates.find((r) => normalizeCargoTypeCode(r.code) === normalizeCargoTypeCode(code))?.rate ?? 0
  const fee = rate * mt

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('cargoAgencyCalc.title')}</h4>

      <div className='grid gap-3 sm:max-w-md sm:grid-cols-2'>
        <div className='grid gap-2'>
          <Label className='text-sm font-medium text-muted-foreground'>{t('cargoRate.colType')}</Label>
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
          <Label className='text-sm font-medium text-muted-foreground'>{t('cargoAgencyCalc.mtLabel')}</Label>
          <Input
            type='number'
            inputMode='decimal'
            placeholder='0'
            value={mtText}
            onChange={(e) => setMtText(e.target.value)}
            className='h-11 text-base tabular-nums'
          />
        </div>
      </div>

      <div className='space-y-2'>
        <p className='text-sm font-medium uppercase tracking-wide text-muted-foreground'>{t('tonnageCalc.detail')}</p>
        <div className='space-y-1'>
          <ScanRow
            label={boldNumbers(t('cargoAgencyCalc.line', { rate: fmtNum(rate), mt: fmtNum(mt) }))}
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
function AgencyByGrtCalculator({ tiers }: { tiers: GrtTier[] }) {
  const { t } = useI18n()
  const [grtText, setGrtText] = useState('')
  const hasInput = grtText.trim() !== ''
  const grt = Number(grtText) || 0
  const band = resolveGrtBand(tiers, grt)

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('agencyCalc.title')}</h4>

      <div className='grid gap-2 sm:max-w-xs'>
        <Label className='text-sm font-medium text-muted-foreground'>{t('tonnageCalc.grtLabel')}</Label>
        <Input
          type='number'
          inputMode='decimal'
          placeholder='0'
          value={grtText}
          onChange={(e) => setGrtText(e.target.value)}
          className='h-11 text-base tabular-nums'
        />
      </div>

      <div className='flex items-center justify-between rounded-md border bg-background/70 px-4 py-3'>
        <span className='text-sm font-medium text-muted-foreground'>
          {!hasInput
            ? t('moorCalc.enterGrt')
            : band
              ? band.label || (band.maxGrt === null ? '∞' : `≤ ${fmtNum(band.maxGrt)}`)
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
 * Live garbage calculator. Garbage = rate/cbm × ⌈days / 2⌉ × cbm (a block per 2 days).
 * Staff enter the days; cbm comes from the volume parameter above. HCM has berth + buoy,
 * QN berth only. Inputs on top, detail below.
 */
function GarbageCalculator({
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
  const cbm = garbage.cbmAmount || 0
  const berthDays = Number(berthDaysText) || 0
  const buoyDays = Number(buoyDaysText) || 0
  const berthBlocks = Math.ceil(berthDays / 2)
  const buoyBlocks = Math.ceil(buoyDays / 2)
  const berth = garbage.atBerthUsd * berthBlocks * cbm
  const buoy = garbage.atBuoyUsd * buoyBlocks * cbm
  const total = berth + (variant === 'HCM' ? buoy : 0) + clearanceFee

  const inputField = (label: string, value: string, onChange: (v: string) => void) => (
    <div className='grid gap-2'>
      <Label className='text-sm font-medium text-muted-foreground'>{label}</Label>
      <Input
        type='number'
        inputMode='decimal'
        placeholder='0'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className='h-11 text-base tabular-nums'
      />
    </div>
  )

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('garbageCalc.title')}</h4>

      {/* Inputs (days) */}
      <div className='grid gap-3 sm:max-w-md sm:grid-cols-2'>
        {inputField(t('garbageCalc.berthDays'), berthDaysText, setBerthDaysText)}
        {variant === 'HCM' && inputField(t('garbageCalc.buoyDays'), buoyDaysText, setBuoyDaysText)}
      </div>

      {/* Detail below */}
      <div className='space-y-2'>
        <p className='text-sm font-medium uppercase tracking-wide text-muted-foreground'>{t('tonnageCalc.detail')}</p>
        <div className='space-y-1'>
          <ScanRow
            label={boldNumbers(t('garbageEx.berth', { days: fmtNum(berthDays), blocks: berthBlocks, rate: fmtNum(garbage.atBerthUsd), cbm: fmtNum(cbm) }))}
            test={boldNumbers(`= USD ${fmtNum(berth)}`)}
          />
          {variant === 'HCM' && (
            <ScanRow
              label={boldNumbers(t('garbageEx.buoy', { days: fmtNum(buoyDays), blocks: buoyBlocks, rate: fmtNum(garbage.atBuoyUsd), cbm: fmtNum(cbm) }))}
              test={boldNumbers(`= USD ${fmtNum(buoy)}`)}
            />
          )}
          <ScanRow label={boldNumbers(t('f.clearance'))} test={boldNumbers(`= USD ${fmtNum(clearanceFee)}`)} />
          <ScanRow label={boldNumbers(t('garbageCalc.totalLine'))} test={boldNumbers(`= USD ${fmtNum(total)}`)} hit />
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
function TonnageDuesCalculator({ coeff }: { coeff: EpdaParameterValues['coeff'] }) {
  const { t } = useI18n()
  const [grtText, setGrtText] = useState('')
  const grt = Number(grtText) || 0
  const tonnage = coeff.tonnagePerGrt * grt * 2
  const navigation = coeff.navigationPerGrt * grt * 2

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('tonnageCalc.title')}</h4>

      {/* GRT input */}
      <div className='grid gap-2 sm:max-w-xs'>
        <Label className='text-sm font-medium text-muted-foreground'>{t('tonnageCalc.grtLabel')}</Label>
        <Input
          type='number'
          inputMode='decimal'
          placeholder='0'
          value={grtText}
          onChange={(e) => setGrtText(e.target.value)}
          className='h-11 text-base tabular-nums'
        />
      </div>

      {/* Detail — recomputes live from the GRT above */}
      <div className='space-y-2'>
        <p className='text-sm font-medium uppercase tracking-wide text-muted-foreground'>{t('tonnageCalc.detail')}</p>
        <div className='space-y-1'>
          <ScanRow
            label={boldNumbers(t('tonnageCalc.tonnageLine', { rate: coeff.tonnagePerGrt, grt: fmtNum(grt) }))}
            test={boldNumbers(`= USD ${fmtNum(tonnage)}`)}
          />
          <ScanRow
            label={boldNumbers(t('tonnageCalc.navLine', { rate: coeff.navigationPerGrt, grt: fmtNum(grt) }))}
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
function PilotageCalculator({
  variant,
  coeff,
}: {
  variant: QuoteVariant
  coeff: EpdaParameterValues['coeff']
}) {
  const { t } = useI18n()
  const [grtText, setGrtText] = useState('')
  const [milesText, setMilesText] = useState('')
  const grt = Number(grtText) || 0
  const miles = Number(milesText) || 0

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('pilotageCalc.title')}</h4>

      {/* GRT + miles / position inputs */}
      <div className='grid gap-4 sm:max-w-md sm:grid-cols-2'>
        <div className='grid gap-2'>
          <Label className='text-sm font-medium text-muted-foreground'>{t('tonnageCalc.grtLabel')}</Label>
          <Input
            type='number'
            inputMode='decimal'
            placeholder='0'
            value={grtText}
            onChange={(e) => setGrtText(e.target.value)}
            className='h-11 text-base tabular-nums'
          />
        </div>
        <div className='grid gap-2'>
          <Label className='text-sm font-medium text-muted-foreground'>
            {variant === 'HCM' ? t('pilotageCalc.positionLabel') : t('pilotageCalc.milesLabel')}
          </Label>
          <Input
            type='number'
            inputMode='decimal'
            placeholder='0'
            value={milesText}
            onChange={(e) => setMilesText(e.target.value)}
            className='h-11 text-base tabular-nums'
          />
        </div>
      </div>

      {/* Detail — recomputes live from the inputs above */}
      <div className='space-y-2'>
        <p className='text-sm font-medium uppercase tracking-wide text-muted-foreground'>{t('tonnageCalc.detail')}</p>
        {variant === 'HCM' ? (
          (() => {
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
                  label={boldNumbers(t('pilotageCalc.leg1', { rate: coeff.pilotageLeg1Rate, grt: fmtNum(grt), miles: fmtNum(leg1Miles) }))}
                  test={boldNumbers(`= USD ${fmtNum(leg1)}`)}
                />
                <ScanRow
                  label={boldNumbers(t('pilotageCalc.leg2', { rate: coeff.pilotageLeg2Rate, grt: fmtNum(grt), miles: fmtNum(leg2Miles) }))}
                  test={boldNumbers(`= USD ${fmtNum(leg2)}`)}
                />
                <ScanRow
                  label={boldNumbers(t('pilotageCalc.leg3', { rate: coeff.pilotageLeg3Rate, grt: fmtNum(grt), miles: fmtNum(leg3Miles) }))}
                  test={boldNumbers(`= USD ${fmtNum(leg3)}`)}
                />
                <ScanRow label={boldNumbers(t('pilotageCalc.total'))} test={boldNumbers(`= USD ${fmtNum(total)}`)} hit />
              </div>
            )
          })()
        ) : (
          (() => {
            const multiplier = miles > 1 ? miles : 1
            const raw = coeff.pilotageSingleRate * grt * 2 * multiplier
            const value = Math.max(raw, coeff.pilotageMinAmount)
            return (
              <div className='space-y-1'>
                <ScanRow
                  label={boldNumbers(t('pilotageCalc.qnLine', { rate: coeff.pilotageSingleRate, grt: fmtNum(grt), miles: fmtNum(multiplier) }))}
                  test={boldNumbers(`= USD ${fmtNum(raw)}`)}
                />
                <ScanRow
                  label={boldNumbers(t('pilotageCalc.qnMin', { min: fmtNum(coeff.pilotageMinAmount) }))}
                  test={boldNumbers(`= USD ${fmtNum(value)}`)}
                  hit
                />
              </div>
            )
          })()
        )}
      </div>
    </div>
  )
}

/** Resolve a GRT tier: the first band whose Max GRT ≥ GRT (last band = the ∞ catch-all). */
function resolveGrtBand(tiers: GrtTier[], grt: number): GrtTier | undefined {
  if (!tiers.length) return undefined
  let i = tiers.findIndex((tr) => tr.maxGrt === null || grt <= tr.maxGrt)
  if (i < 0) i = tiers.length - 1
  return tiers[i]
}

/**
 * Live moor / unmooring calculator. Staff type a GRT and the matched charge appears.
 * QN has a single table; HCM has separate berth & buoy tables, both shown.
 */
function MoorCalculator({
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
  const grt = Number(grtText) || 0
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
        <Label className='text-sm font-medium text-muted-foreground'>{t('tonnageCalc.grtLabel')}</Label>
        <Input
          type='number'
          inputMode='decimal'
          placeholder='0'
          value={grtText}
          onChange={(e) => setGrtText(e.target.value)}
          className='h-11 text-base tabular-nums'
        />
      </div>

      {/* Result(s) — empty state mirrors the tug calculator's row style */}
      {!hasInput ? (
        resultRow(t('moorCalc.enterGrt'), undefined)
      ) : variant === 'HCM' ? (
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
function BerthDuesCalculator({
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
  const grt = Number(grtText) || 0
  const berthHours = Number(berthHoursText) || 0
  const anchorageHours = Number(anchorageHoursText) || 0

  // Each due = rate × hours × GRT.
  const berth = coeff.berthDuePerGrtHour * berthHours * grt
  const buoy = coeff.buoyDuePerGrtHour * anchorageHours * grt
  const anchorage = coeff.anchoragePerGrtHour * anchorageHours * grt

  const inputField = (label: string, value: string, onChange: (v: string) => void) => (
    <div className='grid gap-2'>
      <Label className='text-sm font-medium text-muted-foreground'>{label}</Label>
      <Input
        type='number'
        inputMode='decimal'
        placeholder='0'
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        {inputField(t('f.anchorageHours'), anchorageHoursText, setAnchorageHoursText)}
      </div>

      {/* Detail below — recomputes live from the inputs */}
      <div className='space-y-2'>
        <p className='text-sm font-medium uppercase tracking-wide text-muted-foreground'>{t('tonnageCalc.detail')}</p>
        <div className='space-y-1'>
          <ScanRow
            label={boldNumbers(t('berthDuesCalc.berthLine', { rate: coeff.berthDuePerGrtHour, hours: fmtNum(berthHours), grt: fmtNum(grt) }))}
            test={boldNumbers(`= USD ${fmtNum(berth)}`)}
          />
          {variant === 'HCM' && (
            <ScanRow
              label={boldNumbers(t('berthDuesCalc.buoyLine', { rate: coeff.buoyDuePerGrtHour, hours: fmtNum(anchorageHours), grt: fmtNum(grt) }))}
              test={boldNumbers(`= USD ${fmtNum(buoy)}`)}
            />
          )}
          <ScanRow
            label={boldNumbers(t('berthDuesCalc.anchorageLine', { rate: coeff.anchoragePerGrtHour, hours: fmtNum(anchorageHours), grt: fmtNum(grt) }))}
            test={boldNumbers(`= USD ${fmtNum(anchorage)}`)}
          />
        </div>
      </div>
    </div>
  )
}

/** Ship-quarantine trips by purpose of calling — same mapping the quote/EPDA uses. */
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
function QuarantineCalculator({ q }: { q: EpdaParameterValues['quarantine'] }) {
  const { t } = useI18n()
  const [grtText, setGrtText] = useState('')
  const [purpose, setPurpose] = useState('')
  const [cargoMode, setCargoMode] = useState('')
  const grt = Number(grtText) || 0

  const shipTrips = shipQuarantineTrips(purpose)
  const cargoTrips = QUARANTINE_CARGO_OPTIONS.find((o) => o.value === cargoMode)?.trips ?? 0
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
          <Label className='text-sm font-medium text-muted-foreground'>{t('tonnageCalc.grtLabel')}</Label>
          <Input
            type='number'
            inputMode='decimal'
            placeholder='0'
            value={grtText}
            onChange={(e) => setGrtText(e.target.value)}
            className='h-11 text-base tabular-nums'
          />
        </div>
        <div className='grid gap-2'>
          <Label className='text-sm font-medium text-muted-foreground'>{t('epda.purpose')}</Label>
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
          <Label className='text-sm font-medium text-muted-foreground'>{t('epda.quarantineCargo')}</Label>
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
        <p className='text-sm font-medium uppercase tracking-wide text-muted-foreground'>{t('tonnageCalc.detail')}</p>
        <div className='space-y-1'>
          <ScanRow
            label={boldNumbers(t('quarantineCalc.shipLine', { unit: fmtNum(unit), trips: fmtNum(shipTrips) }))}
            test={boldNumbers(`= USD ${fmtNum(ship)}`)}
          />
          <ScanRow
            label={boldNumbers(t('quarantineCalc.cargoLine', { rate: fmtNum(q.cargoPerTrip), trips: fmtNum(cargoTrips) }))}
            test={boldNumbers(`= USD ${fmtNum(cargo)}`)}
          />
          <ScanRow label={boldNumbers(t('quarantineCalc.totalLine'))} test={boldNumbers(`= USD ${fmtNum(total)}`)} hit />
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
function TugCalculator({ tiers }: { tiers: LoaTier[] }) {
  const { t } = useI18n()
  const [loaText, setLoaText] = useState('')
  const [customText, setCustomText] = useState('')
  const hasInput = loaText.trim() !== ''
  const loa = Number(loaText) || 0

  let matched: LoaTier | undefined
  tiers.forEach((tr) => {
    if (loa >= tr.minLoa && (!matched || tr.minLoa >= matched.minLoa)) matched = tr
  })

  // Above the highest band's Min LOA, the tug charge is negotiable → let the user type it.
  const maxMinLoa = tiers.length ? Math.max(...tiers.map((tr) => tr.minLoa)) : 0
  const isOverLast = hasInput && matched !== undefined && loa >= maxMinLoa

  return (
    <div className='space-y-4 rounded-lg border bg-muted/20 p-4'>
      <h4 className='text-base font-semibold'>{t('tugCalc.title')}</h4>

      {/* LOA input */}
      <div className='grid gap-2 sm:max-w-xs'>
        <Label className='text-sm font-medium text-muted-foreground'>{t('tugCalc.loaLabel')}</Label>
        <Input
          type='number'
          inputMode='decimal'
          placeholder='0'
          value={loaText}
          onChange={(e) => setLoaText(e.target.value)}
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
            <span className='text-sm font-medium text-muted-foreground'>USD</span>
            <Input
              type='number'
              inputMode='decimal'
              placeholder={fmtNum(matched!.amount)}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className='h-9 w-32 text-right text-base font-bold tabular-nums'
            />
          </div>
        ) : (
          <span className='text-lg font-bold tabular-nums'>
            {hasInput && matched ? `USD ${fmtNum(matched.amount)}` : '—'}
          </span>
        )}
      </div>
      {isOverLast && <p className='text-xs text-muted-foreground'>{t('tugCalc.overLast')}</p>}
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
      id: 'tonnage',
      title: t('sec.tonnage.title'),
      desc: t('sec.tonnage.desc'),
      body: (
        <div className='space-y-4'>
          {/* Editable inputs */}
          <div className='grid grid-cols-2 gap-4 sm:max-w-md'>
            <NumberField label={t('f.tonnagePerGrt')} value={values.coeff.tonnagePerGrt} onChange={(n) => setCoeff('tonnagePerGrt', n)} />
            <NumberField label={t('f.navigationPerGrt')} value={values.coeff.navigationPerGrt} onChange={(n) => setCoeff('navigationPerGrt', n)} />
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
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
            <NumberField label={t('f.garbageBerth')} value={values.garbage.atBerthUsd} onChange={(n) => setGarbage('atBerthUsd', n)} />
            {variant === 'HCM' && (
              <NumberField label={t('f.garbageBuoy')} value={values.garbage.atBuoyUsd} onChange={(n) => setGarbage('atBuoyUsd', n)} />
            )}
            <NumberField label={t('f.garbageCbm')} value={values.garbage.cbmAmount} onChange={(n) => setGarbage('cbmAmount', n)} />
            <NumberField label={t('f.clearance')} value={values.coeff.clearanceFee} onChange={(n) => setCoeff('clearanceFee', n)} />
          </div>
          <GarbageCalculator variant={variant} garbage={values.garbage} clearanceFee={values.coeff.clearanceFee} />
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
            </div>
            <div className='rounded-md border p-3'>
              <p className='mb-3 text-base font-semibold'>{t('q.cargoGroup')}</p>
              <NumberField label={t('q.cargoPerTrip')} value={values.quarantine.cargoPerTrip} onChange={(n) => setQ('cargoPerTrip', n)} />
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
          <div>
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
          <PilotageCalculator variant={variant} coeff={values.coeff} />
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
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
            <NumberField label={t('f.berthDue')} value={values.coeff.berthDuePerGrtHour} onChange={(n) => setCoeff('berthDuePerGrtHour', n)} />
            {variant === 'HCM' && (
              <NumberField label={t('f.buoyDue')} value={values.coeff.buoyDuePerGrtHour} onChange={(n) => setCoeff('buoyDuePerGrtHour', n)} />
            )}
            <NumberField label={t('f.anchorageDue')} value={values.coeff.anchoragePerGrtHour} onChange={(n) => setCoeff('anchoragePerGrtHour', n)} />
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
            onChange={(rows) => onChange({ ...values, tugTiers: rows })}
          />
          <TugCalculator tiers={values.tugTiers} />
        </div>
      ),
    },
  ]

  // Pin the lead sections in a fixed order for every template (QN + HCM):
  // 01 tonnage · 02 pilotage · 03 tug · 04 moor · 05 berth/anchorage dues · 06 quarantine · rest.
  const orderedSections = useMemo(() => {
    const lead = ['tonnage', 'pilotage', 'tug', 'moor', 'berth-dues', 'quarantine']
    const picked = lead
      .map((id) => sections.find((s) => s.id === id))
      .filter((s): s is (typeof sections)[number] => Boolean(s))
    const rest = sections.filter((s) => !lead.includes(s.id))
    return [...picked, ...rest]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, variant])

  const [active, setActive] = useState(0)
  const current = orderedSections[Math.min(active, orderedSections.length - 1)]

  return (
    <div className='grid gap-4 lg:grid-cols-[15rem_1fr] lg:gap-8'>
      {/* Numbered section rail — click to view each part. On mobile it's a
          horizontal scroll strip; on desktop a sticky vertical list. */}
      <nav aria-label='Parameter sections' className='min-w-0 lg:sticky lg:top-24 lg:self-start'>
        <ol className='flex min-w-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0'>
          {orderedSections.map((s, i) => {
            const isActive = i === active
            return (
              <li key={s.id} className='shrink-0 lg:shrink'>
                <button
                  type='button'
                  onClick={() => setActive(i)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-left transition-colors lg:w-full lg:gap-3 lg:border-0 lg:py-2.5 ${
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
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-sm lg:text-base ${
                      isActive ? 'font-semibold' : 'font-medium hidden lg:inline'
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
          <span className='text-4xl font-bold tabular-nums leading-none text-primary/30'>
            {String(active + 1).padStart(2, '0')}
          </span>
          <div className='space-y-1'>
            <h3 className='text-2xl font-semibold tracking-tight'>{current.title}</h3>
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
                setActive(active - 1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className='flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-transform active:scale-[0.98]'
            >
              <ChevronLeft className='h-5 w-5 shrink-0 text-muted-foreground' />
              <span className='min-w-0'>
                <span className='block text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                  {t('epda.previous')}
                </span>
                <span className='block truncate text-sm font-medium'>
                  {String(active).padStart(2, '0')} {orderedSections[active - 1].title}
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
                setActive(active + 1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className='flex min-w-0 flex-1 items-center justify-end gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-right transition-transform active:scale-[0.98]'
            >
              <span className='min-w-0'>
                <span className='block text-[11px] font-medium uppercase tracking-wide text-primary'>
                  {t('epda.next')}
                </span>
                <span className='block truncate text-sm font-medium'>
                  {String(active + 2).padStart(2, '0')} {orderedSections[active + 1].title}
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
            {t('phist.title', { area: t(`area.${area}`) })}
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
  const [area, setArea] = useState<AreaOption>(VISIBLE_AREA_OPTIONS[0])
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
            {/* Area selector — pinned under the header on mobile (compact) so you
                can switch area without scrolling back up; static on desktop. */}
            <Tabs
              value={area}
              onValueChange={(v) => handleAreaChange(v as AreaOption)}
              className='sticky top-16 z-30 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none'
            >
              <TabsList className='h-auto w-full lg:w-auto'>
                {VISIBLE_AREA_OPTIONS.map((a) => (
                  <TabsTrigger
                    key={a}
                    value={a}
                    className='flex-1 px-3 py-1.5 text-sm font-medium lg:flex-none lg:px-5 lg:py-2 lg:text-base'
                  >
                    {t(`area.${a}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Card>
              <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle className='text-xl'>
                    {t('param.areaSet', { area: t(`area.${area}`) })}{' '}
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
        <CardTitle>{t('param.portOverrides', { area: t(`area.${area}`) })}</CardTitle>
        <CardDescription>{t('param.portOverridesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex flex-wrap items-end gap-3'>
          <div className='grid gap-1.5'>
            <Label className='text-xs text-muted-foreground'>{t('param.addEditPort')}</Label>
            <Select value={editingPortId ? String(editingPortId) : ''} onValueChange={(v) => beginEdit(Number(v))}>
              <SelectTrigger className='w-full sm:w-72'>
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
            <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
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
