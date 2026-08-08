/** Shared human-readable labels for EPDA parameter fields (history + apply-diff). */

export type EpdaTranslateFn = (
  key: string,
  vars?: Record<string, string | number>
) => string

export type EpdaParameterLabelFns = {
  sectionLabel: (key: string) => string
  fieldLabel: (group: string, key: string) => string
  rowFieldLabel: (group: string, key: string) => string
}

export function epdaSectionLabel(t: EpdaTranslateFn, k: string): string {
  return (
    (
      {
        hours: t('sec.hours.title'),
        garbage: t('sec.garbage.title'),
        quarantine: t('sec.quarantine.title'),
        coeff: t('sec.coeff.title'),
        agencyFeeTiers: t('sec.agency.title'),
        moorUnmoorBerthTiers: `${t('sec.moor.title')} (${t('tbl.atBerth')})`,
        moorUnmoorBuoyTiers: `${t('sec.moor.title')} (${t('tbl.atBuoy')})`,
        tugTiers: t('sec.tug.title'),
        cargoAgencyRates: t('f.cargoAgency'),
      } as Record<string, string>
    )[k] ?? k
  )
}

export function epdaFieldLabel(
  t: EpdaTranslateFn,
  grp: string,
  key: string
): string {
  const map: Record<string, string> = {
    'hours.berthHours': t('f.berthHours'),
    'hours.anchorageHours': t('f.anchorageHours'),
    'garbage.atBerthUsd': t('f.garbageBerth'),
    'garbage.atBuoyUsd': t('f.garbageBuoy'),
    'quarantine.shipUnitLowGrt': t('q.shipSmall'),
    'quarantine.shipUnitHighGrt': t('q.shipLarge'),
    'quarantine.shipThresholdGrt': t('q.threshold'),
    'quarantine.cargoPerTrip': t('q.cargoPerTrip'),
    'coeff.tonnagePerGrt': t('f.tonnagePerGrt'),
    'coeff.navigationPerGrt': t('f.navigationPerGrt'),
    'coeff.tankerFactor': t('f.tankerFactor'),
    'coeff.bulkFactor': t('f.bulkFactor'),
    'coeff.berthDuePerGrtHour': t('f.berthDue'),
    'coeff.buoyDuePerGrtHour': t('f.buoyDue'),
    'coeff.anchoragePerGrtHour': t('f.anchorageDue'),
    'coeff.clearanceFee': t('f.clearance'),
    'coeff.oceanFrtDefaultRate': t('f.oceanFrtRate'),
    'coeff.oceanFrtTaxRate': t('f.oceanFrtTax'),
    'coeff.pilotageLeg1Rate': t('f.pilotageLeg1Rate'),
    'coeff.pilotageLeg1Miles': t('f.pilotageLeg1Miles'),
    'coeff.pilotageLeg2Rate': t('f.pilotageLeg2Rate'),
    'coeff.pilotageLeg2Miles': t('f.pilotageLeg2Miles'),
    'coeff.pilotageLeg3Rate': t('f.pilotageLeg3Rate'),
    'coeff.pilotageSingleRate': t('f.pilotageSingleRate'),
    'coeff.pilotageMinAmount': t('f.pilotageMin'),
    'coeff.cargoAgencyBagRate': t('f.cargoBag'),
    'coeff.cargoAgencyEquipRate': t('f.cargoEquip'),
    'coeff.cargoAgencyBulkRate': t('f.cargoBulk'),
  }
  return map[`${grp}.${key}`] ?? `${epdaSectionLabel(t, grp)} · ${key}`
}

export function epdaRowFieldLabel(
  t: EpdaTranslateFn,
  group: string,
  key: string
): string {
  const map: Record<string, string> = {
    maxGrt: t('tbl.maxGrt'),
    minLoa: t('tbl.minLoa'),
    amount: t('tbl.amount'),
    label: t('tbl.label'),
    code: t('cargoRate.colType'),
    rate: t('cargoRate.colRate'),
  }
  return map[key] ?? `${epdaSectionLabel(t, group)} · ${key}`
}

export function createEpdaParameterLabelFns(
  t: EpdaTranslateFn
): EpdaParameterLabelFns {
  return {
    sectionLabel: (key) => epdaSectionLabel(t, key),
    fieldLabel: (group, key) => epdaFieldLabel(t, group, key),
    rowFieldLabel: (group, key) => epdaRowFieldLabel(t, group, key),
  }
}
