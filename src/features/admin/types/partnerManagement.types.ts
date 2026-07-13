export type PartnerAdditionType =
  | 'CUSTOMER'
  | 'SHIPPER'
  | 'CONSIGNEE'
  | 'NOTIFY_PARTY'
  | 'CARRIER'
  | 'CO_LOADER'
  | 'AIR_LINE'
  | 'TRUCK_VENDOR'
  | 'OTHER_VENDORS'

export type CustomerStatus = 'LEAD' | 'WINCLIENT'
export type CustomerType = 'AGENT' | 'DIRECT' | 'OTHER'
export type ApproveStatus = 'APPROVED' | 'PENDING' | 'REJECTED'

export type AdditionTypesMode = 'OR' | 'AND'
export type PartnerImportMode = 'CREATE_ONLY' | 'UPDATE_ONLY' | 'UPSERT'

/** One contact person; a partner can have zero or many (stored as JSON). */
export interface PartnerContact {
  person?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  title?: string | null
  dateOfBirth?: string | null
}

export interface BookingPartnerListItem {
  id: number
  customerId: string
  name: string
  additionTypes: PartnerAdditionType[]
  country?: string | null
  city?: string | null
  contacts: PartnerContact[]
  phone?: string | null
  fax?: string | null
  trackingUrl?: string | null
  address?: string | null
  customerStatus?: CustomerStatus | null
  customerType?: CustomerType | null
  approveStatus?: ApproveStatus | null
  approveBy?: string | null
  companyEstablishmentDate?: string | null
  paymentDueDays?: number | null
  contractNo?: string | null
  taxNumber: string
  invoiceCompanyName?: string | null
  invoiceCompanyAddress?: string | null
  invoiceCompanyPhone?: string | null
  invoiceCompanyEmail?: string | null
  invoiceBankName?: string | null
  invoiceBankBranch?: string | null
  invoiceBankAccount?: string | null
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  deletedAt?: string | null
}

export type BookingPartnerDetail = BookingPartnerListItem

export interface BookingPartnerUpsertRequest {
  name: string
  customerId?: string
  additionTypes: PartnerAdditionType[]
  country?: string
  city?: string
  contacts?: PartnerContact[]
  phone?: string
  fax?: string
  trackingUrl?: string
  address?: string
  customerStatus?: CustomerStatus
  customerType?: CustomerType
  approveStatus?: ApproveStatus
  approveBy?: string
  companyEstablishmentDate?: string
  paymentDueDays?: number
  contractNo?: string
  taxNumber: string
  invoiceCompanyName?: string
  invoiceCompanyAddress?: string
  invoiceCompanyPhone?: string
  invoiceCompanyEmail?: string
  invoiceBankName?: string
  invoiceBankBranch?: string
  invoiceBankAccount?: string
}

export interface BookingPartnerPageData {
  content: BookingPartnerListItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last?: boolean
  hasNext: boolean
}

export interface BookingPartnerListParams {
  page?: number
  size?: number
  sort?: string
  q?: string
  customerStatus?: CustomerStatus
  customerType?: CustomerType
  additionTypes?: PartnerAdditionType[]
  additionTypesMode?: AdditionTypesMode
  includeArchived?: boolean
}

export interface PartnerImportRowError {
  rowIndex: number
  field?: string
  message: string
  code?: string
}

export interface PartnerImportPreviewData {
  headers: string[]
  rows: Array<Record<string, string>>
  rowErrors: PartnerImportRowError[]
  summary: {
    total: number
    valid: number
    invalid: number
  }
}

export interface PartnerImportCommitData {
  createdCount: number
  updatedCount: number
  failedCount: number
  rowErrors?: PartnerImportRowError[]
}
