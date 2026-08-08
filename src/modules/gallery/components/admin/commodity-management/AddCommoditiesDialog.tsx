import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { CommodityGroup } from '@/modules/gallery/services/commodityService'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AddCommoditiesDialogProps {
  open: boolean
  loading?: boolean
  groups: CommodityGroup[]
  initialGroupId: number | null
  onClose: () => void
  onSubmit: (input: {
    groupId: number
    commodityNames: string[]
  }) => Promise<boolean>
}

export function AddCommoditiesDialog({
  open,
  loading = false,
  groups,
  initialGroupId,
  onClose,
  onSubmit,
}: AddCommoditiesDialogProps) {
  const [groupId, setGroupId] = useState<number | ''>(
    () => initialGroupId ?? groups[0]?.id ?? ''
  )
  const [commodityNames, setCommodityNames] = useState<string[]>([''])

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Add commodities</DialogTitle>
          <DialogDescription>
            Add one or more commodities to an existing group.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='add-commodity-group'>Group</Label>
            <select
              id='add-commodity-group'
              value={groupId === '' ? '' : String(groupId)}
              onChange={(event) =>
                setGroupId(
                  event.target.value ? Number(event.target.value) : ''
                )
              }
              className='w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none'
            >
              <option value=''>-- Select group --</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className='space-y-2'>
            <Label>Commodities</Label>
            {commodityNames.map((name, index) => (
              <div key={index} className='flex gap-2'>
                <Input
                  value={name}
                  onChange={(event) => {
                    const next = [...commodityNames]
                    next[index] = event.target.value
                    setCommodityNames(next)
                  }}
                  placeholder='e.g. Rice'
                  aria-label={`Commodity ${index + 1}`}
                />
                {commodityNames.length > 1 ? (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() =>
                      setCommodityNames((current) =>
                        current.filter((_, i) => i !== index)
                      )
                    }
                    aria-label={`Remove commodity row ${index + 1}`}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                ) : null}
              </div>
            ))}
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setCommodityNames((current) => [...current, ''])}
            >
              <Plus className='mr-1.5 h-3.5 w-3.5' />
              Another commodity
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type='button'
            disabled={loading || groupId === ''}
            onClick={() => {
              if (groupId === '') return
              void onSubmit({ groupId, commodityNames })
            }}
          >
            Add commodities
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
