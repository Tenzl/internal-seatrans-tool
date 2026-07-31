import type { Commodity } from '@/modules/gallery/services/commodityService'
import type { Port } from '@/modules/logistics/services/portService'
import { describe, expect, it } from 'vitest'
import {
  buildCargoNameOptions,
  buildPortOptions,
  findShippingAgencyServiceTypeId,
  resolveSelectedPortId,
} from './epdaReferenceDataRules'

describe('epdaReferenceDataRules', () => {
  it('finds shipping agency across supported service-name separators', () => {
    expect(
      findShippingAgencyServiceTypeId([
        { id: 1, name: 'Freight' },
        { id: 9, name: 'shipping agency' },
      ])
    ).toBe(9)
  })

  it('sorts and deduplicates port-of-call options', () => {
    const ports = [
      { id: 2, portOfCall: 'Vung Tau' },
      { id: 1, portOfCall: 'Da Nang' },
      { id: 3, portOfCall: 'Da Nang' },
      { id: 4, portOfCall: '' },
    ] as Port[]
    expect(buildPortOptions(ports).map((port) => port.id)).toEqual([1, 2])
  })

  it('maps legacy cargo types and preserves a stored cargo missing from catalog', () => {
    const catalog = [
      { id: 1, name: 'Coal', cargoType: 'BULK' },
      { id: 2, name: 'Crane', cargoType: 'EQUIPMENT' },
    ] as Commodity[]
    expect(
      buildCargoNameOptions(catalog, 'IN_BULK', 'Wood Chips').map(
        (item) => item.name
      )
    ).toEqual(['Wood Chips', 'Coal'])
  })

  it('uses a selected id first, then falls back to canonical name matching', () => {
    const ports = [{ id: 5, portOfCall: 'HCM', name: 'Ho Chi Minh' }] as Port[]
    expect(
      resolveSelectedPortId({
        selectedPortId: 7,
        portName: 'HCM',
        ports,
      })
    ).toBe(7)
    expect(
      resolveSelectedPortId({
        selectedPortId: null,
        portName: 'ho chi minh',
        ports,
      })
    ).toBe(5)
  })
})
