import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  commodityService,
  type Commodity,
  type CommodityAdminServiceSlug,
} from '@/modules/gallery/services/commodityService'
import { isAbortError } from '@/shared/utils/apiClient'
import { toast } from '@/shared/utils/toast'

const EMPTY_COMMODITIES: Commodity[] = []
const commoditiesQueryKey = (serviceSlug: CommodityAdminServiceSlug) =>
  ['admin', 'commodities', serviceSlug] as const

export interface CommodityInput {
  displayName: string
  description?: string
}

interface CommoditiesQueryData {
  serviceTypeId: number
  commodities: Commodity[]
}

function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  const message = error.message.trim()
  return message && message !== 'Request failed' ? message : fallback
}

export function useCommodities(serviceSlug: CommodityAdminServiceSlug) {
  const queryClient = useQueryClient()
  const [mutationLoading, setMutationLoading] = useState(false)

  const commoditiesQuery = useQuery({
    queryKey: commoditiesQueryKey(serviceSlug),
    retry: false,
    queryFn: async ({ signal }): Promise<CommoditiesQueryData> => {
      try {
        const serviceTypeId = await commodityService.resolveServiceTypeId(
          serviceSlug,
          signal
        )
        const commodities = await commodityService.listAdminCommodities(
          serviceTypeId,
          signal
        )
        return { serviceTypeId, commodities }
      } catch (error) {
        if (!isAbortError(error)) {
          toast.error(errorMessage(error, 'Failed to load Commodities'), error)
        }
        throw error
      }
    },
  })

  const serviceTypeId = commoditiesQuery.data?.serviceTypeId ?? null
  const commodities = commoditiesQuery.data?.commodities ?? EMPTY_COMMODITIES

  const refreshCommodities = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: commoditiesQueryKey(serviceSlug),
    })
  }, [queryClient, serviceSlug])

  const normalizeInput = useCallback((input: CommodityInput) => {
    const displayName = input.displayName.trim()
    return {
      displayName,
      description: input.description?.trim() || undefined,
    }
  }, [])

  const createCommodity = useCallback(
    async (input: CommodityInput): Promise<boolean> => {
      const normalized = normalizeInput(input)
      if (!normalized.displayName) {
        toast.error('Commodity name is required')
        return false
      }
      if (serviceTypeId == null) {
        toast.error('Service Type is not available')
        return false
      }
      try {
        setMutationLoading(true)
        await commodityService.createCommodity({
          serviceTypeId,
          ...normalized,
        })
        await refreshCommodities()
        toast.success(`Commodity "${normalized.displayName}" created`)
        return true
      } catch (error) {
        toast.error(errorMessage(error, 'Failed to create Commodity'), error)
        return false
      } finally {
        setMutationLoading(false)
      }
    },
    [normalizeInput, refreshCommodities, serviceTypeId]
  )

  const updateCommodity = useCallback(
    async (id: number, input: CommodityInput): Promise<boolean> => {
      const normalized = normalizeInput(input)
      if (!normalized.displayName) {
        toast.error('Commodity name is required')
        return false
      }
      if (serviceTypeId == null) {
        toast.error('Service Type is not available')
        return false
      }
      try {
        setMutationLoading(true)
        await commodityService.updateCommodity(id, {
          serviceTypeId,
          ...normalized,
        })
        await refreshCommodities()
        toast.success(`Commodity "${normalized.displayName}" updated`)
        return true
      } catch (error) {
        toast.error(errorMessage(error, 'Failed to update Commodity'), error)
        return false
      } finally {
        setMutationLoading(false)
      }
    },
    [normalizeInput, refreshCommodities, serviceTypeId]
  )

  const deleteCommodity = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        setMutationLoading(true)
        await commodityService.deleteCommodity(id)
        await refreshCommodities()
        toast.success('Commodity deleted')
        return true
      } catch (error) {
        toast.error(errorMessage(error, 'Failed to delete Commodity'), error)
        return false
      } finally {
        setMutationLoading(false)
      }
    },
    [refreshCommodities]
  )

  return {
    serviceTypeId,
    commodities,
    loading: commoditiesQuery.isFetching || mutationLoading,
    error: commoditiesQuery.error,
    createCommodity,
    updateCommodity,
    deleteCommodity,
  }
}
