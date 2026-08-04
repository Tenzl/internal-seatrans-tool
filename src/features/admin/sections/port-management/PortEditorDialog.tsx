'use client'

import { type FormEvent } from 'react'
import type { Province } from '@/modules/logistics/services/provinceService'
import { NumberInput } from '@/shared/components/NumberInput'
import { PORT_AREA_OPTIONS } from '@/shared/domain/portArea'
import { Loader2, Plus } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NO_SELECTION, type PortFormState } from './portManagement.types'

interface PortEditorDialogProps {
  open: boolean
  editing: boolean
  busy: boolean
  form: PortFormState
  provinces: Province[]
  onOpenChange: (open: boolean) => void
  onChange: <Key extends keyof PortFormState>(
    key: Key,
    value: PortFormState[Key]
  ) => void
  onAreaChange: (area: string) => void
  onSave: () => Promise<void>
}

export function PortEditorDialog({
  open,
  editing,
  busy,
  form,
  provinces,
  onOpenChange,
  onChange,
  onAreaChange,
  onSave,
}: PortEditorDialogProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void onSave()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex flex-col sm:min-h-[620px] sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Port' : 'Add New Port'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the port information below.'
              : 'No matching port was found. Fill in the details to create a new port.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='flex flex-1 flex-col'>
          <div className='grid flex-1 grid-cols-1 content-start gap-3 py-2 md:grid-cols-2'>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='port-name'>Port Name</Label>
              <Input
                id='port-name'
                value={form.name}
                onChange={(event) => onChange('name', event.target.value)}
                placeholder='Enter port name'
                required
                autoFocus
              />
            </div>

            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='port-of-call'>Port of Call</Label>
              <Input
                id='port-of-call'
                value={form.portOfCall}
                placeholder='Auto-generated from Port Name'
                disabled
                readOnly
              />
            </div>

            <div className='space-y-2'>
              <Label>Area</Label>
              <Select
                value={form.area || NO_SELECTION}
                onValueChange={onAreaChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select area' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION}>No Area</SelectItem>
                  {PORT_AREA_OPTIONS.map((area) => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>Province</Label>
              <Select
                value={form.provinceId?.toString() ?? NO_SELECTION}
                onValueChange={(value) =>
                  onChange(
                    'provinceId',
                    value === NO_SELECTION ? null : Number(value)
                  )
                }
                disabled={form.area === NO_SELECTION}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      form.area === NO_SELECTION
                        ? 'Select area first'
                        : 'Select province'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION}>No Province</SelectItem>
                  {provinces.map((province) => (
                    <SelectItem
                      key={province.id}
                      value={province.id.toString()}
                    >
                      {province.displayName || province.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='port-code'>Code (optional)</Label>
              <Input
                id='port-code'
                value={form.code}
                onChange={(event) => onChange('code', event.target.value)}
                placeholder='e.g., port code'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='port-zone-code'>Zone Code</Label>
              <Input
                id='port-zone-code'
                value={form.zoneCode}
                onChange={(event) => onChange('zoneCode', event.target.value)}
                placeholder='e.g., AS-SIN'
              />
            </div>

            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='port-country-code'>Country Code</Label>
              <Input
                id='port-country-code'
                value={form.countryCode}
                onChange={(event) =>
                  onChange('countryCode', event.target.value)
                }
                placeholder='e.g., VN'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='port-latitude'>Latitude (optional)</Label>
              <NumberInput
                id='port-latitude'
                value={form.latitude}
                onValueChange={(_value, canonical) =>
                  onChange('latitude', canonical)
                }
                placeholder='e.g., 10.73'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='port-longitude'>Longitude (optional)</Label>
              <NumberInput
                id='port-longitude'
                value={form.longitude}
                onValueChange={(_value, canonical) =>
                  onChange('longitude', canonical)
                }
                placeholder='e.g., 106.71'
              />
            </div>
          </div>

          <DialogFooter className='mt-auto'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={busy} className='gap-2'>
              {busy ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Plus className='h-4 w-4' />
              )}
              {editing ? 'Save changes' : 'Add New'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
