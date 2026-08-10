'use client'

import { type FormEvent, useEffect, useState } from 'react'
import {
  portService,
  type Port,
} from '@/modules/logistics/services/portService'
import type { Province } from '@/modules/logistics/services/provinceService'
import { NumberInput } from '@/shared/components/NumberInput'
import {
  getPortAreaShortLabel,
  isPortAreaCode,
  PORT_AREA_OPTIONS,
} from '@/shared/domain/portArea'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  NO_SELECTION,
  PORT_TYPE_OPTIONS,
  type PortFormState,
} from './portManagement.types'

const NAME_SEARCH_SIZE = 8

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
  onEditExisting: (port: Port) => void
  onSave: () => Promise<void>
}

function formatMatchMeta(port: Port): string {
  const area =
    port.provinceArea != null ? String(port.provinceArea) : null
  const bits = [
    port.type ?? 'PORT',
    area && isPortAreaCode(area) ? getPortAreaShortLabel(area) : null,
    port.provinceName,
    port.code,
    port.countryCode,
  ].filter(Boolean)
  return bits.join(' · ')
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
  onEditExisting,
  onSave,
}: PortEditorDialogProps) {
  const debouncedName = useDebouncedValue(form.name, 300)
  const [nameMatches, setNameMatches] = useState<Port[]>([])
  const [nameSearchLoading, setNameSearchLoading] = useState(false)
  const requireLocation = form.inCharge

  useEffect(() => {
    if (!open || editing) {
      setNameMatches([])
      setNameSearchLoading(false)
      return
    }

    const q = debouncedName.trim()
    if (!q) {
      setNameMatches([])
      setNameSearchLoading(false)
      return
    }

    const controller = new AbortController()
    setNameSearchLoading(true)

    void portService
      .listPortsPaginated(
        { q, searchIn: 'name', page: 0, size: NAME_SEARCH_SIZE },
        controller.signal
      )
      .then((page) => {
        if (controller.signal.aborted) return
        setNameMatches(page.content)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setNameMatches([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setNameSearchLoading(false)
      })

    return () => controller.abort()
  }, [debouncedName, editing, open])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void onSave()
  }

  const showNameSearch = !editing && debouncedName.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex flex-col sm:min-h-[620px] sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit' : 'Add new'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the information below.'
              : 'Search by name for an existing entry, or continue to create a new one.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='flex flex-1 flex-col'>
          <div className='grid flex-1 grid-cols-1 content-start gap-3 py-2 md:grid-cols-2'>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='port-name'>Name</Label>
              <Input
                id='port-name'
                value={form.name}
                onChange={(event) => onChange('name', event.target.value)}
                placeholder={
                  editing ? 'Enter name' : 'Search or enter a new name'
                }
                required
                autoFocus
              />
              {showNameSearch ? (
                <div className='overflow-hidden rounded-md border border-border/80 bg-muted/30'>
                  {nameSearchLoading ? (
                    <div className='flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground'>
                      <Loader2 className='h-3.5 w-3.5 animate-spin' />
                      Searching…
                    </div>
                  ) : nameMatches.length === 0 ? (
                    <p className='px-3 py-2.5 text-sm text-muted-foreground'>
                      No matches. Continue to create a new one.
                    </p>
                  ) : (
                    <ul className='max-h-40 divide-y divide-border/70 overflow-y-auto'>
                      {nameMatches.map((port) => (
                        <li
                          key={port.id}
                          className='flex items-center gap-2 px-3 py-2'
                        >
                          <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm font-medium'>
                              {port.name}
                            </p>
                            <p className='truncate text-xs text-muted-foreground'>
                              {formatMatchMeta(port)}
                            </p>
                          </div>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-7 shrink-0 px-2 text-xs hover:bg-accent'
                            onClick={() => onEditExisting(port)}
                          >
                            Edit
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            <div className='flex flex-wrap items-end gap-x-5 gap-y-2 pb-2 md:col-span-2'>
              {PORT_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`port-type-${option.value}`}
                  className='flex cursor-pointer items-center gap-2 text-sm'
                >
                  <Checkbox
                    id={`port-type-${option.value}`}
                    checked={form.type === option.value}
                    onCheckedChange={(checked) => {
                      if (checked === true) onChange('type', option.value)
                    }}
                  />
                  {option.label}
                </label>
              ))}
              <label
                htmlFor='port-in-charge'
                className='flex cursor-pointer items-center gap-2 text-sm'
              >
                <Checkbox
                  id='port-in-charge'
                  checked={form.inCharge}
                  onCheckedChange={(checked) =>
                    onChange('inCharge', checked === true)
                  }
                />
                In charge
              </label>
            </div>

            <div className='space-y-2'>
              <Label>
                Area
                {requireLocation ? (
                  <span className='text-destructive'> *</span>
                ) : null}
              </Label>
              <Select
                value={form.area || NO_SELECTION}
                onValueChange={onAreaChange}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select area' />
                </SelectTrigger>
                <SelectContent>
                  {!requireLocation ? (
                    <SelectItem value={NO_SELECTION}>No Area</SelectItem>
                  ) : null}
                  {PORT_AREA_OPTIONS.map((area) => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>
                Province
                {requireLocation ? (
                  <span className='text-destructive'> *</span>
                ) : null}
              </Label>
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
                <SelectTrigger className='w-full'>
                  <SelectValue
                    placeholder={
                      form.area === NO_SELECTION
                        ? 'Select area first'
                        : 'Select province'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {!requireLocation ? (
                    <SelectItem value={NO_SELECTION}>No Province</SelectItem>
                  ) : null}
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
              <Label htmlFor='port-zone-code'>Zone Code (default Vietnam)</Label>
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
