'use client'

import { isAdminRole } from '@/config/section-catalog'
import { getRoleGroup } from '@/shared/utils/auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import { CommodityDeleteDialog } from './commodity-management/CommodityDeleteDialog'
import { CommodityTable } from './commodity-management/CommodityTable'
import { CommodityToolbar } from './commodity-management/CommodityToolbar'
import { useCommodityManagement } from './commodity-management/useCommodityManagement'

export function ManageCommodities() {
  const currentUser = useCurrentUser()
  const management = useCommodityManagement()
  const canAddCargo = getRoleGroup(currentUser) === 'INTERNAL'
  const canEditCargo = isAdminRole(currentUser?.role) || canAddCargo

  return (
    <div className='space-y-6'>
      <CommodityToolbar
        serviceTypes={management.serviceTypes}
        selectedServiceType={management.selectedServiceType}
        canAddCargo={canAddCargo}
        newCommodityName={management.newCommodityName}
        onServiceTypeChange={management.changeServiceType}
        onNameChange={management.setNewCommodityName}
        onAdd={() => void management.addCommodity()}
      />

      <CommodityTable
        selectedServiceType={management.selectedServiceType}
        selectedCargoType={management.selectedCargoType}
        cargoTypeCounts={management.cargoTypeCounts}
        commodities={management.filteredCommodities}
        loading={management.loading}
        canEditCargo={canEditCargo}
        editingTypeId={management.editingTypeId}
        editingData={management.editingData}
        onCargoTypeChange={management.setSelectedCargoType}
        onStartEdit={management.startEditing}
        onEditNameChange={management.updateEditingName}
        onEditRequiredCountChange={management.updateEditingRequiredCount}
        onSave={(commodityId) => void management.saveCommodity(commodityId)}
        onCancelEdit={management.cancelEditing}
        onDelete={management.requestDelete}
      />

      <CommodityDeleteDialog
        open={management.deleteDialog.isOpen}
        commodity={management.deleteDialog.commodity}
        onClose={management.closeDeleteDialog}
        onConfirm={() => void management.confirmDelete()}
      />
    </div>
  )
}
