import { useState, useCallback } from 'react'
import { authService } from '@/modules/auth/services/authService'
import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import { isInternalStaff } from '@/shared/utils/auth'
import { toInquiryServiceSlug } from '@/shared/domain/inquiryService'

interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export type InquiryRecord = Record<string, unknown> & {
  id: number
  status?: string
  isArchived?: boolean
  deletedAt?: string | null
  deletedById?: number | null
}

interface InquiryPageEnvelope {
  data?: PageResponse<InquiryRecord> | InquiryRecord[]
}

interface ApiErrorBody {
  error?: { message?: string }
  message?: string
}

function extractInquiries(
  value: PageResponse<InquiryRecord> | InquiryRecord[] | InquiryPageEnvelope,
): InquiryRecord[] {
  if (Array.isArray(value)) return value
  if ('data' in value && value.data) return extractInquiries(value.data)
  return 'content' in value ? value.content : []
}

interface UseInquiryDataOptions {
  serviceType?: string
  isAdmin?: boolean
}

export type AdminArchivedFilter = 'active' | 'archived' | 'all'

const SERVICE_TYPE_NAME_MAP: Record<string, string> = {
  'shipping-agency': 'SHIPPING AGENCY',
  'freight-forwarding': 'FREIGHT FORWARDING',
  'chartering-ship-broking': 'CHARTERING',
  chartering: 'CHARTERING',
  'total-logistics': 'LOGISTICS',
  logistics: 'LOGISTICS',
  'special-request': 'SPECIAL REQUEST',
}

function toServiceTypeName(input?: string): string | undefined {
  if (!input) return undefined
  const trimmed = input.trim()
  return SERVICE_TYPE_NAME_MAP[trimmed] ?? trimmed
}

function shouldUseAdminInquiryApi(isAdmin: boolean): boolean {
  return isAdmin && isInternalStaff(authService.getUser())
}

export function useInquiryData(options: UseInquiryDataOptions = {}) {
  const { serviceType, isAdmin = false } = options

  const [inquiries, setInquiries] = useState<InquiryRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [archivedFilter, setArchivedFilter] = useState<AdminArchivedFilter>('all')
  const updateStatus = useCallback(async (id: number, status: string, serviceSlug?: string) => {
    if (!shouldUseAdminInquiryApi(isAdmin)) return { success: false }
    const serviceName = toServiceTypeName(serviceSlug || serviceType)
    if (!serviceName) {
      throw new Error('serviceType is required to update status')
    }

    const response = await apiClient.patch(
      API_CONFIG.INQUIRIES.ADMIN_STATUS(serviceName, id),
      { status },
    )

    if (!response.ok) {
      throw new Error('Failed to update status')
    }

    const updatedStatus = status
    setInquiries(prev =>
      prev.map(inq => (inq.id === id ? { ...inq, status: updatedStatus } : inq))
    )

    return { success: true }
  }, [isAdmin, serviceType])

  const fetchInquiries = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const useAdminApi = shouldUseAdminInquiryApi(isAdmin)
    
    try {
      if (!useAdminApi) {
        // User endpoint - always filtered by JWT userId
        const user = authService.getUser()
        if (!user?.id) {
          setError('Please log in to view your inquiries.')
          setInquiries([])
          return
        }

        const params = new URLSearchParams({ page: '0', size: '100' })
        if (serviceType?.trim()) {
          params.append('serviceSlug', serviceType.trim())
        }

        const response = await apiClient.get<PageResponse<InquiryRecord>>(
          `${API_CONFIG.INQUIRIES.USER_HISTORY(user.id)}?${params.toString()}`
        )

        if (!response.ok) {
          if (response.status === 401) {
            authService.logout()
            throw new Error('Unauthorized')
          }
          throw new Error('Failed to fetch inquiries')
        }

        const data = (await response.json()) as
          | PageResponse<InquiryRecord>
          | InquiryRecord[]
          | InquiryPageEnvelope
        setInquiries(extractInquiries(data))
      } else {
        // Admin endpoint - can see all inquiries
        const params = new URLSearchParams({ page: '0', size: '100' })
        if (serviceType?.trim()) {
          params.append('serviceSlug', serviceType.trim())
        }
        if (isAdmin) {
          params.append('archived', archivedFilter)
        }

        const response = await apiClient.get<PageResponse<InquiryRecord>>(
          `${API_CONFIG.INQUIRIES.ADMIN_BASE}?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch inquiries')
        }

        const data = (await response.json()) as
          | PageResponse<InquiryRecord>
          | InquiryRecord[]
          | InquiryPageEnvelope
        setInquiries(extractInquiries(data))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Could not load inquiries'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [serviceType, isAdmin, archivedFilter])

  const deleteInquiries = useCallback(async (ids: number[], mode: 'soft' | 'hard' = 'soft') => {
    const useAdminApi = shouldUseAdminInquiryApi(isAdmin)
    const serviceSlug = toInquiryServiceSlug(serviceType)
    if (!serviceSlug) {
      throw new Error('A supported service is required to delete inquiries')
    }
    const endpoint = useAdminApi
      ? API_CONFIG.INQUIRIES.ADMIN_BATCH_DELETE(mode, serviceSlug)
      : API_CONFIG.INQUIRIES.USER_BATCH_DELETE(serviceSlug)

    const response = await apiClient.delete(endpoint, {
      body: JSON.stringify({ ids }),
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiErrorBody | null
      throw new Error(
        body?.error?.message || body?.message || 'Failed to delete inquiries',
      )
    }

    setInquiries(prev => prev.filter(inq => !ids.includes(inq.id)))

    return { success: true }
  }, [isAdmin, serviceType])

  const restoreInquiries = useCallback(async (ids: number[]) => {
    const endpoint = API_CONFIG.INQUIRIES.ADMIN_BATCH_RESTORE(serviceType)
    const response = await apiClient.post(endpoint, { ids })

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiErrorBody | null
      throw new Error(body?.error?.message || body?.message || 'Failed to restore inquiries')
    }

    setInquiries(prev =>
      prev.map((inq) =>
        ids.includes(inq.id) ? { ...inq, isArchived: false, deletedAt: null, deletedById: null } : inq,
      ),
    )

    return { success: true }
  }, [serviceType])

  const refreshInquiries = useCallback(() => {
    return fetchInquiries()
  }, [fetchInquiries])

  return {
    inquiries,
    isLoading,
    error,
    fetchInquiries,
    deleteInquiries,
    restoreInquiries,
    archivedFilter,
    setArchivedFilter,
    updateStatus,
    refreshInquiries,
  }
}
