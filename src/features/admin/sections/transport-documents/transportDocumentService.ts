import { API_CONFIG } from '@/shared/config/api.config'
import type { PageResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'
import type {
  ArrivalNoticePayload,
  BookingConfirmationPayload,
  DeliveryOrderPayload,
  TransportDocumentPayloadMap,
  TransportDocumentRecord,
  TransportDocumentStatus,
  TransportDocumentType,
} from './transportDocument.types'

async function readError(response: Response): Promise<string> {
  const fallback = 'Failed to build PDF preview'
  try {
    const body = (await response.clone().json()) as {
      message?: string | string[]
    }
    if (Array.isArray(body.message)) return body.message.join(', ')
    return body.message || fallback
  } catch {
    const text = await response.text()
    return text.trim() || fallback
  }
}

type UpsertBody<T extends TransportDocumentType> =
  TransportDocumentPayloadMap[T] & {
    status?: TransportDocumentStatus
  }

export const transportDocumentService = {
  async create<T extends TransportDocumentType>(
    type: T,
    payload: UpsertBody<T>
  ): Promise<TransportDocumentRecord> {
    const response = await apiClient.post(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_CREATE(type),
      payload
    )
    return unwrapApiResponse<TransportDocumentRecord>(response)
  },

  async getById(id: number): Promise<TransportDocumentRecord> {
    const response = await apiClient.get(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_BY_ID(id)
    )
    return unwrapApiResponse<TransportDocumentRecord>(response)
  },

  async update<T extends TransportDocumentType>(
    id: number,
    payload: UpsertBody<T>
  ): Promise<TransportDocumentRecord> {
    const response = await apiClient.put(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_UPDATE(id),
      payload
    )
    return unwrapApiResponse<TransportDocumentRecord>(response)
  },

  async lock(id: number): Promise<TransportDocumentRecord> {
    const response = await apiClient.post(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_LOCK(id)
    )
    return unwrapApiResponse<TransportDocumentRecord>(response)
  },

  async archive(id: number): Promise<void> {
    const response = await apiClient.delete(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_ARCHIVE(id)
    )
    if (!response.ok) throw new Error(await readError(response))
  },

  async permanentDelete(id: number): Promise<void> {
    const response = await apiClient.delete(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_PERMANENT_DELETE(id)
    )
    if (!response.ok) throw new Error(await readError(response))
  },

  async history(
    options: {
      type?: TransportDocumentType
      page?: number
      size?: number
    } = {}
  ): Promise<PageResponse<TransportDocumentRecord>> {
    const params = new URLSearchParams()
    if (options.type) params.set('type', options.type)
    params.set('page', String(options.page ?? 0))
    params.set('size', String(options.size ?? 10))
    const response = await apiClient.get(
      `${API_CONFIG.BOOKING_DOCUMENTS.ADMIN_HISTORY}?${params.toString()}`
    )
    return unwrapApiResponse<PageResponse<TransportDocumentRecord>>(response)
  },

  async preview<T extends TransportDocumentType>(
    type: T,
    payload: TransportDocumentPayloadMap[T]
  ): Promise<Blob> {
    const response = await apiClient.post(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_PREVIEW(type),
      payload,
      { headers: { Accept: 'application/pdf' }, timeout: 60_000 }
    )

    if (!response.ok) throw new Error(await readError(response))
    return response.blob()
  },

  previewRecord(record: TransportDocumentRecord): Promise<Blob> {
    switch (record.documentType) {
      case 'an':
        return this.preview('an', record.payload as ArrivalNoticePayload)
      case 'booking':
        return this.preview(
          'booking',
          record.payload as BookingConfirmationPayload
        )
      case 'do':
        return this.preview('do', record.payload as DeliveryOrderPayload)
    }
  },
}
