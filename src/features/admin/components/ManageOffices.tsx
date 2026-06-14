'use client'

import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Building2, MapPin, Plus, Edit, Trash2, Save, X, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import { provinceService, type Province } from '@/modules/logistics/services/provinceService'
import type { ApiResponse } from '@/shared/types/api.types'
import { parseGoogleMapsUrl } from '@/shared/utils/parseGoogleMapsUrl'

interface Office {
  id: number
  provinceId?: number | null
  name: string
  city: string
  region: string
  address: string
  mapUrl?: string | null
  latitude?: string | number | null
  longitude?: string | number | null
  manager: {
    name: string
    title: string
    mobile: string
    email: string
  }
  coordinates?: {
    lat?: string | number | null
    lng?: string | number | null
  }
  isHeadquarter: boolean
  isActive: boolean
}

const EMPTY_FORM = {
  provinceId: '',
  name: '',
  address: '',
  mapUrl: '',
  managerName: '',
  managerTitle: '',
  managerMobile: '',
  managerEmail: '',
  isHeadquarter: false,
}

export function ManageOffices() {
  const [offices, setOffices] = useState<Office[]>([])
  const [provinces, setProvinces] = useState<Province[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const parsedMap = useMemo(() => parseGoogleMapsUrl(formData.mapUrl), [formData.mapUrl])

  useEffect(() => {
    fetchOffices()
    fetchProvinces()
  }, [])

  const fetchOffices = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<ApiResponse<Office[]>>(API_CONFIG.OFFICES.ADMIN_BASE)
      const data = await response.json()
      setOffices(data.data)
    } catch (error) {
      console.error('Error fetching offices:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProvinces = async () => {
    try {
      const data = await provinceService.getAllProvinces()
      setProvinces(data)
    } catch (error) {
      console.error('Error fetching provinces:', error)
    }
  }

  const handleAdd = () => {
    setAdding(true)
    setEditing(null)
    setFormData(EMPTY_FORM)
  }

  const handleEdit = (office: Office) => {
    setEditing(office.id)
    setAdding(false)
    const normalize = (value?: string) => (value || '').toLowerCase().trim()
    const matchedProvinceId = office.provinceId
      ?? provinces.find(p => normalize(p.name) === normalize(office.city) || normalize(p.name) === normalize(office.region))?.id

    setFormData({
      provinceId: matchedProvinceId ? matchedProvinceId.toString() : '',
      name: office.name,
      address: office.address,
      mapUrl: office.mapUrl || '',
      managerName: office.manager?.name || '',
      managerTitle: office.manager?.title || '',
      managerMobile: office.manager?.mobile || '',
      managerEmail: office.manager?.email || '',
      isHeadquarter: office.isHeadquarter,
    })
  }

  const handleSave = async () => {
    if (!formData.provinceId || !formData.name || !formData.address) {
      alert('Please fill in required fields (Province, Name, Address)')
      return
    }

    if (!formData.mapUrl.trim()) {
      alert('Please paste a Google Maps URL.')
      return
    }

    if (!parsedMap.ok) {
      alert(parsedMap.message)
      return
    }

    try {
      const payload: Record<string, unknown> = {
        provinceId: parseInt(formData.provinceId),
        name: formData.name,
        address: formData.address,
        mapUrl: formData.mapUrl.trim(),
        managerName: formData.managerName,
        managerTitle: formData.managerTitle,
        managerMobile: formData.managerMobile,
        managerEmail: formData.managerEmail,
        isHeadquarter: formData.isHeadquarter,
        isActive: true,
      }

      const url = editing
        ? API_CONFIG.OFFICES.ADMIN_BY_ID(editing)
        : API_CONFIG.OFFICES.ADMIN_BASE

      const response = editing
        ? await apiClient.put<ApiResponse<Office>>(url, payload)
        : await apiClient.post<ApiResponse<Office>>(url, payload)

      if (response.ok) {
        const data = await response.json()
        alert('Office saved successfully!')
        if (editing) {
          setOffices(prev => prev.map(item => item.id === editing ? data.data : item))
        } else {
          setOffices(prev => [...prev, data.data])
        }
        setEditing(null)
        setAdding(false)
      } else {
        let errorMessage = response.statusText
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (e) {
          // Response body is empty or not JSON
        }
        console.error('Error response:', errorMessage)
        alert(`Failed to save office: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error saving office:', error)
      alert('An error occurred while saving the office. Check console for details.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this office?')) return
    
    try {
      const response = await apiClient.delete(API_CONFIG.OFFICES.ADMIN_BY_ID(id))

      if (response.ok) {
        setOffices(prev => prev.filter(office => office.id !== id))
      }
    } catch (error) {
      console.error('Error deleting office:', error)
    }
  }

  const handleCancel = () => {
    setEditing(null)
    setAdding(false)
  }

  if (loading) {
    return <div className="p-8">Loading offices...</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-end gap-4 border-b border-border/50 pb-4">
        <Button onClick={handleAdd} disabled={adding || editing !== null}>
          <Plus className="mr-2 h-4 w-4" />
          Add Office
        </Button>
      </div>

      {/* Add/Edit Form */}
      {(adding || editing !== null) && (
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {adding ? 'Add New Office' : 'Edit Office'}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="provinceId">Province *</Label>
              <select
                id="provinceId"
                name="provinceId"
                aria-label="Select province"
                value={formData.provinceId}
                onChange={(e) => setFormData({ ...formData, provinceId: e.target.value })}
                className="w-full mt-2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                required
              >
                <option value="">Select province...</option>
                {provinces.map(province => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="name">Office Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., SEATRANS Head Office"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
                rows={2}
                required
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="mapUrl">Google Maps Link *</Label>
                <span className="text-xs text-muted-foreground">
                  Open the place in Google Maps and paste the URL from the browser address bar.
                </span>
              </div>
              <Textarea
                id="mapUrl"
                value={formData.mapUrl}
                onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                placeholder="https://www.google.com/maps/place/..."
                rows={2}
                required
                spellCheck={false}
                className={`font-mono text-xs ${
                  formData.mapUrl && !parsedMap.ok
                    ? 'border-destructive focus-visible:ring-destructive/30'
                    : ''
                }`}
              />
              {formData.mapUrl ? (
                parsedMap.ok ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200/60 bg-emerald-50/60 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-mono text-xs tabular-nums text-emerald-900 dark:text-emerald-200">
                        {parsedMap.lat.toFixed(7)}, {parsedMap.lng.toFixed(7)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70">
                        {parsedMap.source === 'pin' ? 'place pin' : parsedMap.source === 'viewport' ? 'viewport center' : 'query'}
                      </span>
                    </div>
                    <a
                      href={formData.mapUrl.trim()}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200"
                    >
                      Preview <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{parsedMap.message}</span>
                  </div>
                )
              ) : null}
            </div>

            <div>
              <Label htmlFor="managerName">Manager Name</Label>
              <Input
                id="managerName"
                value={formData.managerName}
                onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                placeholder="e.g., Minh Khang (Mr)"
              />
            </div>

            <div>
              <Label htmlFor="managerTitle">Manager Title</Label>
              <Input
                id="managerTitle"
                value={formData.managerTitle}
                onChange={(e) => setFormData({ ...formData, managerTitle: e.target.value })}
                placeholder="e.g., Office Supervisor"
              />
            </div>

            <div>
              <Label htmlFor="managerMobile">Manager Mobile</Label>
              <Input
                id="managerMobile"
                value={formData.managerMobile}
                onChange={(e) => setFormData({ ...formData, managerMobile: e.target.value })}
                placeholder="e.g., +84 90-111-2233"
              />
            </div>

            <div>
              <Label htmlFor="managerEmail">Manager Email</Label>
              <Input
                id="managerEmail"
                type="email"
                value={formData.managerEmail}
                onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                placeholder="e.g., office@seatrans.com.vn"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isHeadquarter"
                name="isHeadquarter"
                aria-label="Mark as head office"
                checked={formData.isHeadquarter}
                onChange={(e) => setFormData({ ...formData, isHeadquarter: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isHeadquarter" className="!mb-0 cursor-pointer">
                Mark as Head Office
              </Label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button onClick={handleCancel} variant="outline">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Offices List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offices.map(office => (
          <div
            key={office.id}
            className="bg-card border rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {office.city}
                  {office.isHeadquarter && (
                    <span className="text-xs px-2 py-0.5 bg-warning/20 text-warning rounded">
                      HQ
                    </span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">{office.name}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{office.address}</p>
              </div>
              <div className="text-sm">
                <p className="font-medium">{office.manager.name}</p>
                <p className="text-muted-foreground">{office.manager.title}</p>
                <p className="text-primary">{office.manager.mobile}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(office)}
                disabled={adding || editing !== null}
                className="flex-1"
              >
                <Edit className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(office.id)}
                disabled={adding || editing !== null}
                className="flex-1"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
