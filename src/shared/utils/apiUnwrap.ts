import type { ApiResponse } from '@/shared/types/api.types'
import { ApiError } from '@/shared/utils/apiClient'

async function readResponsePayload(response: Response): Promise<unknown> {
  const raw = await response.text()
  if (!raw.trim()) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 160)
    throw new ApiError(
      `Server returned non-JSON (${response.status} ${response.statusText || 'Error'}): ${snippet}`,
      { status: response.status }
    )
  }
}

export async function unwrapApiResponse<T>(response: Response): Promise<T> {
  const payload = (await readResponsePayload(response)) as ApiResponse<T> | null
  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || `Request failed (${response.status})`,
      { status: response.status }
    )
  }
  if (payload?.data === null || payload?.data === undefined) {
    throw new ApiError(payload?.message || 'Empty response', {
      status: response.status,
    })
  }
  return payload.data
}

/** Unwraps lookup endpoints where a successful `data: null` means not found. */
export async function unwrapNullableApiResponse<T>(
  response: Response
): Promise<T | null> {
  const payload = (await readResponsePayload(
    response
  )) as ApiResponse<T | null> | null
  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || `Request failed (${response.status})`,
      { status: response.status }
    )
  }
  return payload?.data ?? null
}
