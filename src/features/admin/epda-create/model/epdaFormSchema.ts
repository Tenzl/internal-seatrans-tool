import { z } from 'zod'
import type { EpdaCreateState, EpdaFormField } from './epdaForm.types'

const requiredText = z.string().trim().min(1)
const positiveNumberText = z
  .string()
  .trim()
  .refine((value) => value !== '' && Number(value) > 0)

const requiredFieldsSchema = z.object({
  toShipowner: requiredText,
  mv: requiredText,
  dischargeLoadingLocation: requiredText,
  dwt: positiveNumberText,
  grt: positiveNumberText,
  loa: positiveNumberText,
  cargoQty: positiveNumberText,
  cargoType: requiredText,
  purposeOfCalling: requiredText,
})

export type EpdaValidationErrors = Partial<
  Record<EpdaFormField | 'portId' | 'areaCode' | 'customerUserId', string>
>

export interface EpdaValidationOptions {
  mode?: 'draft' | 'complete'
  cargoNameRequired?: boolean
}

export function validateEpdaState(
  state: EpdaCreateState,
  options: EpdaValidationOptions = {},
): EpdaValidationErrors {
  const errors: EpdaValidationErrors = {}
  if (!state.identity.areaCode) errors.areaCode = 'Select a port area.'
  if (!state.identity.portId) errors.portId = 'Select a port of call.'
  if ((options.mode ?? 'complete') === 'draft') return errors

  const result = requiredFieldsSchema.safeParse(state.fields)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as EpdaFormField
      errors[field] = field === 'dwt' || field === 'grt' || field === 'loa' || field === 'cargoQty'
        ? 'Enter a number greater than 0.'
        : 'This field is required.'
    }
  }
  if (options.cargoNameRequired !== false && !state.fields.cargoName.trim()) {
    errors.cargoName = 'This field is required.'
  }
  if (
    (state.fields.purposeOfCalling === 'NHAP_XUAT' ||
      state.fields.purposeOfCalling === 'CHUYEN_CANG_XUAT') &&
    !state.fields.frtTaxType.trim()
  ) {
    errors.frtTaxType = 'Select the freight-tax mode for this purpose of call.'
  }
  return errors
}
