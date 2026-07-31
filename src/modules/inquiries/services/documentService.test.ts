import axios from 'axios'
import { apiClient } from '@/shared/utils/apiClient'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { documentService, type InquiryDocument } from './documentService'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}))

vi.mock('@/shared/utils/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

const documentRecord: InquiryDocument = {
  id: 1,
  inquiryId: 10,
  documentType: 'INVOICE',
  fileName: 'invoice.pdf',
  originalFileName: 'invoice.pdf',
  fileSize: 3,
  mimeType: 'application/pdf',
  description: null,
  uploadedAt: '2026-07-30T00:00:00.000Z',
  uploadedByName: 'Operator',
  uploadedByEmail: 'operator@seatrans.test',
  version: 1,
  checksum: 'abc',
  isActive: true,
}

function apiResponse<T>(data: T): Response {
  return new Response(JSON.stringify({ success: true, message: 'ok', data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('documentService cookie session transport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads with first-party credentials and no legacy bearer requirement', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { success: true, message: 'ok', data: documentRecord },
    })
    const file = new File(['pdf'], 'invoice.pdf', {
      type: 'application/pdf',
    })

    await expect(
      documentService.uploadDocument(10, 'shipping-agency', 'INVOICE', file)
    ).resolves.toEqual(documentRecord)

    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/admin/inquiries/shipping-agency/10/documents',
      expect.any(FormData),
      expect.objectContaining({
        withCredentials: true,
      })
    )
    const config = vi.mocked(axios.post).mock.calls[0]?.[2]
    expect(config?.headers).toBeUndefined()
  })

  it('uses the shared API client for authenticated document reads', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      apiResponse([documentRecord]) as never
    )

    await expect(
      documentService.getDocuments(10, 'shipping-agency')
    ).resolves.toEqual([documentRecord])

    expect(apiClient.get).toHaveBeenCalledWith(
      '/inquiries/shipping-agency/10/documents'
    )
  })
})
