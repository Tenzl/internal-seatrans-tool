import { CreateInvoiceVariantForm, type InvoiceVariantFormProps } from './CreateInvoiceVariantForm'

/** Area 1 — HCM port-charge worksheet with QN-style pilotage. */
export function CreateInvoiceHnForm(props: Omit<InvoiceVariantFormProps, 'variant'>) {
  return <CreateInvoiceVariantForm {...props} variant="HN" />
}
