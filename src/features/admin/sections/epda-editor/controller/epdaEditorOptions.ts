import { PURPOSE_OF_CALLING_OPTIONS } from '@/modules/inquiries/constants/shippingAgencyInquiryOptions'
import {
  AGENCY_FEE_MODE_OPTIONS,
  FRT_TAX_TYPE_OPTIONS,
  QUARANTINE_CARGO_OPTIONS,
  SHIP_TYPE_OPTIONS,
} from '@/features/admin/components/invoice/epdaFormParameters'

const toOptions = <
  T extends { readonly value: string; readonly label: string },
>(
  options: readonly T[]
) => options.map(({ value, label }) => ({ value, label }))

export const EPDA_STATIC_FORM_OPTIONS = {
  shipTypeOptions: toOptions(SHIP_TYPE_OPTIONS),
  purposeOptions: toOptions(PURPOSE_OF_CALLING_OPTIONS),
  quarantineCargoOptions: toOptions(QUARANTINE_CARGO_OPTIONS),
  frtTaxTypeOptions: toOptions(FRT_TAX_TYPE_OPTIONS),
  agencyFeeModeOptions: toOptions(AGENCY_FEE_MODE_OPTIONS),
}
