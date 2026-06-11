import { CreateInvoiceVariantForm, type InvoiceVariantFormProps } from './CreateInvoiceVariantForm'

export function CreateInvoiceQnForm(props: Omit<InvoiceVariantFormProps, 'variant'>) {
  return <CreateInvoiceVariantForm {...props} variant="QN" />
}
