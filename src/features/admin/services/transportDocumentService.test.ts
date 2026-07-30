import { apiClient } from '@/shared/utils/apiClient'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyArrivalNotice } from '@/features/admin/sections/transport-documents/transportDocumentSchemas'
import { transportDocumentService } from './transportDocumentService'

vi.mock('@/shared/utils/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}))

describe('transportDocumentService', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.post).mockReset()
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

  it('creates an immutable transport-document record', async () => {
    const payload = { ...emptyArrivalNotice(), anNumber: 'AN-001' }
    vi.mocked(apiClient.post).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 5,
            documentType: 'an',
            referenceNumber: 'AN-001',
            payload,
            createdByUserId: 7,
            createdAt: '2026-07-29T10:00:00.000Z',
            createdBy: null,
          },
        }),
        { status: 201 },
      ),
    )

    const result = await transportDocumentService.create('an', payload)

    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/booking-documents/an/records',
      payload,
    )
    expect(result).toMatchObject({ id: 5, referenceNumber: 'AN-001' })
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
        { status: 200 },
      ),
    )

    await transportDocumentService.history({
      type: 'do',
      page: 2,
      size: 10,
    })

    expect(apiClient.get).toHaveBeenCalledWith(
      '/admin/booking-documents/records?type=do&page=2&size=10',
    )
  })
})
