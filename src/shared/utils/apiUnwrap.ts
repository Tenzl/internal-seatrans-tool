import type { ApiResponse } from '@/shared/types/api.types'

export class ApiResponseError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'ApiResponseError'
  }
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const raw = await response.text()
  if (!raw.trim()) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 160)
    throw new ApiResponseError(
      `Server returned non-JSON (${response.status} ${response.statusText || 'Error'}): ${snippet}`,
      response.status
    )
  }
}

export async function unwrapApiResponse<T>(response: Response): Promise<T> {
  const payload = (await readResponsePayload(response)) as ApiResponse<T> | null
  if (!response.ok || payload?.success === false) {
    throw new ApiResponseError(
      payload?.message || `Request failed (${response.status})`,
      response.status
    )
  }
  if (payload?.data === null || payload?.data === undefined) {
    throw new ApiResponseError(
      payload?.message || 'Empty response',
      response.status
    )
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
    throw new ApiResponseError(
      payload?.message || `Request failed (${response.status})`,
      response.status
    )
  }
  return payload?.data ?? null
}

export function unwrapPaginatedContent<T>(
  data: { content?: T[] } | T[] | null | undefined
): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.content)) return data.content
  return []
}
