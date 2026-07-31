import type { Port } from '@/modules/logistics/services/portService'
import type { Province } from '@/modules/logistics/services/provinceService'
import { describe, expect, it } from 'vitest'
import {
  buildPortTableRows,
  buildPortTableTitle,
  buildSavePortPayload,
  createPortForm,
  editPortForm,
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
      provinceId: 10,
    }

    expect(editPortForm(port, provinces)).toMatchObject({
      name: 'Cai Mep',
      area: '2',
      provinceId: 10,
    })
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
