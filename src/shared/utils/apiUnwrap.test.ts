import { describe, expect, it } from 'vitest'
import { unwrapApiResponse, unwrapNullableApiResponse } from './apiUnwrap'

function response(
  body: unknown,
  options: { status?: number; contentType?: string } = {}
): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: options.status ?? 200,
    headers: {
      'Content-Type': options.contentType ?? 'application/json',
    },
  })
}

describe('API response unwrapping', () => {
  it('returns successful envelope data', async () => {
    await expect(
      unwrapApiResponse<{ id: number }>(
        response({ success: true, data: { id: 7 } })
      )
    ).resolves.toEqual({ id: 7 })
  })

  it('preserves backend error status and message', async () => {
    await expect(
      unwrapApiResponse(
        response({ success: false, message: 'Stale version' }, { status: 409 })
      )
    ).rejects.toMatchObject({
      name: 'ApiResponseError',
      message: 'Stale version',
      status: 409,
    })
  })

  it('reports a bounded non-JSON response', async () => {
    await expect(
      unwrapApiResponse(response('<html>Proxy error</html>', { status: 502 }))
    ).rejects.toMatchObject({
      name: 'ApiResponseError',
      status: 502,
    })
  })

  it('rejects empty data for endpoints that require a resource', async () => {
    await expect(
      unwrapApiResponse(response({ success: true, data: null }))
    ).rejects.toMatchObject({
      message: 'Empty response',
      status: 200,
    })
  })

  it('accepts empty data for nullable lookup endpoints', async () => {
    await expect(
      unwrapNullableApiResponse(response({ success: true, data: null }))
    ).resolves.toBeNull()
  })
})
