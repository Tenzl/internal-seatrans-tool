import type { EpdaSectionId } from '@/features/admin/components/invoice/epdaFormLayout.config'
import type { RequiredFieldKey } from '@/features/admin/components/invoice/invoiceValidation'

const FIELD_SECTIONS: Record<RequiredFieldKey, EpdaSectionId> = {
  toShipowner: 'epda-general',
  mv: 'epda-general',
  dischargeLoadingLocation: 'epda-general',
  dwt: 'epda-general',
  grt: 'epda-general',
  loa: 'epda-general',
  cargoQty: 'epda-general',
  cargoType: 'epda-general',
  cargoName: 'epda-general',
  purposeOfCalling: 'epda-dues',
  frtTaxType: 'epda-dues',
}

const SECTION_ORDER: EpdaSectionId[] = [
  'epda-general',
  'epda-dues',
  'epda-agency',
]

export function findFirstMissingEpdaSection(
  missingFields: Array<{ key: RequiredFieldKey }>
) {
  return SECTION_ORDER.find((sectionId) =>
    missingFields.some((field) => FIELD_SECTIONS[field.key] === sectionId)
  )
}
