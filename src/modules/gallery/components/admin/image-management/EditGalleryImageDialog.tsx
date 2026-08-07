import { type ReactNode, useEffect, useState } from 'react'
import {
  commodityService,
  type Commodity,
} from '@/modules/gallery/services/commodityService'
import {
  galleryService,
  type GalleryImage,
} from '@/modules/gallery/services/galleryService'
import {
  portService,
  type Port,
} from '@/modules/logistics/services/portService'
import type { Province } from '@/modules/logistics/services/provinceService'
import type { ServiceType } from '@/modules/service-types/services/serviceTypeService'
import { toast } from '@/shared/utils/toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

type EditForm = {
  provinceId: number | null
  portId: number | null
  serviceTypeId: number | null
  commodityId: number | null
}

type EditGalleryImageDialogProps = {
  image: GalleryImage
  provinces: Province[]
  serviceTypes: ServiceType[]
  onClose: () => void
  onSaved: () => Promise<void>
}

const selectClassName =
  'w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted'

export function EditGalleryImageDialog({
  image,
  provinces,
  serviceTypes,
  onClose,
  onSaved,
}: EditGalleryImageDialogProps) {
  const [saving, setSaving] = useState(false)
  const [ports, setPorts] = useState<Port[]>([])
  const [commodities, setCommodities] = useState<Commodity[]>([])
  const [form, setForm] = useState<EditForm>({
    provinceId: image.provinceId ?? null,
    portId: image.portId ?? null,
    serviceTypeId: image.serviceTypeId ?? null,
    commodityId: image.commodityId ?? null,
  })

  useEffect(() => {
    let active = true

    const loadOptions = async () => {
      const [portsResult, commoditiesResult] = await Promise.allSettled([
        portService.getPortsByProvince(image.provinceId!),
        commodityService.getCommoditiesByServiceType(image.serviceTypeId!),
      ])

      if (!active) return

      if (portsResult.status === 'fulfilled') {
        setPorts(portsResult.value)
      } else {
        setPorts([])
        toast.error('Failed to load ports', portsResult.reason)
      }

      if (commoditiesResult.status === 'fulfilled') {
        setCommodities(commoditiesResult.value)
      } else {
        setCommodities([])
        toast.error('Failed to load commodities', commoditiesResult.reason)
      }
    }

    void loadOptions()
    return () => {
      active = false
    }
  }, [image.provinceId, image.serviceTypeId])

  const changeProvince = async (provinceId: number | null) => {
    setForm((current) => ({ ...current, provinceId, portId: null }))
    if (!provinceId) {
      setPorts([])
      return
    }

    try {
      setPorts(await portService.getPortsByProvince(provinceId))
    } catch (error) {
      setPorts([])
      toast.error('Failed to load ports', error)
    }
  }

  const changeServiceType = async (serviceTypeId: number | null) => {
    setForm((current) => ({ ...current, serviceTypeId, commodityId: null }))
    if (!serviceTypeId) {
      setCommodities([])
      return
    }

    try {
      setCommodities(
        await commodityService.getCommoditiesByServiceType(serviceTypeId)
      )
    } catch (error) {
      setCommodities([])
      toast.error('Failed to load commodities', error)
    }
  }

  const save = async () => {
    if (
      !form.provinceId ||
      !form.portId ||
      !form.serviceTypeId ||
      !form.commodityId
    ) {
      alert('Please select all required fields.')
      return
    }

    try {
      setSaving(true)
      await galleryService.updateImage(image.id, {
        provinceId: form.provinceId,
        portId: form.portId,
        serviceTypeId: form.serviceTypeId,
        commodityId: form.commodityId,
      })
      onClose()
      await onSaved()
    } catch {
      alert('Failed to update image information')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-xl'>
        <DialogTitle>Edit Image Information</DialogTitle>
        <DialogDescription>
          Update province, port, service type, and cargo type for this image.
        </DialogDescription>

        <div className='grid gap-4 py-2'>
          <SelectField
            label='Province'
            value={form.provinceId}
            onChange={(value) => void changeProvince(value)}
          >
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            label='Port'
            value={form.portId}
            disabled={!form.provinceId}
            onChange={(portId) =>
              setForm((current) => ({ ...current, portId }))
            }
          >
            {ports.map((port) => (
              <option key={port.id} value={port.id}>
                {port.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            label='Service Type'
            value={form.serviceTypeId}
            onChange={(value) => void changeServiceType(value)}
          >
            {serviceTypes.map((serviceType) => (
              <option key={serviceType.id} value={serviceType.id}>
                {serviceType.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            label='Cargo Type'
            value={form.commodityId}
            disabled={!form.serviceTypeId}
            onChange={(commodityId) =>
              setForm((current) => ({ ...current, commodityId }))
            }
          >
            {commodities.map((commodity) => (
              <option key={commodity.id} value={commodity.id}>
                {commodity.displayName}
              </option>
            ))}
          </SelectField>
        </div>

        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SelectField({
  label,
  value,
  disabled,
  onChange,
  children,
}: {
  label: string
  value: number | null
  disabled?: boolean
  onChange: (value: number | null) => void
  children: ReactNode
}) {
  return (
    <div>
      <label className='mb-2 block text-sm font-medium'>{label}</label>
      <select
        value={value ?? ''}
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : null)
        }
        disabled={disabled}
        className={selectClassName}
        title={label}
      >
        <option value=''>Select {label.toLowerCase()}</option>
        {children}
      </select>
    </div>
  )
}
