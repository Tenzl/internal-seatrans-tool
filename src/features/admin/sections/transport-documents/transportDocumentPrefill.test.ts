import { describe, expect, it } from 'vitest'
import {
  applyPrefillFromPrevious,
  getPrefillSourceType,
  prefillArrivalNoticeFromBooking,
  prefillBillOfLadingFromArrivalNotice,
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
  it('resolves previous types for both booking workflow branches', () => {
    expect(getPrefillSourceType('booking')).toBeNull()
    expect(getPrefillSourceType('an')).toBe('booking')
    expect(getPrefillSourceType('bl')).toBe('an')
    expect(getPrefillSourceType('do')).toBe('an')
  })

  it('maps shared Booking route, schedule and cargo fields onto AN', () => {
    const booking = emptyBookingConfirmation()
    booking.bookingNumber = 'BK-101'
    booking.placeOfReceipt = 'QUI NHON'
    booking.portOfLoading = 'DA NANG'
    booking.portOfDischarge = 'KOBE'
    booking.placeOfDelivery = 'KOBE'
    booking.vesselVoyage = 'YOUCAN / 001E'
    booking.grossWeight = '24000'
    booking.measurement = '20'
    booking.commodity = 'STONE'
    booking.date = '2026-08-05'
    booking.etd = '2026-08-06'
    booking.eta = '2026-08-12'
    booking.agent = 'APEX\nTOKYO, JAPAN'
    booking.agentPartyId = 46
    booking.shipper = 'SHIPPER CO\nVIETNAM'
    booking.shipperPartyId = 10
    booking.consignee = 'CONSIGNEE CO\nJAPAN'
    booking.consigneePartyId = 11
    booking.notifyParty = booking.consignee
    booking.notifyPartyId = booking.consigneePartyId

    const next = prefillArrivalNoticeFromBooking(booking, emptyArrivalNotice())
    expect(next.anNumber).toBe('')
    expect(next.shipmentNumber).toBe('BK-101')
    expect(next.placeOfReceipt).toBe('QUI NHON')
    expect(next.vesselVoyage).toBe('YOUCAN / 001E')
    expect(next.etdEta).toBe('2026-08-06 / 2026-08-12')
    expect(next.cargoRows[0]?.descriptionOfGoods).toBe('STONE')
    expect(next.agentPartyId).toBe(46)
    expect(next.shipperPartyId).toBe(10)
    expect(next.consigneePartyId).toBe(11)
    expect(next.notifyPartyId).toBe(11)
  })

  it('maps shared AN parties, route and cargo fields onto BL', () => {
    const an = emptyArrivalNotice()
    an.hblNumber = 'ST2607036'
    an.shipper = 'SHIPPER CO'
    an.shipperPartyId = 10
    an.consignee = 'CONSIGNEE CO'
    an.consigneePartyId = 11
    an.notifyParty = 'NOTIFY CO'
    an.notifyPartyId = 12
    an.vesselVoyage = 'SITC / 2615N'
    an.marks = 'N/M'
    an.volume = '10 PKGS'
    an.cargoRows[0] = {
      containerSealNumber: 'CONT1',
      quantity: '10',
      descriptionOfGoods: 'STONE',
      grossWeight: '100',
      measurement: '2',
    }

    const next = prefillBillOfLadingFromArrivalNotice(an, emptyBillOfLading())
    expect(next.fblNumber).toBe('ST2607036')
    expect(next.consignor).toBe('SHIPPER CO')
    expect(next.consignedToOrderOf).toBe('CONSIGNEE CO')
    expect(next.notifyAddress).toBe('NOTIFY CO')
    expect(next.shipperPartyId).toBe(10)
    expect(next.consigneePartyId).toBe(11)
    expect(next.notifyPartyId).toBe(12)
    expect(next.oceanVessel).toBe('SITC')
    expect(next.voyageNumber).toBe('2615N')
    expect(next.descriptionOfGoods).toBe('STONE')
  })

  it('copies AN cargo rows onto DO without sharing mutable arrays', () => {
    const an = emptyArrivalNotice()
    an.mblNumber = 'MBL1'
    an.hblNumber = 'HBL1'
    an.notifyPartyId = 12
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
    expect(next.notifyPartyId).toBe(12)
    expect(next.cargoRows).toEqual(an.cargoRows)
    expect(next.cargoRows).not.toBe(an.cargoRows)
    expect(next.doNumber).toBe('')
  })

  it('dispatches prefill only for the configured previous step', () => {
    const booking = emptyBookingConfirmation()
    booking.portOfLoading = 'DAD'
    const an = applyPrefillFromPrevious(
      'an',
      'booking',
      booking,
      emptyArrivalNotice()
    )
    expect(an.portOfLoading).toBe('DAD')
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
