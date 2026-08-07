import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  commodityService,
  type CargoType,
  type Commodity,
} from '@/modules/gallery/services/commodityService'
import { serviceTypeService } from '@/modules/service-types/services/serviceTypeService'
import { toast } from '@/shared/utils/toast'
import {
  buildCommodityRequest,
  countCommoditiesByCargoType,
  DEFAULT_CARGO_TYPE,
  DEFAULT_REQUIRED_IMAGE_COUNT,
  EMPTY_COMMODITY_EDIT,
  filterCommoditiesByCargoType,
  getCommodityDeleteError,
  isFixedCargoType,
  parseRequiredImageCount,
  sanitizeCommodities,
  type CommodityEditData,
} from './commodityManagementModel'

const SERVICE_TYPES_QUERY_KEY = ['admin', 'service-types'] as const
const EMPTY_COMMODITIES: Commodity[] = []
const commodityQueryKey = (serviceTypeId: number | null) =>
  ['admin', 'commodities', serviceTypeId] as const

interface DeleteDialogState {
  isOpen: boolean
  commodity: Commodity | null
}

const CLOSED_DELETE_DIALOG: DeleteDialogState = {
  isOpen: false,
  commodity: null,
}

export function useCommodityManagement() {
  const queryClient = useQueryClient()
  const [selectedServiceType, setSelectedServiceType] = useState<number | null>(
    null
  )
  const [selectedCargoType, setSelectedCargoType] =
    useState<CargoType>(DEFAULT_CARGO_TYPE)
  const [newCommodityName, setNewCommodityName] = useState('')
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null)
  const [editingData, setEditingData] =
    useState<CommodityEditData>(EMPTY_COMMODITY_EDIT)
  const [deleteDialog, setDeleteDialog] =
    useState<DeleteDialogState>(CLOSED_DELETE_DIALOG)
  const [mutationLoading, setMutationLoading] = useState(false)

  const serviceTypesQuery = useQuery({
    queryKey: SERVICE_TYPES_QUERY_KEY,
    queryFn: async () => {
      try {
        return await serviceTypeService.getAllServiceTypes()
      } catch (error) {
        toast.error('Failed to load service types', error)
        return []
      }
    },
  })
  const commoditiesQuery = useQuery({
    queryKey: commodityQueryKey(selectedServiceType),
    enabled: selectedServiceType !== null,
    queryFn: async () => {
      if (!selectedServiceType) return []
      try {
        return sanitizeCommodities(
          await commodityService.getCommoditiesByServiceType(
            selectedServiceType
          )
        )
      } catch (error) {
        toast.error('Failed to load commodities', error)
        return []
      }
    },
  })
  const commodities = commoditiesQuery.data ?? EMPTY_COMMODITIES
  const filteredCommodities = useMemo(
    () => filterCommoditiesByCargoType(commodities, selectedCargoType),
    [commodities, selectedCargoType]
  )
  const cargoTypeCounts = useMemo(
    () => countCommoditiesByCargoType(commodities),
    [commodities]
  )

  const updateCommodityCache = useCallback(
    (update: (current: Commodity[]) => Commodity[]) => {
      queryClient.setQueryData<Commodity[]>(
        commodityQueryKey(selectedServiceType),
        (current = []) => sanitizeCommodities(update(current))
      )
    },
    [queryClient, selectedServiceType]
  )

  const changeServiceType = useCallback((serviceTypeId: number | null) => {
    setSelectedServiceType(serviceTypeId)
    setSelectedCargoType(DEFAULT_CARGO_TYPE)
  }, [])

  const addCommodity = useCallback(async () => {
    if (!selectedServiceType) {
      toast.error('Please select a service type first')
      return
    }
    if (!newCommodityName.trim()) {
      toast.error('Commodity name is required')
      return
    }
    if (!isFixedCargoType(selectedCargoType)) {
      toast.error('Please select a cargo type first')
      return
    }

    const normalizedName = buildCommodityRequest({
      displayName: newCommodityName,
      requiredImageCount: DEFAULT_REQUIRED_IMAGE_COUNT,
      serviceTypeId: selectedServiceType,
      cargoType: selectedCargoType,
    }).name
    // Duplicate only within the same cargo type (same name OK across types).
    if (
      commodities.some(
        (commodity) =>
          commodity.cargoType === selectedCargoType &&
          commodity.name === normalizedName
      )
    ) {
      toast.error(
        `Commodity "${normalizedName}" already exists in this cargo type`
      )
      return
    }

    try {
      setMutationLoading(true)
      const created = await commodityService.createCommodity(
        buildCommodityRequest({
          displayName: newCommodityName,
          requiredImageCount: DEFAULT_REQUIRED_IMAGE_COUNT,
          serviceTypeId: selectedServiceType,
          cargoType: selectedCargoType,
        })
      )
      if (!created) throw new Error('Empty response when creating commodity')
      updateCommodityCache((current) => [...current, created])
      setNewCommodityName('')
      toast.success(`Commodity "${created.displayName}" added successfully`)
    } catch {
      toast.error('Failed to add commodity')
    } finally {
      setMutationLoading(false)
    }
  }, [
    commodities,
    newCommodityName,
    selectedCargoType,
    selectedServiceType,
    updateCommodityCache,
  ])

  const startEditing = useCallback((commodity: Commodity) => {
    setEditingTypeId(commodity.id)
    setEditingData({
      displayName: commodity.displayName,
      requiredImageCount: commodity.requiredImageCount,
    })
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingTypeId(null)
    setEditingData(EMPTY_COMMODITY_EDIT)
  }, [])

  const updateEditingName = useCallback((displayName: string) => {
    setEditingData((current) => ({ ...current, displayName }))
  }, [])

  const updateEditingRequiredCount = useCallback((value: string) => {
    setEditingData((current) => ({
      ...current,
      requiredImageCount: parseRequiredImageCount(value),
    }))
  }, [])

  const saveCommodity = useCallback(
    async (typeId: number) => {
      if (!editingData.displayName.trim()) {
        toast.error('Commodity name is required')
        return
      }
      if (editingData.requiredImageCount < 1) {
        toast.error('Required count must be at least 1')
        return
      }
      if (!selectedServiceType) {
        toast.error('Service type not selected')
        return
      }

      const cargoType =
        commodities.find((commodity) => commodity.id === typeId)?.cargoType ??
        DEFAULT_CARGO_TYPE
      try {
        setMutationLoading(true)
        const updated = await commodityService.updateCommodity(
          typeId,
          buildCommodityRequest({
            ...editingData,
            serviceTypeId: selectedServiceType,
            cargoType,
          })
        )
        if (!updated) throw new Error('Empty response when updating commodity')
        updateCommodityCache((current) =>
          current.map((commodity) =>
            commodity.id === typeId ? updated : commodity
          )
        )
        setEditingTypeId(null)
        toast.success('Commodity updated successfully')
      } catch {
        toast.error('Failed to update commodity')
      } finally {
        setMutationLoading(false)
      }
    },
    [commodities, editingData, selectedServiceType, updateCommodityCache]
  )

  const requestDelete = useCallback((commodity: Commodity) => {
    setDeleteDialog({ isOpen: true, commodity })
  }, [])

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog(CLOSED_DELETE_DIALOG)
  }, [])

  const confirmDelete = useCallback(async () => {
    const commodity = deleteDialog.commodity
    if (!commodity) return

    try {
      setMutationLoading(true)
      await commodityService.deleteCommodity(commodity.id)
      updateCommodityCache((current) =>
        current.filter((item) => item.id !== commodity.id)
      )
      toast.success(
        `Commodity "${commodity.displayName}" deleted successfully`
      )
    } catch (error) {
      toast.error(getCommodityDeleteError(error))
    } finally {
      setMutationLoading(false)
      closeDeleteDialog()
    }
  }, [closeDeleteDialog, deleteDialog.commodity, updateCommodityCache])

  return {
    serviceTypes: serviceTypesQuery.data ?? [],
    selectedServiceType,
    selectedCargoType,
    commodities,
    filteredCommodities,
    cargoTypeCounts,
    loading: commoditiesQuery.isFetching || mutationLoading,
    newCommodityName,
    editingTypeId,
    editingData,
    deleteDialog,
    changeServiceType,
    setSelectedCargoType,
    setNewCommodityName,
    addCommodity,
    startEditing,
    cancelEditing,
    updateEditingName,
    updateEditingRequiredCount,
    saveCommodity,
    requestDelete,
    closeDeleteDialog,
    confirmDelete,
  }
}
