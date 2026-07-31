import type { ServiceType } from '@/modules/service-types/services/serviceTypeService'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CommodityToolbarProps {
  serviceTypes: ServiceType[]
  selectedServiceType: number | null
  canAddCargo: boolean
  newCommodityName: string
  onServiceTypeChange: (serviceTypeId: number | null) => void
  onNameChange: (name: string) => void
  onAdd: () => void
}

export function CommodityToolbar({
  serviceTypes,
  selectedServiceType,
  canAddCargo,
  newCommodityName,
  onServiceTypeChange,
  onNameChange,
  onAdd,
}: CommodityToolbarProps) {
  return (
    <div className='rounded-lg border bg-card p-6'>
      <div className='grid items-end gap-4 md:grid-cols-3'>
        <div>
          <label className='mb-2 block text-sm font-medium'>
            Select Service Type
          </label>
          <select
            value={selectedServiceType || ''}
            onChange={(event) =>
              onServiceTypeChange(
                event.target.value ? Number(event.target.value) : null
              )
            }
            aria-label='Select service type'
            className='w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none'
          >
            <option value=''>-- Select Service Type --</option>
            {serviceTypes.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        {canAddCargo && (
          <>
            <div>
              <label className='mb-2 block text-sm font-medium'>
                Cargo Name *
              </label>
              <input
                type='text'
                value={newCommodityName}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder='e.g., Bulk Carrier'
                className='w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none'
              />
            </div>

            <div>
              <Button onClick={onAdd} className='w-full md:w-auto'>
                <Plus className='mr-2 h-4 w-4' />
                Add Cargo
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
