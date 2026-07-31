import { Building2, Edit, MapPin, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Office } from './officeModel'

type OfficeListProps = {
  offices: Office[]
  actionsDisabled: boolean
  onEdit: (office: Office) => void
  onDelete: (id: number) => void
}

export function OfficeList({
  offices,
  actionsDisabled,
  onEdit,
  onDelete,
}: OfficeListProps) {
  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {offices.map((office) => (
        <div
          key={office.id}
          className='rounded-lg border bg-card p-4 transition-shadow hover:shadow-lg'
        >
          <div className='mb-3 flex items-start justify-between'>
            <div>
              <h3 className='flex items-center gap-2 font-semibold'>
                <Building2 className='h-4 w-4' />
                {office.city}
                {office.isHeadquarter ? (
                  <span className='bg-warning/20 text-warning rounded px-2 py-0.5 text-xs'>
                    HQ
                  </span>
                ) : null}
              </h3>
              <p className='text-sm text-muted-foreground'>{office.name}</p>
            </div>
          </div>

          <div className='mb-4 space-y-2'>
            <div className='flex items-start gap-2'>
              <MapPin className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
              <p className='text-sm text-muted-foreground'>{office.address}</p>
            </div>
            <div className='text-sm'>
              <p className='font-medium'>{office.manager.name}</p>
              <p className='text-muted-foreground'>{office.manager.title}</p>
              <p className='text-primary'>{office.manager.mobile}</p>
            </div>
          </div>

          <div className='flex gap-2'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => onEdit(office)}
              disabled={actionsDisabled}
              className='flex-1'
            >
              <Edit className='mr-1 h-3.5 w-3.5' />
              Edit
            </Button>
            <Button
              size='sm'
              variant='destructive'
              onClick={() => onDelete(office.id)}
              disabled={actionsDisabled}
              className='flex-1'
            >
              <Trash2 className='mr-1 h-3.5 w-3.5' />
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
