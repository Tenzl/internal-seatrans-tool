import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './apiClient'

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
})
