import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'
import type {
  StorageDownloadUrlResult,
  StorageListResult,
  StorageObject,
  StorageRenameRequest,
} from '@/modules/storage/types/storage.types'
import { basename, normalizePrefix } from '@/modules/storage/utils/storageUtils'

interface StorageListApiDto {
  prefix?: string
  parentPrefix?: string | null
  folders?: StorageObject[]
  files?: StorageObject[]
}

function toListResult(dto: StorageListApiDto): StorageListResult {
  const prefix = normalizePrefix(dto.prefix ?? '')
  return {
    prefix,
    parentPrefix: dto.parentPrefix ?? null,
    folders: dto.folders ?? [],
    files: dto.files ?? [],
  }
}

function parseApiError(result: unknown, fallback: string): string {
  const r = result as {
    error?: { message?: string; details?: { field?: string; message?: string }[] }
    message?: string
  }
  const details = r?.error?.details
  if (Array.isArray(details) && details.length > 0) {
    return details.map((d) => `${d.field ?? 'field'}: ${d.message}`).join('; ')
  }
  return r?.error?.message || r?.message || fallback
}

export const storageService = {
  list: async (prefix = '', signal?: AbortSignal): Promise<StorageListResult> => {
    const response = await apiClient.get<ApiResponse<StorageListApiDto>>(
      API_CONFIG.STORAGE.LIST(normalizePrefix(prefix)),
      { signal },
    )

    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(parseApiError(result, `Failed to list storage (HTTP ${response.status})`))
    }

    return toListResult(result?.data ?? {})
  },

  createFolder: async (prefix: string, folderName: string): Promise<StorageObject> => {
    const response = await apiClient.post<ApiResponse<StorageObject>>(
      API_CONFIG.STORAGE.FOLDER,
      { prefix: normalizePrefix(prefix), name: folderName },
    )

    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(parseApiError(result, `Failed to create folder (HTTP ${response.status})`))
    }

    return result?.data as StorageObject
  },

  /**
   * Upload any file type to R2 via backend multipart proxy.
   * Not Cloudinary — gallery images stay on the existing image pipeline.
   */
  upload: async (file: File, prefix = ''): Promise<StorageObject> => {
    const formData = new FormData()
    formData.append('file', file)

    const params = new URLSearchParams()
    const normalized = normalizePrefix(prefix)
    if (normalized) params.set('prefix', normalized)
    params.set('filename', file.name)

    const url = `${API_CONFIG.STORAGE.UPLOAD()}?${params.toString()}`
    const response = await apiClient.post<ApiResponse<StorageObject>>(url, formData)
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(parseApiError(result, `Upload failed (HTTP ${response.status})`))
    }
    return result?.data as StorageObject
  },

  delete: async (key: string): Promise<void> => {
    const response = await apiClient.delete(
      `${API_CONFIG.STORAGE.DELETE}?${new URLSearchParams({ key }).toString()}`,
    )
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(parseApiError(result, `Failed to delete (HTTP ${response.status})`))
    }
  },

  rename: async (payload: StorageRenameRequest): Promise<StorageObject> => {
    const response = await apiClient.put<ApiResponse<StorageObject>>(
      API_CONFIG.STORAGE.RENAME,
      payload,
    )
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(parseApiError(result, `Failed to rename (HTTP ${response.status})`))
    }
    return result?.data as StorageObject
  },

  getDownloadUrl: async (key: string): Promise<StorageDownloadUrlResult> => {
    const response = await apiClient.get<ApiResponse<StorageDownloadUrlResult>>(
      API_CONFIG.STORAGE.DOWNLOAD_URL(key),
    )
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(parseApiError(result, `Failed to get download URL (HTTP ${response.status})`))
    }
    return result?.data as StorageDownloadUrlResult
  },

  /** Trigger browser download for a file key. */
  download: async (key: string): Promise<void> => {
    const { url } = await storageService.getDownloadUrl(key)
    const link = document.createElement('a')
    link.href = url
    link.download = basename(key)
    link.rel = 'noopener'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    link.remove()
  },
}
