import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'
import type {
  BookingPartnerDetail,
  PartnerImportCommitData,
  PartnerImportMode,
  PartnerImportPreviewData,
  PartnerImportRowError,
  BookingPartnerListParams,
  BookingPartnerPageData,
  BookingPartnerUpsertRequest,
  CustomerStatus,
} from '@/features/admin/types/partnerManagement.types'

/** Rows fetched per table page (server-side pagination). */
export const PARTNERS_PAGE_SIZE = 20

/** Bulk import can take a while against a remote DB — allow up to 5 minutes. */
const IMPORT_TIMEOUT_MS = 300000

// ---------------------------------------------------------------------------
// Import response adapters
// The backend returns a flat shape ({ total, valid, invalid, rows:[{index,
// data, isValid, errors}] } for preview; { successCount, errorCount,
// errorDetails } for commit). The UI consumes PartnerImportPreviewData /
// PartnerImportCommitData, so we map between them here.
// ---------------------------------------------------------------------------

interface RawImportPreviewRow {
  index: number
  data: Record<string, unknown>
  isValid: boolean
  errors: string[]
}

interface RawImportPreview {
  total: number
  valid: number
  invalid: number
  rows: RawImportPreviewRow[]
}

interface RawImportCommit {
  totalInput: number
  successCount: number
  errorCount: number
  successIndexes: number[]
  errorDetails: Array<{ index: number; message: string }>
}

const stringifyCell = (value: unknown): string => {
  if (value == null) return ''
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

const adaptPreview = (raw: RawImportPreview): PartnerImportPreviewData => {
  const rows = raw.rows ?? []
  const rowErrors: PartnerImportRowError[] = rows
    .filter((row) => !row.isValid)
    .flatMap((row) =>
      (row.errors?.length ? row.errors : ['Invalid row']).map((message) => ({
        rowIndex: row.index,
        message,
      })),
    )
  const validRows = rows
    .filter((row) => row.isValid)
    .map((row) => {
      const out: Record<string, string> = {}
      for (const [key, value] of Object.entries(row.data ?? {})) {
        out[key] = stringifyCell(value)
      }
      return out
    })

  return {
    headers: validRows.length ? Object.keys(validRows[0]) : [],
    rows: validRows,
    rowErrors,
    summary: { total: raw.total ?? 0, valid: raw.valid ?? 0, invalid: raw.invalid ?? 0 },
  }
}

const adaptCommit = (raw: RawImportCommit): PartnerImportCommitData => ({
  createdCount: raw.successCount ?? 0,
  updatedCount: 0,
  failedCount: raw.errorCount ?? 0,
  rowErrors: (raw.errorDetails ?? []).map((error) => ({
    rowIndex: error.index,
    message: error.message,
  })),
})

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

  /** Wipe ALL partners (to re-import a fresh dataset). */
  async deleteAll(): Promise<{ deleted: number }> {
    const response = await apiClient.delete<ApiResponse<{ deleted: number }>>(
      API_CONFIG.BOOKING_PARTNERS.ADMIN_BASE,
    )
    return unwrap<{ deleted: number }>(response)
  },

  async previewImport(file: File): Promise<PartnerImportPreviewData> {
    const formData = new FormData()
    formData.append('file', file)

    // Parsing + validating a large file can take a while; relax the timeout.
    const response = await apiClient.post<ApiResponse<RawImportPreview>>(
      API_CONFIG.BOOKING_PARTNERS.IMPORT_PREVIEW,
      formData,
      { timeout: IMPORT_TIMEOUT_MS },
    )

    return adaptPreview(await unwrap<RawImportPreview>(response))
  },

  async commitImport(file: File, mode: PartnerImportMode): Promise<PartnerImportCommitData> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', mode)

    // Commit inserts rows one-by-one against a remote DB; allow several minutes.
    const response = await apiClient.post<ApiResponse<RawImportCommit>>(
      API_CONFIG.BOOKING_PARTNERS.IMPORT_COMMIT,
      formData,
      { timeout: IMPORT_TIMEOUT_MS },
    )

    return adaptCommit(await unwrap<RawImportCommit>(response))
  },

  getImportTemplateUrl(): string {
    return `${API_CONFIG.API_URL}${API_CONFIG.BOOKING_PARTNERS.IMPORT_TEMPLATE}`
  },
}
