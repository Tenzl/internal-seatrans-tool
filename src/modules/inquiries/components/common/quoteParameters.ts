/**
 * Canonical EPDA quote parameters — the single source of truth for every numeric
 * value that drives the Quote (PDF) calculation and the Create-EPDA form.
 *
 * Historically these numbers were hardcoded inside Quote-hcm.tsx / Quote-qn.tsx
 * (and a few in the form). They are now configurable per port-area (with per-port
 * overrides) and stored in the backend `epda_parameter_set` table. This module
 * defines the shared shape, the built-in defaults (which mirror the previous
 * hardcoded values exactly, so behaviour is unchanged when no row exists), and the
 * tier-resolution helpers.
 *
 * The two Quote variants differ structurally:
 *  - HCM: moor/unmoor has TWO tables (at berth + at buoy), pilotage is 3-leg,
 *    tug is an 8-step LOA table, navigation 0.1, clearance 50.
 *  - QN: moor/unmoor is ONE table, pilotage is single-rate with a USD600 minimum,
 *    tug is a 5-step LOA table, navigation 0.058, clearance 100.
 * The superset below carries fields for both; each variant reads what it needs.
 */

import { parseFiniteNumber } from '@/shared/utils/parseNumber'
import { legacyCargoTypeToCode } from '@/modules/gallery/shippingAgencyCargoCatalog'

export type QuoteVariant = 'HCM' | 'QN' | 'HN'

/** A GRT-banded rate. `maxGrt: null` = the catch-all top band (no upper bound). */
export interface GrtTier {
  maxGrt: number | null
  amount: number
  label: string
}

/** An LOA-banded rate. The band applies when `loa >= minLoa` (highest match wins). */
export interface LoaTier {
  minLoa: number
  amount: number
  label: string
}

/** Agency fee on cargo (BB section) keyed by cargo type code, USD/MT. */
export interface CargoAgencyRate {
  /** Normalized cargo type code (e.g. IN_BULK, EQUIPMENT). */
  code: string
  label: string
  rate: number
}

export interface EpdaParameterValues {
  hours: {
    berthHours: number
    anchorageHours: number
    /** HCM pilotage 3rd-leg miles. */
    pilotageThirdMiles: number
    /** QN pilotage miles. */
    qnPilotageMiles: number
  }
  garbage: {
    /** USD/cbm/2days when vessel is at berth. */
    atBerthUsd: number
    /** USD/cbm/2days when vessel is at buoy / anchorage. */
    atBuoyUsd: number
    cbmAmount: number
  }
  quarantine: {
    /** Per-trip ship quarantine unit when GRT < threshold. */
    shipUnitLowGrt: number
    /** Per-trip ship quarantine unit when GRT >= threshold. */
    shipUnitHighGrt: number
    shipThresholdGrt: number
    /** Per-trip cargo quarantine fee. */
    cargoPerTrip: number
  }
  coeff: {
    tonnagePerGrt: number
    navigationPerGrt: number
    /** Tonnage multiplier for tanker ships (e.g. 0.85). */
    tankerFactor: number
    /** Tonnage multiplier for bulk ships (default 1 = full rate). */
    bulkFactor: number
    berthDuePerGrtHour: number
    buoyDuePerGrtHour: number
    anchoragePerGrtHour: number
    clearanceFee: number
    oceanFrtDefaultRate: number
    oceanFrtTaxRate: number
    /** HCM 3-leg pilotage. */
    pilotageLeg1Rate: number
    pilotageLeg1Miles: number
    pilotageLeg2Rate: number
    pilotageLeg2Miles: number
    pilotageLeg3Rate: number
    /** QN single-rate pilotage + minimum. */
    pilotageSingleRate: number
    pilotageMinAmount: number
    /** Agency fee on cargo (BB section), USD/MT by cargo category. */
    cargoAgencyBagRate: number
    cargoAgencyEquipRate: number
    cargoAgencyBulkRate: number
  }
  agencyFeeTiers: GrtTier[]
  /** HCM "at berth" table / QN single moor-unmoor table. */
  moorUnmoorBerthTiers: GrtTier[]
  /** HCM "at buoy" table. Empty/unused for QN. */
  moorUnmoorBuoyTiers: GrtTier[]
  tugTiers: LoaTier[]
  /** Per-cargo-type agency fee on cargo. Missing/invalid rates resolve to zero. */
  cargoAgencyRates: CargoAgencyRate[]
}

/** Deep-partial of the values blob — port overrides only carry changed fields. */
export type PartialEpdaParameterValues = {
  hours?: Partial<EpdaParameterValues['hours']>
  garbage?: Partial<EpdaParameterValues['garbage']>
  quarantine?: Partial<EpdaParameterValues['quarantine']>
  coeff?: Partial<EpdaParameterValues['coeff']>
  agencyFeeTiers?: GrtTier[]
  moorUnmoorBerthTiers?: GrtTier[]
  moorUnmoorBuoyTiers?: GrtTier[]
  tugTiers?: LoaTier[]
  cargoAgencyRates?: CargoAgencyRate[]
}

const AGENCY_FEE_TIERS: GrtTier[] = [
  { maxGrt: 1000, amount: 0, label: '0 - 1,000' },
  { maxGrt: 3000, amount: 500, label: '1,001 - 3,000' },
  { maxGrt: 6000, amount: 600, label: '3,001 - 6,000' },
  { maxGrt: 10000, amount: 700, label: '6,001 - 10,000' },
  { maxGrt: 15000, amount: 850, label: '10,001 - 15,000' },
  { maxGrt: 25000, amount: 1000, label: '15,001 - 25,000' },
  { maxGrt: 50000, amount: 1150, label: '25,001 - 50,000' },
  { maxGrt: null, amount: 1300, label: '50,001+' },
]

function hcmDefaults(): EpdaParameterValues {
  return {
    // pilotageThirdMiles here = default buoy position (total miles); leg 3 = position − (leg1+leg2).
    hours: { berthHours: 96, anchorageHours: 24, pilotageThirdMiles: 47, qnPilotageMiles: 5 },
    garbage: { atBerthUsd: 54, atBuoyUsd: 54, cbmAmount: 1 },
    quarantine: { shipUnitLowGrt: 95, shipUnitHighGrt: 110, shipThresholdGrt: 10000, cargoPerTrip: 100 },
    coeff: {
      tonnagePerGrt: 0.034,
      navigationPerGrt: 0.1,
      tankerFactor: 0.85,
      bulkFactor: 1,
      berthDuePerGrtHour: 0.0031,
      buoyDuePerGrtHour: 0.0013,
      anchoragePerGrtHour: 0.0005,
      clearanceFee: 50,
      oceanFrtDefaultRate: 16,
      oceanFrtTaxRate: 0.02,
      pilotageLeg1Rate: 0.0034,
      pilotageLeg1Miles: 10,
      pilotageLeg2Rate: 0.0022,
      pilotageLeg2Miles: 20,
      pilotageLeg3Rate: 0.0015,
      pilotageSingleRate: 0.0034,
      pilotageMinAmount: 600,
      cargoAgencyBagRate: 0.06,
      cargoAgencyEquipRate: 0.1,
      cargoAgencyBulkRate: 0.05,
    },
    agencyFeeTiers: AGENCY_FEE_TIERS.map((t) => ({ ...t })),
    moorUnmoorBerthTiers: [
      { maxGrt: 4000, amount: 74, label: '<= 4,000' },
      { maxGrt: 9999, amount: 110, label: '4,001 - <10,000' },
      { maxGrt: 14999, amount: 144, label: '10,001 - <15,000' },
      { maxGrt: 19999, amount: 180, label: '15,001 - <20,000' },
      { maxGrt: null, amount: 220, label: '>= 20,001' },
    ],
    moorUnmoorBuoyTiers: [
      { maxGrt: 4000, amount: 180, label: '<= 4,000' },
      { maxGrt: 9999, amount: 240, label: '4,001 - <10,000' },
      { maxGrt: 14999, amount: 330, label: '10,001 - <15,000' },
      { maxGrt: 19999, amount: 380, label: '15,001 - <20,000' },
      { maxGrt: null, amount: 440, label: '>= 20,001' },
    ],
    tugTiers: [
      { minLoa: 80, amount: 510, label: '80 - <95m' },
      { minLoa: 95, amount: 1020, label: '95 - <120m' },
      { minLoa: 120, amount: 1490, label: '120 - <145m' },
      { minLoa: 145, amount: 1960, label: '145 - <160m' },
      { minLoa: 160, amount: 2180, label: '160 - <175m' },
      { minLoa: 175, amount: 2400, label: '175 - <190m' },
      { minLoa: 190, amount: 2600, label: '190 - <205m' },
      { minLoa: 205, amount: 2800, label: '≥ 205m' },
    ],
    // Empty by default: the PDF displays a zero on-cargo rate until an admin
    // configures the cargo type on the Parameter screen.
    cargoAgencyRates: [],
  }
}

function qnDefaults(): EpdaParameterValues {
  const hcm = hcmDefaults()
  return {
    ...hcm,
    garbage: { atBerthUsd: 17, atBuoyUsd: 17, cbmAmount: 1 },
    coeff: {
      ...hcm.coeff,
      navigationPerGrt: 0.058,
      clearanceFee: 100,
    },
    agencyFeeTiers: AGENCY_FEE_TIERS.map((t) => ({ ...t })),
    // QN: a single moor/unmoor table (kept in the "berth" slot); no buoy table.
    moorUnmoorBerthTiers: [
      { maxGrt: 499, amount: 32, label: '< 500' },
      { maxGrt: 1000, amount: 50, label: '500 - <1,000' },
      { maxGrt: 4000, amount: 66, label: '1,001 - <4,000' },
      { maxGrt: 10000, amount: 120, label: '4,001 - <10,000' },
      { maxGrt: 15000, amount: 140, label: '10,001 - <15,000' },
      { maxGrt: null, amount: 180, label: '> 15,000' },
    ],
    moorUnmoorBuoyTiers: [],
    tugTiers: [
      { minLoa: 0, amount: 1154, label: '0 - <90m' },
      { minLoa: 90, amount: 2308, label: '90 - <135m' },
      { minLoa: 135, amount: 3956, label: '135 - <175m' },
      { minLoa: 175, amount: 6792, label: '175 - <200m' },
      { minLoa: 200, amount: 9916, label: '≥ 200m' },
    ],
  }
}

/** Coerce tier/scalar fields from API JSON (strings) into real numbers for comparisons. */
function coerceScalars<T extends Record<string, number>>(obj: T): T {
  const out = { ...obj }
  for (const key of Object.keys(out) as (keyof T)[]) {
    const n = parseFiniteNumber(out[key])
    if (n !== null) out[key] = n as T[keyof T]
  }
  return out
}

function coerceGrtTier(tier: GrtTier): GrtTier {
  return {
    ...tier,
    maxGrt: tier.maxGrt === null ? null : (parseFiniteNumber(tier.maxGrt) ?? 0),
    amount: parseFiniteNumber(tier.amount) ?? 0,
  }
}

function formatGrtNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/**
 * Auto-generate GRT tier labels from Max GRT values (moor / agency bands).
 * Max GRT stays exactly as entered; label is derived from previous → this band.
 */
export function withAutoGrtTierLabels(tiers: GrtTier[]): GrtTier[] {
  const coerced = tiers.map(coerceGrtTier)
  const order = coerced
    .map((tier, index) => ({ index, maxGrt: tier.maxGrt }))
    .sort((a, b) => {
      if (a.maxGrt === null && b.maxGrt === null) return a.index - b.index
      if (a.maxGrt === null) return 1
      if (b.maxGrt === null) return -1
      return a.maxGrt - b.maxGrt || a.index - b.index
    })

  const labels = new Array<string>(coerced.length)
  let prevMax: number | null = null
  for (let i = 0; i < order.length; i += 1) {
    const { index, maxGrt } = order[i]
    if (maxGrt === null) {
      labels[index] = prevMax === null ? '≥ 0' : `≥ ${formatGrtNumber(prevMax + 1)}`
    } else if (prevMax === null) {
      labels[index] = `≤ ${formatGrtNumber(maxGrt)}`
    } else {
      labels[index] = `${formatGrtNumber(prevMax + 1)} - <${formatGrtNumber(maxGrt + 1)}`
    }
    if (maxGrt !== null) prevMax = maxGrt
  }

  return coerced.map((tier, index) => ({ ...tier, label: labels[index] ?? tier.label }))
}

function coerceLoaTier(tier: LoaTier): LoaTier {
  return {
    ...tier,
    minLoa: parseFiniteNumber(tier.minLoa) ?? 0,
    amount: parseFiniteNumber(tier.amount) ?? 0,
  }
}

/** Format a single tug-band label from its min LOA and the next higher band (if any). */
export function formatLoaTierLabel(minLoa: number, nextMinLoa: number | null): string {
  const fmt = (n: number) => {
    if (Number.isInteger(n)) return String(n)
    return String(n)
  }
  if (nextMinLoa === null) return `≥ ${fmt(minLoa)}m`
  return `${fmt(minLoa)} - <${fmt(nextMinLoa)}m`
}

/**
 * Auto-generate tug tier labels from Min LOA values.
 * Min LOA stays exactly as entered; label is derived from this band → next higher band.
 */
export function withAutoLoaTierLabels(tiers: LoaTier[]): LoaTier[] {
  const mins = tiers.map((tier) => parseFiniteNumber(tier.minLoa) ?? 0)
  return tiers.map((tier, index) => {
    const minLoa = mins[index]
    const nextMinLoa =
      mins
        .filter((n) => n > minLoa)
        .sort((a, b) => a - b)[0] ?? null
    return {
      ...tier,
      minLoa,
      amount: parseFiniteNumber(tier.amount) ?? 0,
      label: formatLoaTierLabel(minLoa, nextMinLoa),
    }
  })
}

/** Normalize values loaded from API/DB so numeric comparisons work with decimals. */
export function normalizeParameterValues(values: EpdaParameterValues): EpdaParameterValues {
  const safe = values ?? defaultParameterValues('HCM')
  return {
    hours: coerceScalars(safe.hours ?? defaultParameterValues('HCM').hours),
    garbage: coerceScalars(safe.garbage ?? defaultParameterValues('HCM').garbage),
    quarantine: coerceScalars(safe.quarantine ?? defaultParameterValues('HCM').quarantine),
    coeff: coerceScalars(safe.coeff ?? defaultParameterValues('HCM').coeff),
    agencyFeeTiers: (safe.agencyFeeTiers ?? []).map(coerceGrtTier),
    moorUnmoorBerthTiers: withAutoGrtTierLabels(safe.moorUnmoorBerthTiers ?? []),
    moorUnmoorBuoyTiers: withAutoGrtTierLabels(safe.moorUnmoorBuoyTiers ?? []),
    // Drop empty placeholder tug rows (amount 0); refresh labels from min LOA.
    tugTiers: withAutoLoaTierLabels(
      (safe.tugTiers ?? []).map(coerceLoaTier).filter((tier) => tier.amount > 0),
    ),
    cargoAgencyRates: (safe.cargoAgencyRates ?? []).map((row) => ({
      ...row,
      rate: parseFiniteNumber(row.rate) ?? 0,
    })),
  }
}

/** Built-in defaults for a variant (mirror the previously hardcoded values). */
export function defaultParameterValues(variant: QuoteVariant = 'HCM'): EpdaParameterValues {
  if (variant === 'QN') return qnDefaults()
  // HN (Area 1) uses the HCM parameter set; pilotage calc follows the QN formula.
  return hcmDefaults()
}

/** Resolve a GRT-banded amount. Returns `undefined` for a null/empty tier list or GRT. */
export function resolveGrtTier(
  grt: number | null | undefined,
  tiers: GrtTier[],
): { amount: number; label: string } | undefined {
  const grtNum = parseFiniteNumber(grt)
  if (grtNum === null || !tiers.length) return undefined
  for (const tier of tiers) {
    const maxGrt = tier.maxGrt === null ? null : parseFiniteNumber(tier.maxGrt)
    if (maxGrt === null || grtNum <= maxGrt) {
      return { amount: parseFiniteNumber(tier.amount) ?? 0, label: tier.label }
    }
  }
  const last = tiers[tiers.length - 1]
  return { amount: parseFiniteNumber(last.amount) ?? 0, label: last.label }
}

/**
 * Resolve the BB agency fee on cargo in USD/MT.
 *
 * Only the per-cargo-type table is authoritative. Missing and invalid rates resolve
 * to zero so the PDF shows a complete zero-valued row instead of a partial formula.
 */
export function resolveCargoAgencyRate(
  cargoType: string | null | undefined,
  params: EpdaParameterValues,
): number | undefined {
  const code = legacyCargoTypeToCode(cargoType)
  if (!code) return undefined

  const configuredRate = (params.cargoAgencyRates ?? []).find(
    (row) => legacyCargoTypeToCode(row.code) === code,
  )
  return parseFiniteNumber(configuredRate?.rate) ?? 0
}

/** Resolve an LOA-banded amount (highest `minLoa <= loa` wins). */
export function resolveLoaTier(
  loa: number | null | undefined,
  tiers: LoaTier[],
): { amount: number; label: string } | undefined {
  const loaNum = parseFiniteNumber(loa)
  if (loaNum === null || !tiers.length) return undefined
  let match: LoaTier | undefined
  let matchMinLoa = -Infinity
  let matchAmount = -Infinity
  for (const tier of tiers) {
    const minLoa = parseFiniteNumber(tier.minLoa)
    const amount = parseFiniteNumber(tier.amount) ?? 0
    // Skip empty placeholder rows (Add tier defaults to amount 0).
    if (minLoa === null || amount <= 0) continue
    if (loaNum < minLoa) continue
    // Highest minLoa wins; on a tie keep the row with the larger amount.
    if (minLoa > matchMinLoa || (minLoa === matchMinLoa && amount >= matchAmount)) {
      match = tier
      matchMinLoa = minLoa
      matchAmount = amount
    }
  }
  return match ? { amount: matchAmount, label: match.label } : undefined
}

/**
 * Pull a frozen parameter set out of a saved EPDA snapshot (`epdaSnapshot.params`).
 * Returns null when absent or malformed (older records) so callers fall back to
 * live resolution. A snapshot keeps a saved EPDA immune to later Parameter edits.
 */
export function extractParamsSnapshot(snapshot: unknown): EpdaParameterValues | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const p = (snapshot as Record<string, unknown>).params
  if (!p || typeof p !== 'object') return null
  const v = p as Partial<EpdaParameterValues>
  if (!Array.isArray(v.agencyFeeTiers) || !v.coeff || !v.hours || !v.quarantine) return null
  return normalizeParameterValues(p as EpdaParameterValues)
}

/** Deep-merge a base set with a partial override (scalars override; arrays replace). */
export function mergeParameterValues(
  base: EpdaParameterValues,
  override?: PartialEpdaParameterValues | null,
): EpdaParameterValues {
  if (!override) return normalizeParameterValues(base)
  return normalizeParameterValues({
    hours: { ...base.hours, ...override.hours },
    garbage: { ...base.garbage, ...override.garbage },
    quarantine: { ...base.quarantine, ...override.quarantine },
    coeff: { ...base.coeff, ...override.coeff },
    agencyFeeTiers: override.agencyFeeTiers ?? base.agencyFeeTiers,
    moorUnmoorBerthTiers: override.moorUnmoorBerthTiers ?? base.moorUnmoorBerthTiers,
    moorUnmoorBuoyTiers: override.moorUnmoorBuoyTiers ?? base.moorUnmoorBuoyTiers,
    tugTiers: override.tugTiers ?? base.tugTiers,
    cargoAgencyRates: override.cargoAgencyRates ?? base.cargoAgencyRates,
  })
}
