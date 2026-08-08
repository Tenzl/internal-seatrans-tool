import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  commodityService,
  type Commodity,
  type CommodityAdminServiceSlug,
  type CommodityGroup,
} from '@/modules/gallery/services/commodityService'
import { toast } from '@/shared/utils/toast'
import {
  buildGroupedCommodityInput,
  DEFAULT_REQUIRED_IMAGE_COUNT,
  DEFAULT_SERVICE_SLUG,
  EMPTY_COMMODITY_EDIT,
  getCommodityDeleteError,
  getGroupDeleteError,
  getMutationError,
  inferCargoTypeFromGroupName,
  parseRequiredImageCount,
  sanitizeGroups,
  validateAddCommoditiesForm,
  validateCreateGroupForm,
  type CommodityEditData,
} from './commodityManagementModel'

const EMPTY_GROUPS: CommodityGroup[] = []
const groupsQueryKey = (serviceSlug: CommodityAdminServiceSlug) =>
  ['admin', 'commodity-groups', serviceSlug] as const

interface DeleteCommodityDialogState {
  isOpen: boolean
  commodity: Commodity | null
}

interface DeleteGroupDialogState {
  isOpen: boolean
  group: CommodityGroup | null
}

const CLOSED_DELETE_COMMODITY: DeleteCommodityDialogState = {
  isOpen: false,
  commodity: null,
}

const CLOSED_DELETE_GROUP: DeleteGroupDialogState = {
  isOpen: false,
  group: null,
}

function resolveSelectedGroupId(
  groups: CommodityGroup[],
  preferredId: number | null
): number | null {
  if (groups.length === 0) return null
  if (preferredId != null && groups.some((group) => group.id === preferredId)) {
    return preferredId
  }
  return groups[0]?.id ?? null
}

export function useCommodityManagement() {
  const queryClient = useQueryClient()
  const [serviceSlug, setServiceSlug] =
    useState<CommodityAdminServiceSlug>(DEFAULT_SERVICE_SLUG)
  const [preferredGroupId, setPreferredGroupId] = useState<number | null>(null)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [addCommoditiesOpen, setAddCommoditiesOpen] = useState(false)
  const [addTargetGroupId, setAddTargetGroupId] = useState<number | null>(null)
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null)
  const [editingData, setEditingData] =
    useState<CommodityEditData>(EMPTY_COMMODITY_EDIT)
  const [deleteCommodityDialog, setDeleteCommodityDialog] =
    useState<DeleteCommodityDialogState>(CLOSED_DELETE_COMMODITY)
  const [deleteGroupDialog, setDeleteGroupDialog] =
    useState<DeleteGroupDialogState>(CLOSED_DELETE_GROUP)
  const [mutationLoading, setMutationLoading] = useState(false)

  const groupsQuery = useQuery({
    queryKey: groupsQueryKey(serviceSlug),
    queryFn: async () => {
      try {
        return sanitizeGroups(
          await commodityService.listGroups({ serviceSlug })
        )
      } catch (error) {
        toast.error(
          getMutationError(error, 'Failed to load commodity groups'),
          error
        )
        return []
      }
    },
  })
  const groups = groupsQuery.data ?? EMPTY_GROUPS
  const selectedGroupId = resolveSelectedGroupId(groups, preferredGroupId)

  const refreshGroups = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: groupsQueryKey(serviceSlug),
    })
  }, [queryClient, serviceSlug])

  const changeServiceSlug = useCallback((next: CommodityAdminServiceSlug) => {
    setServiceSlug(next)
    setPreferredGroupId(null)
    setEditingTypeId(null)
    setEditingData(EMPTY_COMMODITY_EDIT)
    setAddTargetGroupId(null)
  }, [])

  const selectGroup = useCallback((groupId: number) => {
    setPreferredGroupId(groupId)
    setEditingTypeId(null)
    setEditingData(EMPTY_COMMODITY_EDIT)
  }, [])

  const openCreateGroup = useCallback(() => setCreateGroupOpen(true), [])
  const closeCreateGroup = useCallback(() => setCreateGroupOpen(false), [])

  const openAddCommodities = useCallback((groupId?: number) => {
    setAddTargetGroupId(groupId ?? null)
    setAddCommoditiesOpen(true)
  }, [])
  const closeAddCommodities = useCallback(() => {
    setAddCommoditiesOpen(false)
    setAddTargetGroupId(null)
  }, [])

  const createGroup = useCallback(
    async (input: { groupName: string; commodityNames: string[] }) => {
      const validationError = validateCreateGroupForm(input)
      if (validationError) {
        toast.error(validationError)
        return false
      }

      const cargoType = inferCargoTypeFromGroupName(input.groupName)
      const commodities = input.commodityNames
        .map((name) => name.trim())
        .filter(Boolean)
        .map((displayName) =>
          buildGroupedCommodityInput(displayName, { cargoType })
        )

      try {
        setMutationLoading(true)
        const created = await commodityService.createGroup({
          serviceSlug,
          name: input.groupName.trim(),
          commodities,
        })
        setPreferredGroupId(created.id)
        await refreshGroups()
        toast.success(`Group "${input.groupName.trim()}" created`)
        closeCreateGroup()
        return true
      } catch (error) {
        toast.error(getMutationError(error, 'Failed to create group'), error)
        return false
      } finally {
        setMutationLoading(false)
      }
    },
    [closeCreateGroup, refreshGroups, serviceSlug]
  )

  const addCommodities = useCallback(
    async (input: { groupId: number; commodityNames: string[] }) => {
      const validationError = validateAddCommoditiesForm(input.commodityNames)
      if (validationError) {
        toast.error(validationError)
        return false
      }
      const group = groups.find((item) => item.id === input.groupId)
      if (!group) {
        toast.error('Select a group first')
        return false
      }

      const cargoType = inferCargoTypeFromGroupName(group.name)
      const names = input.commodityNames.map((name) => name.trim()).filter(Boolean)

      try {
        setMutationLoading(true)
        for (const displayName of names) {
          await commodityService.addCommodityToGroup(
            input.groupId,
            buildGroupedCommodityInput(displayName, { cargoType })
          )
        }
        await refreshGroups()
        toast.success(
          names.length === 1
            ? `Commodity "${names[0]}" added`
            : `${names.length} commodities added`
        )
        closeAddCommodities()
        return true
      } catch (error) {
        toast.error(getMutationError(error, 'Failed to add commodities'), error)
        return false
      } finally {
        setMutationLoading(false)
      }
    },
    [closeAddCommodities, groups, refreshGroups]
  )

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
    async (commodityId: number) => {
      if (!editingData.displayName.trim()) {
        toast.error('Commodity name is required')
        return
      }
      if (editingData.requiredImageCount < 1) {
        toast.error('Required count must be at least 1')
        return
      }

      const existing = groups
        .flatMap((group) => group.commodities)
        .find((commodity) => commodity.id === commodityId)
      if (!existing) {
        toast.error('Commodity not found')
        return
      }

      try {
        setMutationLoading(true)
        await commodityService.updateCommodity(commodityId, {
          name: editingData.displayName.trim().replace(/\s+/g, '_').toUpperCase(),
          displayName: editingData.displayName.trim(),
          requiredImageCount:
            editingData.requiredImageCount || DEFAULT_REQUIRED_IMAGE_COUNT,
          serviceTypeId: existing.serviceTypeId,
          cargoType: existing.cargoType || 'IN_BULK',
        })
        await refreshGroups()
        setEditingTypeId(null)
        toast.success('Commodity updated')
      } catch (error) {
        toast.error(getMutationError(error, 'Failed to update commodity'), error)
      } finally {
        setMutationLoading(false)
      }
    },
    [editingData, groups, refreshGroups]
  )

  const requestDeleteCommodity = useCallback((commodity: Commodity) => {
    setDeleteCommodityDialog({ isOpen: true, commodity })
  }, [])

  const closeDeleteCommodityDialog = useCallback(() => {
    setDeleteCommodityDialog(CLOSED_DELETE_COMMODITY)
  }, [])

  const confirmDeleteCommodity = useCallback(async () => {
    const commodity = deleteCommodityDialog.commodity
    if (!commodity) return

    try {
      setMutationLoading(true)
      await commodityService.deleteCommodity(commodity.id)
      await refreshGroups()
      toast.success(`Commodity "${commodity.displayName}" deleted`)
      closeDeleteCommodityDialog()
    } catch (error) {
      // Keep dialog open on 409/in-use so the failure is obvious.
      toast.error(getCommodityDeleteError(error), error)
    } finally {
      setMutationLoading(false)
    }
  }, [
    closeDeleteCommodityDialog,
    deleteCommodityDialog.commodity,
    refreshGroups,
  ])

  const requestDeleteGroup = useCallback((group: CommodityGroup) => {
    setDeleteGroupDialog({ isOpen: true, group })
  }, [])

  const closeDeleteGroupDialog = useCallback(() => {
    setDeleteGroupDialog(CLOSED_DELETE_GROUP)
  }, [])

  const confirmDeleteGroup = useCallback(async () => {
    const group = deleteGroupDialog.group
    if (!group) return

    try {
      setMutationLoading(true)
      await commodityService.deleteGroup(group.id)
      await refreshGroups()
      toast.success(`Group "${group.name}" deleted`)
      closeDeleteGroupDialog()
    } catch (error) {
      toast.error(getGroupDeleteError(error), error)
    } finally {
      setMutationLoading(false)
    }
  }, [closeDeleteGroupDialog, deleteGroupDialog.group, refreshGroups])

  const renameGroup = useCallback(
    async (groupId: number, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) {
        toast.error('Group name is required')
        return false
      }

      try {
        setMutationLoading(true)
        const updated = await commodityService.updateGroup(groupId, {
          name: trimmed,
        })
        setPreferredGroupId(updated.id)
        await refreshGroups()
        toast.success(`Group renamed to "${updated.name}"`)
        return true
      } catch (error) {
        toast.error(getMutationError(error, 'Failed to rename group'), error)
        return false
      } finally {
        setMutationLoading(false)
      }
    },
    [refreshGroups]
  )

  return {
    serviceSlug,
    groups,
    selectedGroupId,
    loading: groupsQuery.isFetching || mutationLoading,
    createGroupOpen,
    addCommoditiesOpen,
    addTargetGroupId,
    editingTypeId,
    editingData,
    deleteCommodityDialog,
    deleteGroupDialog,
    changeServiceSlug,
    selectGroup,
    openCreateGroup,
    closeCreateGroup,
    createGroup,
    openAddCommodities,
    closeAddCommodities,
    addCommodities,
    startEditing,
    cancelEditing,
    updateEditingName,
    updateEditingRequiredCount,
    saveCommodity,
    requestDeleteCommodity,
    closeDeleteCommodityDialog,
    confirmDeleteCommodity,
    requestDeleteGroup,
    closeDeleteGroupDialog,
    confirmDeleteGroup,
    renameGroup,
  }
}
