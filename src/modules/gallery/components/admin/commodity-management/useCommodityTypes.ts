import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  commodityService,
  type CommodityAdminServiceSlug,
  type CommodityType,
} from '@/modules/gallery/services/commodityService'
import { isAbortError } from '@/shared/utils/apiClient'
import { toast } from '@/shared/utils/toast'

const EMPTY_TYPES: CommodityType[] = []
const commodityTypesQueryKey = (serviceSlug: CommodityAdminServiceSlug) =>
  ['admin', 'commodity-types', serviceSlug] as const

export interface CommodityTypeInput {
  name: string
}

interface CommodityTypesQueryData {
  serviceTypeId: number
  types: CommodityType[]
}

function getMutationError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  const message = error.message.trim()
  return message && message !== 'Request failed' ? message : fallback
}

export function useCommodityTypes(serviceSlug: CommodityAdminServiceSlug) {
  const queryClient = useQueryClient()
  const [mutationLoading, setMutationLoading] = useState(false)

  const typesQuery = useQuery({
    queryKey: commodityTypesQueryKey(serviceSlug),
    retry: false,
    queryFn: async ({ signal }): Promise<CommodityTypesQueryData> => {
      try {
        const serviceTypeId = await commodityService.resolveServiceTypeId(
          serviceSlug,
          signal
        )
        const types = await commodityService.listCommodityTypes(
          serviceTypeId,
          signal
        )
        return { serviceTypeId, types }
      } catch (error) {
        if (!isAbortError(error)) {
          toast.error(getMutationError(error, 'Failed to load Types'), error)
        }
        throw error
      }
    },
  })

  const serviceTypeId = typesQuery.data?.serviceTypeId ?? null
  const types = typesQuery.data?.types ?? EMPTY_TYPES

  const refreshTypes = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: commodityTypesQueryKey(serviceSlug),
    })
  }, [queryClient, serviceSlug])

  const createType = useCallback(
    async (input: CommodityTypeInput): Promise<boolean> => {
      const name = input.name.trim()
      if (!name) {
        toast.error('Type name is required')
        return false
      }
      if (serviceTypeId == null) {
        toast.error('Service Type is not available')
        return false
      }
      try {
        setMutationLoading(true)
        await commodityService.createCommodityType({
          serviceTypeId,
          name,
        })
        await refreshTypes()
        toast.success(`Type "${name}" created`)
        return true
      } catch (error) {
        toast.error(getMutationError(error, 'Failed to create Type'), error)
        return false
      } finally {
        setMutationLoading(false)
      }
    },
    [refreshTypes, serviceTypeId]
  )

  const updateType = useCallback(
    async (id: number, input: CommodityTypeInput): Promise<boolean> => {
      const name = input.name.trim()
      if (!name) {
        toast.error('Type name is required')
        return false
      }
      if (serviceTypeId == null) {
        toast.error('Service Type is not available')
        return false
      }
      try {
        setMutationLoading(true)
        await commodityService.updateCommodityType(id, {
          serviceTypeId,
          name,
        })
        await refreshTypes()
        toast.success(`Type "${name}" updated`)
        return true
      } catch (error) {
        toast.error(getMutationError(error, 'Failed to update Type'), error)
        return false
      } finally {
        setMutationLoading(false)
      }
    },
    [refreshTypes, serviceTypeId]
  )

  const deleteType = useCallback(
    async (id: number): Promise<boolean> => {
      if (serviceTypeId == null) {
        toast.error('Service Type is not available')
        return false
      }
      try {
        setMutationLoading(true)
        await commodityService.deleteCommodityType(id, serviceTypeId)
        await refreshTypes()
        toast.success('Type deleted')
        return true
      } catch (error) {
        toast.error(getMutationError(error, 'Failed to delete Type'), error)
        return false
      } finally {
        setMutationLoading(false)
      }
    },
    [refreshTypes, serviceTypeId]
  )

  return {
    serviceTypeId,
    types,
    loading: typesQuery.isFetching || mutationLoading,
    error: typesQuery.error,
    createType,
    updateType,
    deleteType,
  }
}
