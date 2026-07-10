"use client"

import { useState, useEffect } from 'react'
import { Package, Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import BadgeButtonCombo from '../../../../shared/components/ui/badge-button-combo'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { serviceTypeService, ServiceType } from '@/modules/service-types/services/serviceTypeService'
import {
  commodityService,
  CargoType,
  Commodity,
  CreateCommodityRequest,
} from '@/modules/gallery/services/commodityService'
import { SHIPPING_AGENCY_CARGO_TYPES } from '@/modules/gallery/shippingAgencyCargoCatalog'
import { useCurrentUser } from '@/hooks/use-current-user'
import { isAdminRole } from '@/config/section-catalog'
import { getRoleGroup } from '@/shared/utils/auth'
import { toast } from '@/shared/utils/toast'

const getCargoTypeLabel = (cargoType: CargoType, options: { value: CargoType; label: string }[]): string => {
  const matched = options.find((option) => option.value === cargoType)
  return matched?.label ?? cargoType
}

type CargoTypeOption = {
  id: string
  value: CargoType
  label: string
}

/** Cargo types are a fixed enum (not editable). These are the only base options. */
const FIXED_CARGO_TYPE_OPTIONS: CargoTypeOption[] = SHIPPING_AGENCY_CARGO_TYPES.map((t) => ({
  id: t.code,
  value: t.code,
  label: t.displayLabel,
}))

export function ManageCommodities() {
  const currentUser = useCurrentUser()
  const isInternal = getRoleGroup(currentUser) === 'INTERNAL'
  const canAddCargo = isInternal
  const canEditCargo = isAdminRole(currentUser?.role) || canAddCargo

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [selectedServiceType, setSelectedServiceType] = useState<number | null>(null)
  const [commodities, setCommodities] = useState<Commodity[]>([])
  const [loading, setLoading] = useState(false)
  const cargoTypeOptions = FIXED_CARGO_TYPE_OPTIONS
  const [selectedCargoType, setSelectedCargoType] = useState<CargoType>('IN_BULK')
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; type: Commodity | null }>({
    isOpen: false,
    type: null,
  })
  
  const [newCommodity, setNewCommodity] = useState({
    displayName: '',
  })
  
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null)
  const [editingData, setEditingData] = useState({
    displayName: '',
    requiredImageCount: 18,
  })

  // Cargo types are a FIXED enum (Bag/Pack, Equipment, Bulk). We intentionally do
  // NOT derive extra types from existing data — legacy junk values like
  // "BREAK BULK" / "PROJECT CARGO" must never resurface as selectable types.
  const filteredCommodities = commodities.filter((type) => {
    return type.cargoType === selectedCargoType
  })

  const cargoTypeCounts = cargoTypeOptions.reduce<Record<CargoType, number>>((acc, option) => {
    acc[option.value] = commodities.filter((item) => item.cargoType === option.value).length
    return acc
  }, {} as Record<CargoType, number>)

  useEffect(() => {
    loadServiceTypes()
  }, [])

  useEffect(() => {
    if (selectedServiceType) {
      loadCommodities(selectedServiceType)
    } else {
      setCommodities([])
      setSelectedCargoType('IN_BULK')
    }
  }, [selectedServiceType])

  const loadServiceTypes = async () => {
    try {
      const data = await serviceTypeService.getAllServiceTypes()
      setServiceTypes(data)
    } catch (error) {
      console.error('Error loading service types:', error)
      toast.error('Failed to load service types', error)
    }
  }

  const loadCommodities = async (serviceTypeId: number) => {
    try {
      setLoading(true)
      const data = await commodityService.getCommoditiesByServiceType(serviceTypeId)
      setCommodities(sanitizeCommodities(data))
    } catch (error) {
      console.error('Error loading image types:', error)
      toast.error('Failed to load image types', error)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      toast.success(message)
    } else {
      toast.error(message)
    }
  }

  const deriveCommodityName = (displayName: string): string => {
    return displayName.trim().replace(/\s+/g, '_').toUpperCase()
  }

  // Avoid null entries from API responses to keep rendering safe
  const sanitizeCommodities = (data: (Commodity | null | undefined)[] | null | undefined): Commodity[] => {
    if (!Array.isArray(data)) return []
    return data.filter((item): item is Commodity => Boolean(item))
  }

  const handleAddCommodity = async () => {
    if (!selectedServiceType) {
      showToast('error', 'Please select a service type first')
      return
    }
    if (!newCommodity.displayName.trim()) {
      showToast('error', 'Cargo Name is required')
      return
    }
    if (!cargoTypeOptions.some((option) => option.value === selectedCargoType)) {
      showToast('error', 'Please select a cargo type first')
      return
    }
    const normalizedName = deriveCommodityName(newCommodity.displayName)
    
    // Check for duplicate name
    if (commodities.some(t => t.name === normalizedName)) {
      showToast('error', `Image type "${normalizedName}" already exists`)
      return
    }

    try {
      setLoading(true)
      const requestData: CreateCommodityRequest = {
        name: normalizedName,
        displayName: newCommodity.displayName.trim(),
        requiredImageCount: 18,
        serviceTypeId: selectedServiceType,
        cargoType: selectedCargoType,
      }
      
      const newType = await commodityService.createCommodity(requestData)
      if (!newType) {
        throw new Error('Empty response when creating cargo name')
      }
      setCommodities(sanitizeCommodities([...commodities, newType]))
      setNewCommodity({ displayName: '' })
      showToast('success', `Cargo "${newType.displayName}" added successfully`)
    } catch (error) {
      console.error('Error adding cargo name:', error)
      showToast('error', 'Failed to add cargo')
    } finally {
      setLoading(false)
    }
  }

  const handleEditCommodity = (type: Commodity) => {
    setEditingTypeId(type.id)
    setEditingData({
      displayName: type.displayName,
      requiredImageCount: type.requiredImageCount,
    })
  }

  const handleSaveCommodity = async (typeId: number) => {
    if (!editingData.displayName.trim()) {
      showToast('error', 'Cargo Name is required')
      return
    }
    if (editingData.requiredImageCount < 1) {
      showToast('error', 'Required count must be at least 1')
      return
    }

    if (!selectedServiceType) {
      showToast('error', 'Service type not selected')
      return
    }

    const normalizedName = deriveCommodityName(editingData.displayName)

    try {
      setLoading(true)
      const requestData: CreateCommodityRequest = {
        name: normalizedName,
        displayName: editingData.displayName.trim(),
        requiredImageCount: editingData.requiredImageCount,
        serviceTypeId: selectedServiceType,
        cargoType: commodities.find((item) => item.id === typeId)?.cargoType || 'IN_BULK',
      }
      
      const updatedType = await commodityService.updateCommodity(typeId, requestData)
      if (!updatedType) {
        throw new Error('Empty response when updating cargo type')
      }
      setCommodities(
        sanitizeCommodities(
          commodities.map(t => (t && t.id === typeId ? updatedType : t))
        )
      )
      setEditingTypeId(null)
      showToast('success', 'Cargo type updated successfully')
    } catch (error) {
      console.error('Error updating image type:', error)
      showToast('error', 'Failed to update cargo type')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingTypeId(null)
    setEditingData({ displayName: '', requiredImageCount: 18 })
  }

  const handleDeleteCommodity = (type: Commodity) => {
    setDeleteDialog({ isOpen: true, type })
  }

  const confirmDeleteCommodity = async () => {
    if (!deleteDialog.type) return

    try {
      setLoading(true)
      await commodityService.deleteCommodity(deleteDialog.type.id)
      setCommodities(commodities.filter(t => t.id !== deleteDialog.type!.id))
      showToast('success', `Cargo type "${deleteDialog.type.displayName}" deleted successfully`)
    } catch (error) {
      console.error('Error deleting image type:', error)
      const message =
        error instanceof Error && /constraint|foreign key/i.test(error.message)
          ? 'Cannot delete this cargo type because images are using it. Remove those images first.'
          : 'Failed to delete cargo type'
      showToast('error', message)
    } finally {
      setLoading(false)
      setDeleteDialog({ isOpen: false, type: null })
    }
  }

  return (
    <div className="space-y-6">
      {/* Service Type Selector */}
      <div className="bg-card border rounded-lg p-6">
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-2">Select Service Type</label>
            <select
              value={selectedServiceType || ''}
              onChange={(e) => setSelectedServiceType(e.target.value ? Number(e.target.value) : null)}
              aria-label="Select service type"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Select Service Type --</option>
              {serviceTypes.map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>

          {canAddCargo && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Cargo Name *</label>
                <input
                  type="text"
                  value={newCommodity.displayName}
                  onChange={(e) => setNewCommodity({ displayName: e.target.value })}
                  placeholder="e.g., Bulk Carrier"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <Button onClick={handleAddCommodity} className="w-full md:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Cargo
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!selectedServiceType ? (
        <div className="bg-card border rounded-lg p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a service type to manage its cargo types</p>
        </div>
      ) : (
        <>
          {/* Image Types List */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="p-4 border-b bg-muted/30">
              <div className="flex flex-wrap items-center gap-3">
                {cargoTypeOptions.map((option) => (
                  <BadgeButtonCombo
                    key={option.id}
                    label={option.label}
                    badge={<span>{cargoTypeCounts[option.value] || 0}</span>}
                    size="sm"
                    variant={selectedCargoType === option.value ? 'default' : 'outline'}
                    onClick={() => setSelectedCargoType(option.value)}
                  />
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Loading cargo types...</p>
              </div>
            ) : filteredCommodities.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No cargo types found for this cargo type.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium">Code</th>
                      <th className="text-left py-3 px-4 font-medium">Cargo Name</th>
                      <th className="text-left py-3 px-4 font-medium">Required Count</th>
                      <th className="text-left py-3 px-4 font-medium">Cargo Type</th>
                      {canEditCargo && (
                        <th className="text-right py-3 px-4 font-medium w-32">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommodities.map((type) => (
                      <tr key={type.id} className="border-t hover:bg-muted/20">
                        <td className="py-3 px-4">
                          {editingTypeId === type.id ? (
                            <span className="font-mono text-sm">{deriveCommodityName(editingData.displayName) || '-'}</span>
                          ) : (
                            <span className="font-mono text-sm">{type.name}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">  
                          {editingTypeId === type.id ? (
                            <input
                              type="text"
                              value={editingData.displayName}
                              onChange={(e) => setEditingData({ ...editingData, displayName: e.target.value })}
                              aria-label="Edit cargo name"
                              className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          ) : (
                            <span>{type.displayName}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {editingTypeId === type.id ? (
                            <input
                              type="number"
                              value={editingData.requiredImageCount}
                              onChange={(e) => setEditingData({ ...editingData, requiredImageCount: parseInt(e.target.value) || 18 })}
                              min="1"
                              aria-label="Edit required image count"
                              className="w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          ) : (
                            <span>{type.requiredImageCount}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{getCargoTypeLabel(type.cargoType, cargoTypeOptions)}</Badge>
                        </td>
                        {canEditCargo && (
                          <td className="py-3 px-4">
                            <div className="flex gap-2 justify-end">
                              {editingTypeId === type.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSaveCommodity(type.id)}
                                    className="text-success hover:text-success/80 hover:bg-success/10"
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditCommodity(type)}
                                    className="text-primary hover:text-primary/90 hover:bg-primary/10"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteCommodity(type)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, type: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete cargo type "<strong>{deleteDialog.type?.displayName}</strong>"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCommodity} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
