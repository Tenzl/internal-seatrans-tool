import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'
import type {
  BookingPartnerDetail,
  BookingPartnerListItem,
  PartnerImportCommitData,
  PartnerImportMode,
  PartnerImportPreviewData,
  BookingPartnerListParams,
  BookingPartnerPageData,
  BookingPartnerUpsertRequest,
  CustomerStatus,
} from '@/features/admin/types/partnerManagement.types'

/** Matches backend max page size — one API request per table page */
export const PARTNERS_PAGE_SIZE = 100

const buildListQuery = (params: BookingPartnerListParams) => {
  const query = new URLSearchParams()

  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? PARTNERS_PAGE_SIZE))
  query.set('sort', params.sort ?? 'updatedAt,desc')
  query.set('additionTypesMode', params.additionTypesMode ?? 'OR')
  query.set('includeArchived', String(params.includeArchived ?? false))

  if (params.q?.trim()) query.set('q', params.q.trim())
  if (params.customerStatus) query.set('customerStatus', params.customerStatus)
  if (params.customerType) query.set('customerType', params.customerType)

  if (params.additionTypes && params.additionTypes.length > 0) {
    params.additionTypes.forEach((type) => query.append('additionTypes', type))
  }

  return query.toString()
}

const unwrap = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Request failed')
  }
  return payload.data
}

export interface PartnerOption {
  id: number
  name: string
  customerId: string
}

export const partnerManagementService = {
  async listOptions(q?: string, limit = 30): Promise<PartnerOption[]> {
    const search = new URLSearchParams()
    if (q?.trim()) search.set('q', q.trim())
    search.set('limit', String(limit))
    const response = await apiClient.get<ApiResponse<PartnerOption[]>>(
      `${API_CONFIG.BOOKING_PARTNERS.OPTIONS}?${search.toString()}`,
    )
    return unwrap<PartnerOption[]>(response)
  },

  async list(params: BookingPartnerListParams): Promise<BookingPartnerPageData> {
    const query = buildListQuery(params)
    const response = await apiClient.get<ApiResponse<BookingPartnerPageData>>(
      `${API_CONFIG.BOOKING_PARTNERS.ADMIN_BASE}?${query}`,
    )
    return unwrap<BookingPartnerPageData>(response)
  },

  async detail(id: number): Promise<BookingPartnerDetail> {
    const response = await apiClient.get<ApiResponse<BookingPartnerDetail>>(API_CONFIG.BOOKING_PARTNERS.ADMIN_BY_ID(id))
    return unwrap<BookingPartnerDetail>(response)
  },

  async create(request: BookingPartnerUpsertRequest): Promise<BookingPartnerDetail> {
    const response = await apiClient.post<ApiResponse<BookingPartnerDetail>>(API_CONFIG.BOOKING_PARTNERS.ADMIN_BASE, request)
    return unwrap<BookingPartnerDetail>(response)
  },

  async update(id: number, request: BookingPartnerUpsertRequest): Promise<BookingPartnerDetail> {
    const response = await apiClient.put<ApiResponse<BookingPartnerDetail>>(API_CONFIG.BOOKING_PARTNERS.ADMIN_BY_ID(id), request)
    return unwrap<BookingPartnerDetail>(response)
  },

  async updateCustomerStatus(id: number, customerStatus: CustomerStatus): Promise<BookingPartnerDetail> {
    const response = await apiClient.patch<ApiResponse<BookingPartnerDetail>>(
      API_CONFIG.BOOKING_PARTNERS.UPDATE_CUSTOMER_STATUS(id),
      { customerStatus },
    )
    return unwrap<BookingPartnerDetail>(response)
  },

  async delete(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<null>>(API_CONFIG.BOOKING_PARTNERS.ADMIN_BY_ID(id))
    await unwrap(response)
  },

  async previewImport(file: File): Promise<PartnerImportPreviewData> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<ApiResponse<PartnerImportPreviewData>>(
      API_CONFIG.BOOKING_PARTNERS.IMPORT_PREVIEW,
      formData,
    )

    return unwrap<PartnerImportPreviewData>(response)
  },

  async commitImport(file: File, mode: PartnerImportMode): Promise<PartnerImportCommitData> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', mode)

    const response = await apiClient.post<ApiResponse<PartnerImportCommitData>>(
      API_CONFIG.BOOKING_PARTNERS.IMPORT_COMMIT,
      formData,
    )

    return unwrap<PartnerImportCommitData>(response)
  },

  getImportTemplateUrl(): string {
    return `${API_CONFIG.API_URL}${API_CONFIG.BOOKING_PARTNERS.IMPORT_TEMPLATE}`
  },
}
