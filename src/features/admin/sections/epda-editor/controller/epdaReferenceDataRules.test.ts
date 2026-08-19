import type {
  Commodity,
  CommodityType,
} from '@/modules/gallery/services/commodityService'
import type { Port } from '@/modules/logistics/services/portService'
import { describe, expect, it } from 'vitest'
import { resolveInquiryCargo } from '@/features/admin/components/invoice/epda/epdaBusinessRules'
import {
  buildCargoNameOptions,
  buildCargoTypeOptions,
  buildPortOptions,
  findShippingAgencyServiceTypeId,
  resolveEpdaCatalogIds,
  resolveEpdaCargoTypeSelection,
  resolveEpdaTypeSnapshot,
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

  it('builds Type options from the dynamic backend catalog', () => {
    const types = [
      { id: 11, serviceTypeId: 9, name: 'Bulk cargo' },
      { id: 12, serviceTypeId: 9, name: 'Project cargo' },
    ] as CommodityType[]

    expect(buildCargoTypeOptions(types, '', null)).toEqual([
      {
        id: 11,
        value: '11',
        label: 'Bulk cargo',
        nameSnapshot: 'Bulk cargo',
      },
      {
        id: 12,
        value: '12',
        label: 'Project cargo',
        nameSnapshot: 'Project cargo',
      },
    ])
  })

  it('selects a renamed/custom Type by stable id instead of its old snapshot', () => {
    const options = buildCargoTypeOptions(
      [{ id: 11, serviceTypeId: 9, name: 'Dry bulk' }] as CommodityType[],
      'IN_BULK',
      11
    )

    expect(options).toEqual([
      { id: 11, value: '11', label: 'Dry bulk', nameSnapshot: 'Dry bulk' },
    ])
    expect(
      resolveEpdaTypeSnapshot(
        [{ id: 11, serviceTypeId: 9, name: 'Dry bulk' }] as CommodityType[],
        11,
        'IN_BULK'
      )
    ).toBe('Dry bulk')
  })

  it('keeps Commodities independent when Type changes', () => {
    const catalog = [
      { id: 1, name: 'Coal', cargoType: 'BULK' },
      { id: 2, name: 'Crane', cargoType: 'EQUIPMENT' },
    ] as Commodity[]

    expect(
      buildCargoNameOptions(catalog, 'Wood Chips').map((item) => item.name)
    ).toEqual(['Wood Chips', 'Coal', 'Crane'])

    const next = {
      cargoName: 'Coal',
      ...resolveEpdaCargoTypeSelection(
        [
          {
            id: 11,
            value: '11',
            label: 'Bag/Pack',
            nameSnapshot: 'Bag/Pack',
          },
        ],
        '11'
      ),
    }
    expect(next).toMatchObject({
      commodityTypeId: 11,
      cargoType: 'Bag/Pack',
      cargoName: 'Coal',
    })
  })

  it('preserves legacy Type and Commodity snapshots missing from catalogs', () => {
    const catalog = [{ id: 1, name: 'Coal', cargoType: 'BULK' }] as Commodity[]

    expect(
      resolveInquiryCargo(
        {
          commodityTypeId: null,
          cargoType: 'Legacy project',
          cargoName: 'Wood Chips',
        },
        catalog
      )
    ).toEqual({
      commodityTypeId: null,
      cargoType: 'Legacy project',
      cargoName: 'Wood Chips',
    })
    expect(buildCargoTypeOptions([], 'Legacy project', null)).toEqual([
      {
        id: null,
        value: 'legacy:LEGACY_PROJECT',
        label: 'Legacy project',
        nameSnapshot: 'Legacy project',
        legacyCode: 'LEGACY_PROJECT',
      },
    ])
  })

  it('resolves independent IDs while leaving legacy/OTHER snapshots intact', () => {
    const commodities = [
      { id: 21, serviceTypeId: 9, name: 'Coal', displayName: 'Coal' },
    ] as Commodity[]

    expect(resolveEpdaCatalogIds(11, commodities, 'Coal')).toEqual({
      commodityTypeId: 11,
      commodityId: 21,
    })
    expect(resolveEpdaCatalogIds(null, commodities, 'OTHER')).toEqual({
      commodityTypeId: undefined,
      commodityId: undefined,
    })
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
