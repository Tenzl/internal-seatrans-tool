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

export type AdditionTypesMode = 'OR' | 'AND'
export type PartnerImportMode = 'CREATE_ONLY' | 'UPDATE_ONLY' | 'UPSERT'

export interface BookingPartnerListItem {
  id: number
  customerId: string
  name: string
  additionTypes: PartnerAdditionType[]
  country?: string | null
  city?: string | null
  contactEmail?: string | null
  phone?: string | null
  fax?: string | null
  trackingUrl?: string | null
  address?: string | null
  customerStatus?: CustomerStatus | null
  customerType?: CustomerType | null
  taxNumber: string
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  deletedAt?: string | null
}

export interface BookingPartnerDetail extends BookingPartnerListItem {}

export interface BookingPartnerUpsertRequest {
  name: string
  additionTypes: PartnerAdditionType[]
  country?: string
  city?: string
  contactEmail?: string
  phone?: string
  fax?: string
  trackingUrl?: string
  address?: string
  customerStatus?: CustomerStatus
  customerType?: CustomerType
  taxNumber: string
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
