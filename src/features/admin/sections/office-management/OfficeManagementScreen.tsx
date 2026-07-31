'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  provinceService,
  type Province,
} from '@/modules/logistics/services/provinceService'
import { parseGoogleMapsUrl } from '@/shared/utils/parseGoogleMapsUrl'
import { toast } from '@/shared/utils/toast'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OfficeForm } from './OfficeForm'
import { OfficeList } from './OfficeList'
import {
  createEmptyOfficeForm,
  officeFormToRequest,
  officeToForm,
  type Office,
  validateOfficeForm,
} from './officeModel'
import { officeService } from './officeService'

export function OfficeManagementScreen() {
  const [offices, setOffices] = useState<Office[]>([])
  const [provinces, setProvinces] = useState<Province[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(createEmptyOfficeForm)
  const parsedMap = useMemo(
    () => parseGoogleMapsUrl(form.mapUrl),
    [form.mapUrl]
  )

  useEffect(() => {
    void officeService
      .list()
      .then(setOffices)
      .catch((error) => toast.error('Failed to load offices', error))
      .finally(() => setLoading(false))

    void provinceService
      .getAllProvinces()
      .then(setProvinces)
      .catch((error) => toast.error('Failed to load provinces', error))
  }, [])

  const startAdding = () => {
    setAdding(true)
    setEditingId(null)
    setForm(createEmptyOfficeForm())
  }

  const startEditing = (office: Office) => {
    setEditingId(office.id)
    setAdding(false)
    setForm(officeToForm(office, provinces))
  }

  const cancelEditing = () => {
    setEditingId(null)
    setAdding(false)
  }

  const saveOffice = async () => {
    const validationMessage = validateOfficeForm(form, parsedMap)
    if (validationMessage) {
      alert(validationMessage)
      return
    }

    try {
      const request = officeFormToRequest(form)
      const savedOffice =
        editingId == null
          ? await officeService.create(request)
          : await officeService.update(editingId, request)

      alert('Office saved successfully!')
      setOffices((current) =>
        editingId == null
          ? [...current, savedOffice]
          : current.map((office) =>
              office.id === editingId ? savedOffice : office
            )
      )
      setEditingId(null)
      setAdding(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed'
      alert(`Failed to save office: ${message}`)
    }
  }

  const deleteOffice = async (id: number) => {
    if (!confirm('Are you sure you want to delete this office?')) return

    try {
      await officeService.delete(id)
      setOffices((current) => current.filter((office) => office.id !== id))
    } catch (error) {
      toast.error('Failed to delete office', error)
    }
  }

  if (loading) {
    return <div className='p-8'>Loading offices...</div>
  }

  const editorOpen = adding || editingId != null

  return (
    <div>
      <div className='mb-6 flex items-center justify-end gap-4 border-b border-border/50 pb-4'>
        <Button onClick={startAdding} disabled={editorOpen}>
          <Plus className='mr-2 h-4 w-4' />
          Add Office
        </Button>
      </div>

      {editorOpen ? (
        <OfficeForm
          adding={adding}
          form={form}
          parsedMap={parsedMap}
          provinces={provinces}
          onFormChange={setForm}
          onSave={() => void saveOffice()}
          onCancel={cancelEditing}
        />
      ) : null}

      <OfficeList
        offices={offices}
        actionsDisabled={editorOpen}
        onEdit={startEditing}
        onDelete={(id) => void deleteOffice(id)}
      />
    </div>
  )
}
