import { API_CONFIG } from '@/shared/config/api.config'
import type { PageResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'
import type {
  BillOfLadingNumberCheck,
  BookingCopySource,
  BookingFlow,
  BookingWorkflow,
  DocumentNumberCheck,
  TransportDocumentPayloadMap,
  TransportDocumentRecord,
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
    bookingFlow?: BookingFlow
    bookingId?: number
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

  async getById(
    type: TransportDocumentType,
    id: number
  ): Promise<TransportDocumentRecord> {
    const response = await apiClient.get(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_BY_ID(type, id)
    )
    return unwrapApiResponse<TransportDocumentRecord>(response)
  },

  async workflow(bookingId: number): Promise<BookingWorkflow> {
    const response = await apiClient.get(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_WORKFLOW(bookingId)
    )
    return unwrapApiResponse<BookingWorkflow>(response)
  },

  async bookingCopySource(bookingId: number): Promise<BookingCopySource> {
    const response = await apiClient.get(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_BOOKING_COPY_SOURCE(bookingId)
    )
    return unwrapApiResponse<BookingCopySource>(response)
  },

  async checkBillOfLadingNumber(
    number: string,
    excludeId?: number
  ): Promise<BillOfLadingNumberCheck> {
    const response = await apiClient.get(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_HBL_DUPLICATES(number, excludeId)
    )
    return unwrapApiResponse<BillOfLadingNumberCheck>(response)
  },

  async checkDocumentNumber(
    type: TransportDocumentType,
    number: string,
    excludeId?: number
  ): Promise<DocumentNumberCheck> {
    const response = await apiClient.get(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_NUMBER_DUPLICATES(
        type,
        number,
        excludeId
      )
    )
    return unwrapApiResponse<DocumentNumberCheck>(response)
  },

  async update<T extends TransportDocumentType>(
    type: T,
    id: number,
    payload: UpsertBody<T>,
    expectedVersion: number
  ): Promise<TransportDocumentRecord> {
    const response = await apiClient.put(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_UPDATE(type, id),
      { ...payload, expectedVersion }
    )
    return unwrapApiResponse<TransportDocumentRecord>(response)
  },

  async lock(
    type: TransportDocumentType,
    id: number,
    expectedVersion: number
  ): Promise<TransportDocumentRecord> {
    const response = await apiClient.post(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_LOCK(type, id),
      { expectedVersion }
    )
    return unwrapApiResponse<TransportDocumentRecord>(response)
  },

  async unlock(
    type: TransportDocumentType,
    id: number,
    expectedVersion: number
  ): Promise<TransportDocumentRecord> {
    const response = await apiClient.post(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_UNLOCK(type, id),
      { expectedVersion }
    )
    return unwrapApiResponse<TransportDocumentRecord>(response)
  },

  async delete(type: TransportDocumentType, id: number): Promise<void> {
    const response = await apiClient.delete(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_DELETE(type, id)
    )
    if (!response.ok) throw new Error(await readError(response))
  },

  async history(options: {
    type: TransportDocumentType
    page?: number
    size?: number
  }): Promise<PageResponse<TransportDocumentRecord>> {
    const params = new URLSearchParams()
    params.set('page', String(options.page ?? 0))
    params.set('size', String(options.size ?? 10))
    const response = await apiClient.get(
      `${API_CONFIG.BOOKING_DOCUMENTS.ADMIN_HISTORY(options.type)}?${params.toString()}`
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
    return this.previewSaved(record.documentType, record.id)
  },

  async previewSaved(type: TransportDocumentType, id: number): Promise<Blob> {
    const response = await apiClient.get(
      API_CONFIG.BOOKING_DOCUMENTS.ADMIN_RECORD_PREVIEW(type, id),
      { headers: { Accept: 'application/pdf' }, timeout: 60_000 }
    )
    if (!response.ok) throw new Error(await readError(response))
    return response.blob()
  },
}
