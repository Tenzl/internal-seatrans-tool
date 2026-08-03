import { describe, expect, it } from 'vitest'
import {
  applyPrefillFromPrevious,
  getPrefillSourceType,
  prefillArrivalNoticeFromBl,
  prefillBillOfLadingFromOrder,
  prefillDeliveryOrderFromAn,
} from './transportDocumentPrefill'
import {
  emptyArrivalNotice,
  emptyBillOfLading,
  emptyBookingConfirmation,
  emptyDeliveryOrder,
  normalizeBillOfLadingPayload,
  stripLegacyBillOfLadingKeys,
} from './transportDocumentSchemas'

describe('transportDocumentPrefill', () => {
  it('resolves previous types in Order → BL → AN → DO chain', () => {
    expect(getPrefillSourceType('booking')).toBeNull()
    expect(getPrefillSourceType('bl')).toBe('booking')
    expect(getPrefillSourceType('an')).toBe('bl')
    expect(getPrefillSourceType('do')).toBe('an')
  })

  it('maps Order fields onto BL without touching FBL identity', () => {
    const order = emptyBookingConfirmation()
    order.placeOfReceipt = 'QUI NHON'
    order.portOfLoading = 'DA NANG'
    order.portOfDischarge = 'KOBE'
    order.placeOfDelivery = 'KOBE'
    order.vesselVoyage = 'YOUCAN / 001E'
    order.grossWeight = '24000'
    order.measurement = '20'
    order.commodity = 'STONE'
    order.date = '2026-08-05'

    const current = emptyBillOfLading()
    current.fblNumber = 'KEEP-FBL'
    current.blFormVariant = 'original'

    const next = prefillBillOfLadingFromOrder(order, current)
    expect(next.fblNumber).toBe('KEEP-FBL')
    expect(next.blFormVariant).toBe('original')
    expect(next.placeOfReceipt).toBe('QUI NHON')
    expect(next.oceanVessel).toBe('YOUCAN')
    expect(next.voyageNumber).toBe('001E')
    expect(next.descriptionOfGoods).toBe('STONE')
    expect(next.dateOfIssue).toBe('2026-08-05')
  })

  it('maps BL parties and route onto AN', () => {
    const bl = emptyBillOfLading()
    bl.fblNumber = 'ST2607036'
    bl.consignor = 'SHIPPER CO'
    bl.consignedToOrderOf = 'CONSIGNEE CO'
    bl.notifyAddress = 'NOTIFY CO'
    bl.oceanVessel = 'SITC'
    bl.voyageNumber = '2615N'
    bl.marksAndNumbers = 'N/M'
    bl.blFormVariant = 'surrendered'

    const next = prefillArrivalNoticeFromBl(bl, emptyArrivalNotice())
    expect(next.shipper).toBe('SHIPPER CO')
    expect(next.consignee).toBe('CONSIGNEE CO')
    expect(next.notifyParty).toBe('NOTIFY CO')
    expect(next.vesselVoyage).toBe('SITC/2615N')
    expect(next.hblNumber).toBe('ST2607036')
    expect(next.billOfLadingType).toBe('Surrendered')
    expect(next.anNumber).toBe('')
  })

  it('copies AN cargo rows onto DO', () => {
    const an = emptyArrivalNotice()
    an.mblNumber = 'MBL1'
    an.hblNumber = 'HBL1'
    an.cargoRows = [
      {
        containerSealNumber: 'CONT1',
        quantity: '1',
        descriptionOfGoods: 'STONE',
        grossWeight: '100',
        measurement: '2',
      },
    ]

    const next = prefillDeliveryOrderFromAn(an, emptyDeliveryOrder())
    expect(next.mblNumber).toBe('MBL1')
    expect(next.cargoRows).toEqual(an.cargoRows)
    expect(next.cargoRows).not.toBe(an.cargoRows)
    expect(next.doNumber).toBe('')
  })

  it('applyPrefillFromPrevious dispatches by type pair', () => {
    const order = emptyBookingConfirmation()
    order.portOfLoading = 'DAD'
    const bl = applyPrefillFromPrevious(
      'bl',
      'booking',
      order,
      emptyBillOfLading()
    )
    expect(bl.portOfLoading).toBe('DAD')
  })
})

describe('legacy BL stamp cleanup', () => {
  it('maps old showSurrendered into blFormVariant then drops stamp keys', () => {
    const normalized = normalizeBillOfLadingPayload({
      fblNumber: 'X',
      showSurrendered: 'yes',
      includeCompanyStamp: 'yes',
    })
    expect(normalized.blFormVariant).toBe('surrendered')
    expect(
      Object.prototype.hasOwnProperty.call(normalized, 'showSurrendered')
    ).toBe(false)
    expect(
      Object.prototype.hasOwnProperty.call(normalized, 'includeCompanyStamp')
    ).toBe(false)
  })

  it('stripLegacyBillOfLadingKeys removes stamp toggles', () => {
    const stripped = stripLegacyBillOfLadingKeys({
      fblNumber: 'X',
      showSurrendered: 'yes',
      includeCompanyStamp: 'yes',
      blFormVariant: 'original',
    })
    expect(stripped).toEqual({
      fblNumber: 'X',
      blFormVariant: 'original',
    })
  })
})
