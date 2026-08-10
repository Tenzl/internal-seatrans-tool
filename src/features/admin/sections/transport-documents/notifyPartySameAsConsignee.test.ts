import { describe, expect, it } from 'vitest'
import {
  applyNotifySameAsConsignee,
  applyNotifySameAsConsigned,
  asPartyId,
  canEnableNotifySameAsConsignee,
  canEnableNotifySameAsConsigned,
  deriveNotifySameAsConsignee,
  syncNotifyFromConsigneeEdit,
  syncNotifyFromConsignedEdit,
} from './notifyPartySameAsConsignee'

describe('notifyPartySameAsConsignee', () => {
  it('enables when Consignee has a partner id or non-empty text', () => {
    expect(canEnableNotifySameAsConsignee({})).toBe(false)
    expect(canEnableNotifySameAsConsignee({ consignee: '   ' })).toBe(false)
    expect(
      canEnableNotifySameAsConsignee({ consignee: 'ACME CO\n1 Road' })
    ).toBe(true)
    expect(canEnableNotifySameAsConsignee({ consigneePartyId: 9 })).toBe(true)
    expect(canEnableNotifySameAsConsignee({ consigneePartyId: '9' })).toBe(
      false
    )
  })

  it('copies partner id and address text when checked', () => {
    expect(
      applyNotifySameAsConsignee(
        {
          consignee: 'ACME CO\n1 Road',
          consigneePartyId: 42,
        },
        true
      )
    ).toEqual({
      notifyPartySameAsConsignee: true,
      notifyParty: 'ACME CO\n1 Road',
      notifyPartyId: 42,
    })
  })

  it('copies text-only Consignee when there is no partner id', () => {
    expect(
      applyNotifySameAsConsignee(
        { consignee: 'FREEFORM CONSIGNEE', consigneePartyId: null },
        true
      )
    ).toEqual({
      notifyPartySameAsConsignee: true,
      notifyParty: 'FREEFORM CONSIGNEE',
      notifyPartyId: null,
    })
  })

  it('does not clear Notify Party fields when unchecked', () => {
    expect(
      applyNotifySameAsConsignee(
        { consignee: 'ACME', consigneePartyId: 1 },
        false
      )
    ).toEqual({ notifyPartySameAsConsignee: false })
  })

  it('mirrors Consignee edits onto Notify while synced', () => {
    expect(syncNotifyFromConsigneeEdit('consignee', 'NEXT\nADDR')).toEqual({
      notifyParty: 'NEXT\nADDR',
    })
    expect(syncNotifyFromConsigneeEdit('consigneePartyId', 7)).toEqual({
      notifyPartyId: 7,
    })
    expect(syncNotifyFromConsigneeEdit('consigneePartyId', null)).toEqual({
      notifyPartyId: null,
      notifyPartySameAsConsignee: false,
    })
    expect(syncNotifyFromConsigneeEdit('shipper', 'x')).toBeNull()
  })

  it('derives same-as from matching partner ids or text when flag is absent', () => {
    expect(
      deriveNotifySameAsConsignee({
        consigneePartyId: 5,
        notifyPartyId: 5,
        consignee: 'A',
        notifyParty: 'B',
      })
    ).toBe(true)
    expect(
      deriveNotifySameAsConsignee({
        consignee: 'SAME\nADDR',
        notifyParty: 'SAME\nADDR',
      })
    ).toBe(true)
    expect(
      deriveNotifySameAsConsignee({
        notifyPartySameAsConsignee: false,
        consigneePartyId: 5,
        notifyPartyId: 5,
        consignee: 'SAME',
        notifyParty: 'SAME',
      })
    ).toBe(false)
    expect(
      deriveNotifySameAsConsignee({
        consignee: 'A',
        notifyParty: 'B',
      })
    ).toBe(false)
  })

  it('rejects non-positive party ids', () => {
    expect(asPartyId(0)).toBeNull()
    expect(asPartyId(-1)).toBeNull()
    expect(asPartyId(3.5)).toBeNull()
    expect(asPartyId(3)).toBe(3)
  })
})

describe('notify same as consigned (BL)', () => {
  it('enables when Consigned to order of has text or partner id', () => {
    expect(canEnableNotifySameAsConsigned({})).toBe(false)
    expect(
      canEnableNotifySameAsConsigned({ consignedToOrderOf: 'ORDER OF ACME' })
    ).toBe(true)
    expect(canEnableNotifySameAsConsigned({ consigneePartyId: 7 })).toBe(true)
  })

  it('copies consigned address into notify address when checked', () => {
    expect(
      applyNotifySameAsConsigned(
        {
          consignedToOrderOf: 'ORDER OF ACME\n1 Road',
          consigneePartyId: 7,
        },
        true
      )
    ).toEqual({
      notifyPartySameAsConsignee: true,
      notifyAddress: 'ORDER OF ACME\n1 Road',
      notifyPartyId: 7,
    })
  })

  it('mirrors consigned edits onto notify while flagged', () => {
    expect(syncNotifyFromConsignedEdit('consignedToOrderOf', 'NEW')).toEqual({
      notifyAddress: 'NEW',
    })
    expect(syncNotifyFromConsignedEdit('consigneePartyId', 9)).toEqual({
      notifyPartyId: 9,
    })
    expect(syncNotifyFromConsignedEdit('consigneePartyId', null)).toEqual({
      notifyPartyId: null,
      notifyPartySameAsConsignee: false,
    })
  })
})
