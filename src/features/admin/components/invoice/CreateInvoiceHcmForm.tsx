import { CreateInvoiceVariantForm, type InvoiceVariantFormProps } from './CreateInvoiceVariantForm'

export function CreateInvoiceHcmForm(props: Omit<InvoiceVariantFormProps, 'variant'>) {
  return <CreateInvoiceVariantForm {...props} variant="HCM" />
}
