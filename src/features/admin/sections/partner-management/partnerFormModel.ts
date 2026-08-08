import type {
  ApproveStatus,
  BookingPartnerDetail,
  BookingPartnerUpsertRequest,
  CustomerStatus,
  CustomerType,
  PartnerAdditionType,
  PartnerContact,
} from './partnerManagementTypes'

export type PartnerFormState = {
  name: string
  customerId: string
  additionTypes: PartnerAdditionType[]
  country: string
  city: string
  contacts: PartnerContact[]
  phone: string
  fax: string
  trackingUrl: string
  address: string
  customerStatus: CustomerStatus | ''
  customerType: CustomerType | ''
  approveStatus: ApproveStatus | ''
  approveBy: string
  companyEstablishmentDate: string
  paymentDueDays: string
  contractNo: string
  taxNumber: string
  invoiceCompanyName: string
  invoiceCompanyAddress: string
  invoiceCompanyPhone: string
  invoiceCompanyEmail: string
  invoiceBankName: string
  invoiceBankBranch: string
  invoiceBankAccount: string
}

export const PARTNER_ADDITION_TYPE_OPTIONS: PartnerAdditionType[] = [
  'CUSTOMER',
  'SHIPPER',
  'CONSIGNEE',
  'NOTIFY_PARTY',
  'CARRIER',
  'CO_LOADER',
  'AIR_LINE',
  'TRUCK_VENDOR',
  'OTHER_VENDORS',
]

export const CUSTOMER_STATUS_OPTIONS: CustomerStatus[] = ['LEAD', 'WINCLIENT']
export const CUSTOMER_TYPE_OPTIONS: CustomerType[] = [
  'AGENT',
  'DIRECT',
  'OTHER',
]
export const APPROVE_STATUS_OPTIONS: ApproveStatus[] = [
  'APPROVED',
  'PENDING',
  'REJECTED',
]

export const formatAdditionTypeLabel = (type: PartnerAdditionType): string =>
  type === 'OTHER_VENDORS' ? 'OTHER VENDOR' : type.replace(/_/g, ' ')

export const formatCustomerStatusLabel = (status: CustomerStatus): string =>
  status === 'WINCLIENT' ? 'WIN CLIENT' : status

export const formatCustomerTypeLabel = (type: CustomerType): string => type

export const createEmptyPartnerContact = (): PartnerContact => ({
  person: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  title: '',
  dateOfBirth: '',
})

export const createEmptyPartnerForm = (): PartnerFormState => ({
  name: '',
  customerId: '',
  additionTypes: [],
  country: '',
  city: '',
  contacts: [],
  phone: '',
  fax: '',
  trackingUrl: '',
  address: '',
  customerStatus: '',
  customerType: '',
  approveStatus: '',
  approveBy: '',
  companyEstablishmentDate: '',
  paymentDueDays: '',
  contractNo: '',
  taxNumber: '',
  invoiceCompanyName: '',
  invoiceCompanyAddress: '',
  invoiceCompanyPhone: '',
  invoiceCompanyEmail: '',
  invoiceBankName: '',
  invoiceBankBranch: '',
  invoiceBankAccount: '',
})

export const partnerDetailToForm = (
  detail: BookingPartnerDetail
): PartnerFormState => ({
  name: detail.name || '',
  customerId: detail.customerId || '',
  additionTypes: detail.additionTypes || [],
  country: detail.country || '',
  city: detail.city || '',
  contacts: (detail.contacts || []).map((contact) => ({
    ...createEmptyPartnerContact(),
    ...contact,
  })),
  phone: detail.phone || '',
  fax: detail.fax || '',
  trackingUrl: detail.trackingUrl || '',
  address: detail.address || '',
  customerStatus: detail.customerStatus || '',
  customerType: detail.customerType || '',
  approveStatus: detail.approveStatus || '',
  approveBy: detail.approveBy || '',
  companyEstablishmentDate: detail.companyEstablishmentDate || '',
  paymentDueDays:
    detail.paymentDueDays != null ? String(detail.paymentDueDays) : '',
  contractNo: detail.contractNo || '',
  taxNumber: detail.taxNumber || '',
  invoiceCompanyName: detail.invoiceCompanyName || '',
  invoiceCompanyAddress: detail.invoiceCompanyAddress || '',
  invoiceCompanyPhone: detail.invoiceCompanyPhone || '',
  invoiceCompanyEmail: detail.invoiceCompanyEmail || '',
  invoiceBankName: detail.invoiceBankName || '',
  invoiceBankBranch: detail.invoiceBankBranch || '',
  invoiceBankAccount: detail.invoiceBankAccount || '',
})

export const partnerFormToRequest = (
  form: PartnerFormState
): BookingPartnerUpsertRequest => {
  const paymentDueDays = form.paymentDueDays.trim()

  return {
    name: form.name,
    customerId: form.customerId || undefined,
    additionTypes: form.additionTypes,
    country: form.country || undefined,
    city: form.city || undefined,
    contacts: form.contacts,
    phone: form.phone || undefined,
    fax: form.fax || undefined,
    trackingUrl: form.trackingUrl || undefined,
    address: form.address || undefined,
    customerStatus: form.customerStatus || undefined,
    customerType: form.customerType || undefined,
    approveStatus: form.approveStatus || undefined,
    approveBy: form.approveBy || undefined,
    companyEstablishmentDate: form.companyEstablishmentDate || undefined,
    paymentDueDays: paymentDueDays ? Number(paymentDueDays) : undefined,
    contractNo: form.contractNo || undefined,
    taxNumber: form.taxNumber,
    invoiceCompanyName: form.invoiceCompanyName || undefined,
    invoiceCompanyAddress: form.invoiceCompanyAddress || undefined,
    invoiceCompanyPhone: form.invoiceCompanyPhone || undefined,
    invoiceCompanyEmail: form.invoiceCompanyEmail || undefined,
    invoiceBankName: form.invoiceBankName || undefined,
    invoiceBankBranch: form.invoiceBankBranch || undefined,
    invoiceBankAccount: form.invoiceBankAccount || undefined,
  }
}

export const validatePartnerForm = (form: PartnerFormState): string | null =>
  form.name.trim() ? null : 'Name is required'
