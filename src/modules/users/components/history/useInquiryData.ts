import { useState, useCallback } from 'react'
import { authService } from '@/modules/auth/services/authService'
import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import { isInternalStaff } from '@/shared/utils/auth'

interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

interface UseInquiryDataOptions {
  serviceType?: string
  isAdmin?: boolean
}

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

  const [inquiries, setInquiries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

        const response = await apiClient.get<PageResponse<any>>(
          `${API_CONFIG.INQUIRIES.USER_HISTORY(user.id)}?${params.toString()}`
        )

        if (!response.ok) {
          if (response.status === 401) {
            authService.logout()
            throw new Error('Unauthorized')
          }
          throw new Error('Failed to fetch inquiries')
        }

        const data: PageResponse<any> = await response.json()
        const payload = (data as any).data || data
        const inquiriesData = payload.content || payload || []
        console.log('[useInquiryData] User inquiries fetched:', { serviceType, count: inquiriesData.length, data: inquiriesData })
        setInquiries(inquiriesData)
      } else {
        // Admin endpoint - can see all inquiries
        const params = new URLSearchParams({ page: '0', size: '100' })
        if (serviceType?.trim()) {
          params.append('serviceSlug', serviceType.trim())
        }

        const response = await apiClient.get<PageResponse<any>>(
          `${API_CONFIG.INQUIRIES.ADMIN_BASE}?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch inquiries')
        }

        const data: PageResponse<any> = await response.json()
        const payload = (data as any).data || data
        setInquiries(payload.content || payload || [])
      }
    } catch (err) {
      console.error('Error fetching inquiries:', err)
      const errorMessage = err instanceof Error ? err.message : 'Could not load inquiries'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [serviceType, isAdmin])

  const deleteInquiries = useCallback(async (ids: number[]) => {
    try {
      const useAdminApi = shouldUseAdminInquiryApi(isAdmin)
      const endpoint = useAdminApi
        ? API_CONFIG.INQUIRIES.ADMIN_BATCH_DELETE
        : API_CONFIG.INQUIRIES.USER_BATCH_DELETE
      
      const response = await apiClient.delete(endpoint, {
        body: JSON.stringify({ ids }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete inquiries')
      }
      
      // Remove deleted inquiries from local state
      setInquiries(prev => prev.filter(inq => !ids.includes(inq.id)))
      
      return { success: true }
    } catch (err) {
      console.error('Error deleting inquiries:', err)
      throw err
    }
  }, [isAdmin])

  const refreshInquiries = useCallback(() => {
    return fetchInquiries()
  }, [fetchInquiries])

  return {
    inquiries,
    isLoading,
    error,
    fetchInquiries,
    deleteInquiries,
    updateStatus,
    refreshInquiries,
  }
}
