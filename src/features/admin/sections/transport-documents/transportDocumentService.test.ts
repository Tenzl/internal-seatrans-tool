import { apiClient } from '@/shared/utils/apiClient'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyArrivalNotice } from '@/features/admin/sections/transport-documents/transportDocumentSchemas'
import { transportDocumentService } from './transportDocumentService'

vi.mock('@/shared/utils/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

describe('transportDocumentService', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.post).mockReset()
    vi.mocked(apiClient.put).mockReset()
    vi.mocked(apiClient.delete).mockReset()
  })

  it('posts the type-specific DTO and returns the raw PDF blob', async () => {
    const payload = emptyArrivalNotice()
    const pdf = new Blob(['pdf-bytes'], { type: 'application/pdf' })
    vi.mocked(apiClient.post).mockResolvedValue(
      new Response(pdf, { status: 200 })
    )

    const result = await transportDocumentService.preview('an', payload)

    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/booking-documents/an/preview',
      payload,
      { headers: { Accept: 'application/pdf' }, timeout: 60_000 }
    )
    expect(result.type).toBe('application/pdf')
  })

  it('rebuilds a PDF from the history payload', async () => {
    const payload = { ...emptyArrivalNotice(), anNumber: 'AN-001' }
    vi.mocked(apiClient.post).mockResolvedValue(
      new Response(new Blob(['pdf']), { status: 200 })
    )

    await transportDocumentService.previewRecord({
      id: 5,
      documentType: 'an',
      referenceNumber: 'AN-001',
      payload,
      status: 'COMPLETED',
      createdByUserId: 7,
      createdAt: '2026-07-29T10:00:00.000Z',
      updatedAt: '2026-07-29T10:00:00.000Z',
      updatedByUserId: 7,
      lockedAt: null,
      deletedAt: null,
      deletedByUserId: null,
      createdBy: null,
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/booking-documents/an/preview',
      payload,
      { headers: { Accept: 'application/pdf' }, timeout: 60_000 }
    )
  })

  it('surfaces the backend validation message instead of returning an error PDF', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(
      new Response(
        JSON.stringify({
          message: ['cargoRows must contain no more than 20 elements'],
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      )
    )

    await expect(
      transportDocumentService.preview('an', emptyArrivalNotice())
    ).rejects.toThrow('cargoRows must contain no more than 20 elements')
  })

  it('creates a transport-document record with status', async () => {
    const payload = {
      ...emptyArrivalNotice(),
      anNumber: 'AN-001',
      status: 'PROCESSING' as const,
    }
    vi.mocked(apiClient.post).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 5,
            documentType: 'an',
            referenceNumber: 'AN-001',
            payload,
            status: 'PROCESSING',
            createdByUserId: 7,
            createdAt: '2026-07-29T10:00:00.000Z',
            updatedAt: '2026-07-29T10:00:00.000Z',
            updatedByUserId: 7,
            lockedAt: null,
            deletedAt: null,
            deletedByUserId: null,
            createdBy: null,
          },
        }),
        { status: 201 }
      )
    )

    const result = await transportDocumentService.create('an', payload)

    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/booking-documents/an/records',
      payload
    )
    expect(result).toMatchObject({
      id: 5,
      referenceNumber: 'AN-001',
      status: 'PROCESSING',
    })
  })

  it('loads all steps belonging to one booking workflow', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 12,
            flow: 'EXPORT',
            documents: { booking: { id: 12, documentType: 'booking' } },
          },
        }),
        { status: 200 }
      )
    )

    const result = await transportDocumentService.workflow(12)

    expect(apiClient.get).toHaveBeenCalledWith(
      '/admin/booking-documents/bookings/12/workflow'
    )
    expect(result).toMatchObject({ id: 12, flow: 'EXPORT' })
  })

  it('updates, locks, unlocks, archives, and permanently deletes records', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 5, status: 'PROCESSING' } }), {
        status: 200,
      })
    )
    vi.mocked(apiClient.put).mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 5, status: 'COMPLETED' } }), {
        status: 200,
      })
    )
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: 5, lockedAt: '2026-07-31T00:00:00Z' } }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 5, lockedAt: null } }), {
          status: 200,
        })
      )
    vi.mocked(apiClient.delete).mockResolvedValue(
      new Response(null, { status: 204 })
    )

    await transportDocumentService.getById('an', 5)
    await transportDocumentService.update('an', 5, {
      ...emptyArrivalNotice(),
      status: 'COMPLETED',
    })
    await transportDocumentService.lock('an', 5)
    await transportDocumentService.unlock('an', 5)
    await transportDocumentService.archive('an', 5)
    await transportDocumentService.permanentDelete('an', 5)

    expect(apiClient.get).toHaveBeenCalledWith(
      '/admin/booking-documents/an/records/5'
    )
    expect(apiClient.put).toHaveBeenCalledWith(
      '/admin/booking-documents/an/records/5',
      expect.objectContaining({ status: 'COMPLETED' })
    )
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      '/admin/booking-documents/an/records/5/lock'
    )
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      '/admin/booking-documents/an/records/5/unlock'
    )
    expect(apiClient.delete).toHaveBeenNthCalledWith(
      1,
      '/admin/booking-documents/an/records/5'
    )
    expect(apiClient.delete).toHaveBeenNthCalledWith(
      2,
      '/admin/booking-documents/an/records/5/permanent'
    )
  })

  it('lists paginated history with an optional document-type filter', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 10,
            number: 0,
          },
        }),
        { status: 200 }
      )
    )

    await transportDocumentService.history({
      type: 'do',
      page: 2,
      size: 10,
    })

    expect(apiClient.get).toHaveBeenCalledWith(
      '/admin/booking-documents/do/records?page=2&size=10'
    )
  })
})
