'use client'

import { isAdminRole } from '@/config/section-catalog'
import { getRoleGroup } from '@/shared/utils/auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import { AddCommoditiesDialog } from './commodity-management/AddCommoditiesDialog'
import { CommodityDeleteDialog } from './commodity-management/CommodityDeleteDialog'
import { CommodityGroupsPanel } from './commodity-management/CommodityGroupsPanel'
import { CommodityToolbar } from './commodity-management/CommodityToolbar'
import { CreateGroupDialog } from './commodity-management/CreateGroupDialog'
import { GroupDeleteDialog } from './commodity-management/GroupDeleteDialog'
import { useCommodityManagement } from './commodity-management/useCommodityManagement'

export function ManageCommodities() {
  const currentUser = useCurrentUser()
  const management = useCommodityManagement()
  const canAddCommodity = getRoleGroup(currentUser) === 'INTERNAL'
  const canEditCommodity = isAdminRole(currentUser?.role) || canAddCommodity

  return (
    <div className='space-y-5'>
      <CommodityToolbar
        serviceSlug={management.serviceSlug}
        groupCount={management.groups.length}
        onServiceSlugChange={management.changeServiceSlug}
      />

      <CommodityGroupsPanel
        groups={management.groups}
        selectedGroupId={management.selectedGroupId}
        loading={management.loading}
        canEditCommodity={canEditCommodity}
        editingTypeId={management.editingTypeId}
        editingData={management.editingData}
        onSelectGroup={management.selectGroup}
        onStartEdit={management.startEditing}
        onEditNameChange={management.updateEditingName}
        onEditRequiredCountChange={management.updateEditingRequiredCount}
        onSave={(commodityId) => void management.saveCommodity(commodityId)}
        onCancelEdit={management.cancelEditing}
        onDeleteCommodity={management.requestDeleteCommodity}
        onDeleteGroup={management.requestDeleteGroup}
        onRenameGroup={management.renameGroup}
        onAddToGroup={(groupId) => management.openAddCommodities(groupId)}
        onCreateGroup={
          canAddCommodity ? management.openCreateGroup : undefined
        }
      />

      <CreateGroupDialog
        open={management.createGroupOpen}
        loading={management.loading}
        onClose={management.closeCreateGroup}
        onSubmit={management.createGroup}
      />

      <AddCommoditiesDialog
        key={
          management.addCommoditiesOpen
            ? `add-${management.addTargetGroupId ?? 'pick'}`
            : 'add-closed'
        }
        open={management.addCommoditiesOpen}
        loading={management.loading}
        groups={management.groups}
        initialGroupId={management.addTargetGroupId}
        onClose={management.closeAddCommodities}
        onSubmit={management.addCommodities}
      />

      <CommodityDeleteDialog
        open={management.deleteCommodityDialog.isOpen}
        commodity={management.deleteCommodityDialog.commodity}
        onClose={management.closeDeleteCommodityDialog}
        onConfirm={() => void management.confirmDeleteCommodity()}
      />

      <GroupDeleteDialog
        open={management.deleteGroupDialog.isOpen}
        group={management.deleteGroupDialog.group}
        onClose={management.closeDeleteGroupDialog}
        onConfirm={() => void management.confirmDeleteGroup()}
      />
    </div>
  )
}
