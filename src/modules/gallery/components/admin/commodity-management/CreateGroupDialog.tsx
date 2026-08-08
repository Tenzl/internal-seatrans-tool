import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
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

interface CreateGroupDialogProps {
  open: boolean
  loading?: boolean
  onClose: () => void
  onSubmit: (input: {
    groupName: string
    commodityNames: string[]
  }) => Promise<boolean>
}

export function CreateGroupDialog({
  open,
  loading = false,
  onClose,
  onSubmit,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState('')
  const [commodityNames, setCommodityNames] = useState<string[]>([''])

  const reset = () => {
    setGroupName('')
    setCommodityNames([''])
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
          <DialogDescription>
            Create a group with at least one commodity. You can rename the
            group later.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='create-group-name'>Group name</Label>
            <Input
              id='create-group-name'
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder='e.g. Foodstuffs'
              autoFocus
            />
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
                  placeholder={index === 0 ? 'e.g. Rice' : 'Commodity name'}
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
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type='button'
            disabled={loading}
            onClick={() => {
              void onSubmit({ groupName, commodityNames }).then((ok) => {
                if (ok) reset()
              })
            }}
          >
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
