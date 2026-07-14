import type { ApiResponse } from '@/shared/types/api.types'

async function readResponsePayload(response: Response): Promise<unknown> {
  const raw = await response.text()
  if (!raw.trim()) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 160)
    throw new Error(
      `Server returned non-JSON (${response.status} ${response.statusText || 'Error'}): ${snippet}`,
    )
  }
}

export async function unwrapApiResponse<T>(response: Response): Promise<T> {
  const payload = (await readResponsePayload(response)) as ApiResponse<T> | null
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Request failed (${response.status})`)
  }
  if (payload?.data === null || payload?.data === undefined) {
    throw new Error(payload?.message || 'Empty response')
  }
  return payload.data
}

export function unwrapPaginatedContent<T>(
  data: { content?: T[] } | T[] | null | undefined,
): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.content)) return data.content
  return []
}
