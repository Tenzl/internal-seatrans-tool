import type {
  CargoType,
  Commodity,
} from '@/modules/gallery/services/commodityService'
import { NumberInput } from '@/shared/components/NumberInput'
import { Edit2, Package, Save, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import BadgeButtonCombo from '@/components/ui/badge-button-combo'
import { Button } from '@/components/ui/button'
import {
  deriveCommodityName,
  FIXED_CARGO_TYPE_OPTIONS,
  getCargoTypeLabel,
  type CommodityEditData,
} from './commodityManagementModel'

interface CommodityTableProps {
  selectedServiceType: number | null
  selectedCargoType: CargoType
  cargoTypeCounts: Record<CargoType, number>
  commodities: Commodity[]
  loading: boolean
  canEditCommodity: boolean
  editingTypeId: number | null
  editingData: CommodityEditData
  onCargoTypeChange: (cargoType: CargoType) => void
  onStartEdit: (commodity: Commodity) => void
  onEditNameChange: (name: string) => void
  onEditRequiredCountChange: (value: string) => void
  onSave: (commodityId: number) => void
  onCancelEdit: () => void
  onDelete: (commodity: Commodity) => void
}

export function CommodityTable({
  selectedServiceType,
  selectedCargoType,
  cargoTypeCounts,
  commodities,
  loading,
  canEditCommodity,
  editingTypeId,
  editingData,
  onCargoTypeChange,
  onStartEdit,
  onEditNameChange,
  onEditRequiredCountChange,
  onSave,
  onCancelEdit,
  onDelete,
}: CommodityTableProps) {
  if (!selectedServiceType) {
    return (
      <div className='rounded-lg border bg-card p-12 text-center'>
        <Package className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
        <p className='text-muted-foreground'>
          Select a service type to manage its commodities
        </p>
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-lg border bg-card'>
      <div className='border-b bg-muted/30 p-4'>
        <div className='flex flex-wrap items-center gap-3'>
          {FIXED_CARGO_TYPE_OPTIONS.map((option) => (
            <BadgeButtonCombo
              key={option.id}
              label={option.label}
              badge={<span>{cargoTypeCounts[option.value] || 0}</span>}
              size='sm'
              variant={
                selectedCargoType === option.value ? 'default' : 'outline'
              }
              onClick={() => onCargoTypeChange(option.value)}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div className='p-12 text-center'>
          <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent' />
          <p className='text-muted-foreground'>Loading commodities...</p>
        </div>
      ) : commodities.length === 0 ? (
        <div className='p-12 text-center'>
          <Package className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
          <p className='text-muted-foreground'>
            No commodities found for this cargo type.
          </p>
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-muted/50'>
              <tr>
                <th className='px-4 py-3 text-left font-medium'>Code</th>
                <th className='px-4 py-3 text-left font-medium'>Commodity Name</th>
                <th className='px-4 py-3 text-left font-medium'>
                  Required Count
                </th>
                <th className='px-4 py-3 text-left font-medium'>Cargo Type</th>
                {canEditCommodity && (
                  <th className='w-32 px-4 py-3 text-right font-medium'>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {commodities.map((commodity) => {
                const isEditing = editingTypeId === commodity.id
                return (
                  <tr key={commodity.id} className='border-t hover:bg-muted/20'>
                    <td className='px-4 py-3'>
                      <span className='font-mono text-sm'>
                        {isEditing
                          ? deriveCommodityName(editingData.displayName) || '-'
                          : commodity.name}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      {isEditing ? (
                        <input
                          type='text'
                          value={editingData.displayName}
                          onChange={(event) =>
                            onEditNameChange(event.target.value)
                          }
                          aria-label='Edit commodity name'
                          className='w-full rounded border px-3 py-1 focus:ring-2 focus:ring-primary focus:outline-none'
                        />
                      ) : (
                        <span>{commodity.displayName}</span>
                      )}
                    </td>
                    <td className='px-4 py-3'>
                      {isEditing ? (
                        <NumberInput
                          value={editingData.requiredImageCount}
                          decimalScale={0}
                          onValueChange={(_value, canonical) =>
                            onEditRequiredCountChange(canonical)
                          }
                          min={1}
                          aria-label='Edit required image count'
                          className='w-full rounded border px-3 py-1 focus:ring-2 focus:ring-primary focus:outline-none'
                        />
                      ) : (
                        <span>{commodity.requiredImageCount}</span>
                      )}
                    </td>
                    <td className='px-4 py-3'>
                      <Badge variant='outline'>
                        {getCargoTypeLabel(commodity.cargoType)}
                      </Badge>
                    </td>
                    {canEditCommodity && (
                      <td className='px-4 py-3'>
                        <div className='flex justify-end gap-2'>
                          {isEditing ? (
                            <>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => onSave(commodity.id)}
                                className='text-success hover:bg-success/10 hover:text-success/80'
                              >
                                <Save className='h-4 w-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={onCancelEdit}
                                className='text-muted-foreground hover:bg-muted hover:text-foreground'
                              >
                                <X className='h-4 w-4' />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => onStartEdit(commodity)}
                                className='text-primary hover:bg-primary/10 hover:text-primary/90'
                              >
                                <Edit2 className='h-4 w-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => onDelete(commodity)}
                                className='text-red-600 hover:bg-red-50 hover:text-red-700'
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
