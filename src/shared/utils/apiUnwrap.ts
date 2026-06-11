import type { ApiResponse } from '@/shared/types/api.types'

export async function unwrapApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Request failed')
  }
  if (payload.data === null || payload.data === undefined) {
    throw new Error(payload.message || 'Empty response')
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
