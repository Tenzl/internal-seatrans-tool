import type { Province } from '@/modules/logistics/services/provinceService'
import { parseGoogleMapsUrl } from '@/shared/utils/parseGoogleMapsUrl'
import { describe, expect, it } from 'vitest'
import {
  createEmptyOfficeForm,
  officeFormToRequest,
  officeToForm,
  type Office,
  validateOfficeForm,
} from './officeModel'

const office: Office = {
  id: 1,
  name: 'Branch',
  city: 'Hai Phong',
  region: '',
  address: '1 Port Road',
  manager: { name: '', title: '', mobile: '', email: '' },
  isHeadquarter: false,
  isActive: true,
}

describe('office model', () => {
  it('maps legacy city names to a province when provinceId is missing', () => {
    const provinces = [{ id: 15, name: ' hai phong ' }] as Province[]
    expect(officeToForm(office, provinces).provinceId).toBe('15')
  })

  it('prefers the persisted provinceId over the legacy location fallback', () => {
    const provinces = [{ id: 15, name: 'Hai Phong' }] as Province[]
    expect(
      officeToForm({ ...office, provinceId: 20 }, provinces).provinceId
    ).toBe('20')
  })

  it('validates required fields and Google Maps coordinates', () => {
    const form = createEmptyOfficeForm()
    expect(validateOfficeForm(form, parseGoogleMapsUrl(form.mapUrl))).toContain(
      'required fields'
    )

    form.provinceId = '15'
    form.name = 'Branch'
    form.address = '1 Port Road'
    form.mapUrl = 'not-a-map'
    expect(
      validateOfficeForm(form, parseGoogleMapsUrl(form.mapUrl))
    ).toBeTruthy()
  })

  it('builds the existing API payload and trims the map URL', () => {
    const form = createEmptyOfficeForm()
    form.provinceId = '15'
    form.name = 'Branch'
    form.address = '1 Port Road'
    form.mapUrl = ' https://maps.google.com/?q=20.1,106.2 '

    expect(officeFormToRequest(form)).toMatchObject({
      provinceId: 15,
      name: 'Branch',
      mapUrl: 'https://maps.google.com/?q=20.1,106.2',
      isActive: true,
    })
  })
})
