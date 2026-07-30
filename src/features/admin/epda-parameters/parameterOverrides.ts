import type {
  EpdaParameterValues,
  PartialEpdaParameterValues,
} from '@/modules/inquiries/services/epdaParametersService'

type Translate = (
  key: string,
  vars?: Record<string, string | number>,
) => string

export function cloneParameterValues(
  values: EpdaParameterValues,
): EpdaParameterValues {
  return JSON.parse(JSON.stringify(values)) as EpdaParameterValues
}

/** Return only parameter values that differ from the inherited baseline. */
export function diffParameterValues(
  baseline: EpdaParameterValues,
  edited: EpdaParameterValues,
): PartialEpdaParameterValues {
  const override: PartialEpdaParameterValues = {}

  const diffObject = <T extends Record<string, number>>(
    base: T,
    next: T,
  ): Partial<T> => {
    const changed: Partial<T> = {}
    for (const key of Object.keys(next) as Array<keyof T>) {
      if (next[key] !== base[key]) changed[key] = next[key]
    }
    return changed
  }

  const hours = diffObject(baseline.hours, edited.hours)
  if (Object.keys(hours).length) override.hours = hours
  const garbage = diffObject(baseline.garbage, edited.garbage)
  if (Object.keys(garbage).length) override.garbage = garbage
  const quarantine = diffObject(baseline.quarantine, edited.quarantine)
  if (Object.keys(quarantine).length) override.quarantine = quarantine
  const coeff = diffObject(baseline.coeff, edited.coeff)
  if (Object.keys(coeff).length) override.coeff = coeff

  const copyArrayWhenChanged = <
    K extends
      | 'agencyFeeTiers'
      | 'moorUnmoorBerthTiers'
      | 'moorUnmoorBuoyTiers'
      | 'tugTiers'
      | 'cargoAgencyRates',
  >(
    key: K,
  ) => {
    if (JSON.stringify(edited[key]) !== JSON.stringify(baseline[key])) {
      Object.assign(override, { [key]: edited[key] })
    }
  }

  copyArrayWhenChanged('agencyFeeTiers')
  copyArrayWhenChanged('moorUnmoorBerthTiers')
  copyArrayWhenChanged('moorUnmoorBuoyTiers')
  copyArrayWhenChanged('tugTiers')
  copyArrayWhenChanged('cargoAgencyRates')

  return override
}

export function getOverrideSectionLabels(
  t: Translate,
  values?: PartialEpdaParameterValues | null,
): string[] {
  if (!values) return []

  const labels: string[] = []
  const coefficientKeys = Object.keys(values.coeff ?? {})

  if (coefficientKeys.some((key) => key.startsWith('pilotage'))) {
    labels.push(t('sec.pilotage.title'))
  }
  if (
    Object.keys(values.garbage ?? {}).length > 0 ||
    coefficientKeys.includes('clearanceFee')
  ) {
    labels.push(t('sec.garbage.title'))
  }
  if (
    (values.moorUnmoorBerthTiers?.length ?? 0) > 0 ||
    (values.moorUnmoorBuoyTiers?.length ?? 0) > 0
  ) {
    labels.push(t('sec.moor.title'))
  }
  if ((values.tugTiers?.length ?? 0) > 0) {
    labels.push(t('sec.tug.title'))
  }

  return [...new Set(labels)]
}
