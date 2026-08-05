import { defaultParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import type { InvoiceVariantFormProps } from './invoiceVariantForm.types'
import { AgencyFeeSection } from './variant-form/AgencyFeeSection'
import { GeneralInvoiceSection } from './variant-form/GeneralInvoiceSection'
import { PortDuesSection } from './variant-form/PortDuesSection'

export type {
  FormVariant,
  InvoiceVariantFormComputed,
  InvoiceVariantFormHandlers,
  InvoiceVariantFormOptions,
  InvoiceVariantFormProps,
  InvoiceVariantFormValues,
} from './invoiceVariantForm.types'

export function CreateInvoiceVariantForm(props: InvoiceVariantFormProps) {
  const params = props.params ?? defaultParameterValues(props.variant)

  return (
    <>
      <GeneralInvoiceSection {...props} />
      <PortDuesSection {...props} />
      <AgencyFeeSection
        values={props.values}
        handlers={props.handlers}
        options={props.options}
        activeSection={props.activeSection}
        params={params}
      />
    </>
  )
}
