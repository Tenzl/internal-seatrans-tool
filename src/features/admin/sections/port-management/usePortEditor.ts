'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  portService,
  type Port,
} from '@/modules/logistics/services/portService'
import type { Province } from '@/modules/logistics/services/provinceService'
import { toast } from '@/shared/utils/toast'
import {
  buildSavePortPayload,
  createPortForm,
  editPortForm,
  getProvinceOptionsForEdit,
} from './portManagement.helpers'
import { EMPTY_PORT_FORM, type PortFormState } from './portManagement.types'

interface UsePortEditorOptions {
  provinces: Province[]
  createName: string
  onSaved: () => void
}

/** Owns create/edit dialog state and the save workflow. */
export function usePortEditor({
  provinces,
  createName,
  onSaved,
}: UsePortEditorOptions) {
  const [open, setOpenState] = useState(false)
  const [editingPortId, setEditingPortId] = useState<number | null>(null)
  const [form, setForm] = useState<PortFormState>(EMPTY_PORT_FORM)
  const [isSaving, setIsSaving] = useState(false)

  const close = useCallback(() => {
    setOpenState(false)
    setEditingPortId(null)
    setForm(EMPTY_PORT_FORM)
  }, [])

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) setOpenState(true)
      else close()
    },
    [close]
  )

  const startCreate = useCallback(() => {
    setEditingPortId(null)
    setForm(createPortForm(createName))
    setOpenState(true)
  }, [createName])

  const startEdit = useCallback(
    (port: Port) => {
      setEditingPortId(port.id)
      setForm(editPortForm(port, provinces))
      setOpenState(true)
    },
    [provinces]
  )

  const updateForm = useCallback(
    <Key extends keyof PortFormState>(key: Key, value: PortFormState[Key]) => {
      setForm((current) => {
        if (key !== 'name') return { ...current, [key]: value }

        const name = String(value)
        return {
          ...current,
          name,
          portOfCall: name.trim().toUpperCase(),
        }
      })
    },
    []
  )

  const selectArea = useCallback((area: string) => {
    // A province from the previous area must never survive an area change.
    setForm((current) => ({ ...current, area, provinceId: null }))
  }, [])

  const save = useCallback(async () => {
    const isEditing = editingPortId != null

    try {
      const payload = buildSavePortPayload(form, isEditing)
      setIsSaving(true)
      if (isEditing) {
        await portService.updatePort(editingPortId, payload)
      } else {
        await portService.createPort(payload)
      }
      onSaved()
      close()
      toast.success(
        isEditing ? 'Port updated successfully' : 'Port added successfully'
      )
    } catch (error) {
      const fallback = isEditing
        ? 'Failed to update port'
        : 'Failed to add port'
      toast.error(error instanceof Error ? error.message : fallback)
    } finally {
      setIsSaving(false)
    }
  }, [close, editingPortId, form, onSaved])

  const provincesForArea = useMemo(
    () => getProvinceOptionsForEdit(provinces, form.area, form.provinceId),
    [form.area, form.provinceId, provinces]
  )

  return {
    editing: editingPortId != null,
    form,
    isSaving,
    open,
    provincesForArea,
    save,
    selectArea,
    setOpen,
    startCreate,
    startEdit,
    updateForm,
  }
}
