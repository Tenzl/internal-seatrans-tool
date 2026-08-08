import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  apiClient,
  getErrorStatus,
  shouldRetryApiError,
} from './apiClient'

describe('apiClient request lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('releases timeout resources as soon as a request completes', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await apiClient.get('/health')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/health',
      expect.objectContaining({
        credentials: 'include',
        method: 'GET',
        signal: expect.any(AbortSignal),
      })
    )
    expect(vi.getTimerCount()).toBe(0)
  })

  it('throws ApiError with status 401 when the session expires', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    )

    await expect(apiClient.get('/secure')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Session expired. Please login again.',
    })
  })

  it('throws network ApiError without status on Failed to fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    )

    await expect(apiClient.get('/health')).rejects.toMatchObject({
      name: 'ApiError',
      isNetworkError: true,
      message: 'Network error. Please check your connection.',
    })
    await expect(apiClient.get('/health')).rejects.toSatisfy(
      (error: unknown) => error instanceof ApiError && error.status === undefined
    )
  })
})

describe('shouldRetryApiError', () => {
  it('retries network failures and omits status', () => {
    expect(
      shouldRetryApiError(
        new ApiError('down', { isNetworkError: true })
      )
    ).toBe(true)
    expect(shouldRetryApiError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('retries 408, 429, and 5xx only', () => {
    expect(shouldRetryApiError(new ApiError('timeout', { status: 408 }))).toBe(
      true
    )
    expect(shouldRetryApiError(new ApiError('rate', { status: 429 }))).toBe(
      true
    )
    expect(shouldRetryApiError(new ApiError('boom', { status: 500 }))).toBe(
      true
    )
    expect(shouldRetryApiError(new ApiError('bad', { status: 502 }))).toBe(true)
  })

  it('never retries 401/403/404/other 4xx', () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(
        shouldRetryApiError(new ApiError(`HTTP ${status}`, { status }))
      ).toBe(false)
    }
  })

  it('never retries abort errors', () => {
    const abort = new Error('Aborted')
    abort.name = 'AbortError'
    expect(shouldRetryApiError(abort)).toBe(false)
  })

  it('reads status from Axios-like errors', () => {
    const axiosLike = { response: { status: 403 } }
    expect(getErrorStatus(axiosLike)).toBe(403)
    expect(shouldRetryApiError(axiosLike)).toBe(false)
  })
})
