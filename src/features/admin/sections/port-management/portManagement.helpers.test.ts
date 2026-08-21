import type { Port } from '@/modules/logistics/services/portService'
import type { Province } from '@/modules/logistics/services/provinceService'
import { describe, expect, it } from 'vitest'
import {
  buildPortTableRows,
  buildPortTableTitle,
  buildSavePortPayload,
  createPortForm,
  editPortForm,
  getProvinceOptionsForEdit,
} from './portManagement.helpers'
import { EMPTY_PORT_FORM } from './portManagement.types'

const provinces: Province[] = [
  { id: 10, name: 'Ba Ria - Vung Tau', displayName: 'Vung Tau', area: 2 },
]

describe('port management helpers', () => {
  it('prefills a create form and keeps port-of-call uppercase', () => {
    expect(createPortForm('  cat lai  ')).toMatchObject({
      name: 'cat lai',
      portOfCall: 'CAT LAI',
      countryCode: 'VN',
    })
  })

  it('derives an edit area from the selected province', () => {
    const port: Port = {
      id: 1,
      name: 'Cai Mep',
      portOfCall: 'CAI MEP',
      subName1: 'CAI MEP PORT',
      subName2: 'CAI MEP TERMINAL',
      provinceId: 10,
    }

    expect(editPortForm(port, provinces)).toMatchObject({
      name: 'Cai Mep',
      subName1: 'CAI MEP PORT',
      subName2: 'CAI MEP TERMINAL',
      area: '2',
      provinceId: 10,
    })
  })

  it('keeps the selected province visible in Edit even when its area metadata is stale', () => {
    expect(getProvinceOptionsForEdit(provinces, '1', 10)).toEqual(provinces)
  })

  it('sends both sub names and allows clearing them during Edit', () => {
    expect(
      buildSavePortPayload(
        {
          ...EMPTY_PORT_FORM,
          name: 'QUY NHON PORT',
          subName1: ' QUI NHON ',
          subName2: '',
        },
        true
      )
    ).toMatchObject({ subName1: 'QUI NHON', subName2: '' })
  })

  it('normalizes optional coordinates for the backend DTO', () => {
    expect(
      buildSavePortPayload(
        {
          ...EMPTY_PORT_FORM,
          name: '  Cai Mep  ',
          latitude: '010.7300',
          longitude: ' 106.71 ',
        },
        false
      )
    ).toEqual({
      name: 'Cai Mep',
      provinceId: null,
      type: 'PORT',
      inCharge: false,
      zoneCode: 'AS-SIN',
      countryCode: 'VN',
      latitude: '10.73',
      longitude: '106.71',
    })
  })

  it('sends an empty port-of-call while editing so it can be cleared', () => {
    expect(
      buildSavePortPayload(
        { ...EMPTY_PORT_FORM, name: 'Cai Mep', portOfCall: '' },
        true
      )
    ).toMatchObject({ portOfCall: '' })
  })

  it('requires area and province when inCharge is true', () => {
    expect(() =>
      buildSavePortPayload(
        { ...EMPTY_PORT_FORM, name: 'Cai Mep', inCharge: true },
        false
      )
    ).toThrow('Area is required when In charge is checked')

    expect(() =>
      buildSavePortPayload(
        {
          ...EMPTY_PORT_FORM,
          name: 'Cai Mep',
          inCharge: true,
          area: '2',
          provinceId: null,
        },
        false
      )
    ).toThrow('Province is required when In charge is checked')
  })

  it('rejects invalid coordinates before an API request', () => {
    expect(() =>
      buildSavePortPayload(
        { ...EMPTY_PORT_FORM, name: 'Cai Mep', latitude: 'not-a-number' },
        false
      )
    ).toThrow('Latitude must be a valid number')
  })

  it('derives table labels and places unknown ports last', () => {
    const rows = buildPortTableRows(
      [
        {
          id: 2,
          name: 'Unknown Port',
          provinceId: null,
          countryCode: 'SG',
        },
        {
          id: 1,
          name: 'Cai Mep',
          provinceId: 10,
          countryCode: 'VN',
        },
      ],
      provinces
    )

    expect(rows.map((row) => row.name)).toEqual(['Cai Mep', 'Unknown Port'])
    expect(rows[0]).toMatchObject({ area: 'Area 2', provinceName: 'Vung Tau' })
  })

  it('describes paginated search results', () => {
    expect(
      buildPortTableTitle({
        search: 'cat',
        searchFieldLabel: 'Port Name',
        shownCount: 20,
        totalCount: 21,
      })
    ).toBe('Port Name — 21 matches (showing 20, refine search)')
  })
})
