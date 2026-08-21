import { API_CONFIG } from '@/shared/config/api.config'
import type { PageResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'
import type {
  BillOfLadingNumberCheck,
  BookingReportResponse,
  BookingCopySource,
  BookingFlow,
  BookingWorkflow,
  DocumentNumberCheck,
  TransportDocumentPayloadMap,
  TransportDocumentRecord,
  TransportDocumentType,
  TransportDocumentV2Envelope,
  TransportDocumentV2Record,
} from './transportDocument.types'

const PRESENTATION_FIELDS = new Set([
  'descriptionOfGoods',
  'shippingMark',
  'marks',
  'note',
  'notes',
  'specialRemark',
  'to',
  'agent',
  'shipper',
  'consignor',
  'consignee',
  'consignedToOrderOf',
  'notifyParty',
  'notifyAddress',
  'deliverTo',
  'contact',
  'customerAttention',
  'pic',
  'commodity',
  'commodityType',
  'commodityName',
  'volume',
  'numberAndKindOfPackages',
  'cargoRows',
  'notifyPartySameAsConsignee',
  'billOfLadingType',
  'cargoInsurance',
  'blFormVariant',
  'declarationOfInterest',
  'declaredValue',
  'deliveryApplyTo',
  'numberOfOriginals',
  'placeOfReceipt',
  'portOfLoading',
  'placeOfIssue',
  'pickupPlace',
  'portOfDischarge',
  'placeOfDelivery',
  'dropoffPlace',
  'transitPort',
  'finalDestination',
])

function hasContainerData(row: Record<string, unknown>): boolean {
  return Object.values(row).some((value) =>
    typeof value === 'number'
      ? value !== 0
      : typeof value === 'string' && value.trim() !== ''
  )
}

export function toTransportDocumentV2Envelope<T extends TransportDocumentType>(
  payload: UpsertBody<T>,
  expectedVersion?: number
): TransportDocumentV2Envelope {
  const source = payload as unknown as Record<string, unknown>
  const document: Record<string, unknown> = {}
  const presentation: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    if (
      ['bookingFlow', 'bookingId', 'cargoVolumes', 'containers'].includes(key)
    )
      continue
    if (PRESENTATION_FIELDS.has(key)) presentation[key] = value
    else document[key] = value
  }
  const cargoSource = source.cargoVolumes
  const cargoVolumes =
    cargoSource &&
    typeof cargoSource === 'object' &&
    !Array.isArray(cargoSource)
      ? Object.entries(cargoSource)
          .filter(
            ([containerTypeCode, quantity]) =>
              containerTypeCode.trim() &&
              typeof quantity === 'number' &&
              Number.isInteger(quantity) &&
              quantity > 0
          )
          .map(([containerTypeCode, quantity]) => ({
            containerTypeCode,
            quantity: quantity as number,
          }))
      : []
  const containers = Array.isArray(source.containers)
    ? source.containers.filter((row) =>
        row && typeof row === 'object'
          ? hasContainerData(row as Record<string, unknown>)
          : false
      )
    : []
  return {
    document,
    presentation,
    cargoVolumes,
    containers: containers as TransportDocumentV2Envelope['containers'],
    ...(expectedVersion == null ? {} : { expectedVersion }),
    ...(source.bookingFlow == null
      ? {}
      : { bookingFlow: source.bookingFlow as BookingFlow }),
    ...(source.bookingId == null
      ? {}
      : { bookingId: Number(source.bookingId) }),
  }
}

function fromTransportDocumentV2Record(
  record: TransportDocumentV2Record | TransportDocumentRecord
): TransportDocumentRecord {
  if ('payload' in record || !('document' in record)) {
    return record as TransportDocumentRecord
  }
  const cargoVolumes = Object.fromEntries(
    record.cargoVolumes
      .filter((row) => row.containerTypeCode.trim() && row.quantity > 0)
      .map((row) => [row.containerTypeCode, row.quantity])
  )
  const payload = {
    ...record.document,
    ...record.presentation,
    ...(record.documentType === 'booking' ? { cargoVolumes } : {}),
    ...(record.documentType === 'booking'
      ? {}
      : {
          containers: record.containers.filter((row) =>
            hasContainerData(row as unknown as Record<string, unknown>)
          ),
        }),
  } as unknown as TransportDocumentPayloadMap[TransportDocumentType]
  const numberField = {
    booking: 'bookingNumber',
    an: 'anNumber',
    do: 'doNumber',
    bl: 'fblNumber',
  }[record.documentType]
  const reference = payload as unknown as Record<string, unknown>
  return {
    ...record,
    referenceNumber:
      typeof reference[numberField] === 'string'
        ? (reference[numberField] as string).trim() || null
        : null,
    payload,
    updatedByUserId: null,
    deletedAt: null,
    deletedByUserId: null,
  }
}

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
      API_CONFIG.BOOKING_DOCUMENTS.V2_CREATE(type),
      toTransportDocumentV2Envelope(payload)
    )
    const record = await unwrapApiResponse<TransportDocumentV2Record>(response)
    return fromTransportDocumentV2Record(record)
  },

  async getById(
    type: TransportDocumentType,
    id: number
  ): Promise<TransportDocumentRecord> {
    const response = await apiClient.get(
      API_CONFIG.BOOKING_DOCUMENTS.V2_BY_ID(type, id)
    )
    const record = await unwrapApiResponse<TransportDocumentV2Record>(response)
    return fromTransportDocumentV2Record(record)
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
      API_CONFIG.BOOKING_DOCUMENTS.V2_UPDATE(type, id),
      toTransportDocumentV2Envelope(payload, expectedVersion)
    )
    const record = await unwrapApiResponse<TransportDocumentV2Record>(response)
    return fromTransportDocumentV2Record(record)
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
    bookingNo?: string
  }): Promise<PageResponse<TransportDocumentRecord>> {
    const params = new URLSearchParams()
    params.set('page', String(options.page ?? 0))
    params.set('size', String(options.size ?? 10))
    if (options.bookingNo?.trim()) {
      params.set('bookingNo', options.bookingNo.trim())
    }
    const response = await apiClient.get(
      `${API_CONFIG.BOOKING_DOCUMENTS.V2_HISTORY(options.type)}?${params.toString()}`
    )
    const page =
      await unwrapApiResponse<PageResponse<TransportDocumentV2Record>>(response)
    return { ...page, content: page.content.map(fromTransportDocumentV2Record) }
  },

  async report(
    options: Record<string, string | number | boolean | undefined>
  ): Promise<BookingReportResponse> {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
    const response = await apiClient.get(
      `${API_CONFIG.BOOKING_DOCUMENTS.V2_REPORT}?${params.toString()}`
    )
    return unwrapApiResponse<BookingReportResponse>(response)
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
