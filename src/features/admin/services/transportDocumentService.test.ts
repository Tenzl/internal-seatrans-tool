import { apiClient } from '@/shared/utils/apiClient'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyArrivalNotice } from '@/features/admin/sections/transport-documents/transportDocumentSchemas'
import { transportDocumentService } from './transportDocumentService'

vi.mock('@/shared/utils/apiClient', () => ({
  apiClient: { post: vi.fn() },
}))

describe('transportDocumentService.preview', () => {
  beforeEach(() => vi.mocked(apiClient.post).mockReset())

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
})
