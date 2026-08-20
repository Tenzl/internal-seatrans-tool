import {
  mergeEpdaFieldClasses,
  type EpdaCustomerTrackedField,
} from '@/modules/inquiries/components/common/epdaCustomerFieldTracking'
import type { InvoiceVariantFormProps } from '../invoiceVariantForm.types'

type RequiredStateResolver = InvoiceVariantFormProps['getRequiredState']
type CustomerFieldClassResolver =
  InvoiceVariantFormProps['getCustomerFieldClass']

export function createCustomerFieldStyles(
  getRequiredState: RequiredStateResolver,
  getCustomerFieldClass: CustomerFieldClassResolver
) {
  const fieldClass = (
    field: EpdaCustomerTrackedField,
    value: string | null | undefined
  ) =>
    mergeEpdaFieldClasses(
      getRequiredState(value, field).fieldClass,
      getCustomerFieldClass?.(field) ?? ''
    )

  const labelClass = (
    field: EpdaCustomerTrackedField,
    value: string | null | undefined
  ) =>
    mergeEpdaFieldClasses(
      getRequiredState(value, field).labelClass,
      getCustomerFieldClass?.(field)
        ? 'text-emerald-700 dark:text-emerald-400'
        : ''
    )

  return { fieldClass, labelClass }
}
