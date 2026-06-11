/**
 * Shared API response and pagination types for frontend services.
 */

export interface ApiResponse<T> {
  data: T
  message?: string
  status?: number
  success?: boolean
  errors?: Record<string, string[]>
}

export interface PageMeta {
  page?: number
  size?: number
  totalElements: number
  totalPages: number
}

export interface PageResponse<T> extends PageMeta {
  content: T[]
}

export interface PaginatedRequest {
  page?: number
  size?: number
  sort?: string
}

export interface UploadResponse {
  id: number | string
  url: string
  filename?: string
}
