import { describe, expect, it } from 'vitest'
import {
  applyPrefillFromPrevious,
  getPrefillSourceType,
  mapArrivalNoticeCargoFromBooking,
  prefillArrivalNoticeFromBooking,
  prefillArrivalNoticeHeaderFromBooking,
  prefillBillOfLadingFromBooking,
  prefillDeliveryOrderFromAn,
  syncDeliveryOrderCargoFromArrivalNotice,
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
    expect(getPrefillSourceType('bl')).toBe('booking')
    expect(getPrefillSourceType('do')).toBe('an')
  })

  it('maps shared Booking route and schedule without cargo on create', () => {
    const booking = emptyBookingConfirmation()
    booking.bookingNumber = 'BK-101'
    booking.placeOfReceipt = 'QUI NHON'
    booking.portOfLoading = 'DA NANG'
    booking.portOfDischarge = 'KOBE'
    booking.placeOfDelivery = 'KOBE'
    booking.vesselVoyage = 'YOUCAN / 001E'
    booking.grossWeight = '24000'
    booking.measurement = '20'
    booking.commodity = 'Rice IN Foodstuffs'
    booking.date = '2026-08-05'
    booking.etd = '2026-08-06'
    booking.eta = '2026-08-12'
    booking.cargoVolumes = { "20'DC": 3, "40'RF": 1 }
    booking.volume = "3 x 20'DC\n1 x 40'RF"

    const next = prefillArrivalNoticeHeaderFromBooking(
      booking,
      emptyArrivalNotice()
    )
    expect(next.shipmentNumber).toBe('BK-101')
    expect(next.placeOfReceipt).toBe('QUI NHON')
    expect(next.vesselVoyage).toBe('YOUCAN / 001E')
    expect(next.etd).toBe('2026-08-06')
    expect(next.eta).toBe('2026-08-12')
    expect(next.volume).toBe('')
    expect(next.descriptionOfGoods).toBe('')
    expect(next.containers).toHaveLength(1)
    expect(next.containers[0]?.type).toBe('')
  })

  it('maps Booking cargo onto a new AN with typed container rows', () => {
    const booking = emptyBookingConfirmation()
    booking.bookingNumber = 'BK-101'
    booking.placeOfReceipt = 'QUI NHON'
    booking.portOfLoading = 'DA NANG'
    booking.portOfDischarge = 'KOBE'
    booking.placeOfDelivery = 'KOBE'
    booking.vesselVoyage = 'YOUCAN / 001E'
    booking.grossWeight = '24000'
    booking.measurement = '20'
    booking.commodity = 'Rice IN Foodstuffs'
    booking.commodityId = 42
    booking.date = '2026-08-05'
    booking.etd = '2026-08-06'
    booking.eta = '2026-08-12'
    booking.cargoVolumes = { "20'DC": 3, "40'RF": 1 }
    booking.volume = "3 x 20'DC\n1 x 40'RF"

    const next = mapArrivalNoticeCargoFromBooking(booking, emptyArrivalNotice())
    expect(next.volume).toBe("3 x 20'DC\n1 x 40'RF")
    expect(next.containers).toHaveLength(4)
    expect(next.containers.map((row) => row.type)).toEqual([
      "20'DC",
      "20'DC",
      "20'DC",
      "40'RF",
    ])
    // Totals stay on row 1 only — no invented per-container splits or numbers.
    expect(next.containers[0]?.containerNo).toBe('')
    expect(next.containers[0]?.sealNo).toBe('')
    expect(next.containers[0]?.grossWeight).toBe('24000')
    expect(next.containers[0]?.measurement).toBe('20')
    expect(next.containers[0]?.note).toBe('')
    expect(next.descriptionOfGoods).toBe('Rice IN Foodstuffs')
    expect(next.commodityId).toBe(42)
    expect(next.containers[1]?.grossWeight).toBe('')
    expect(next.containers[1]?.measurement).toBe('')
    expect(next.containers[1]?.note).toBe('')
  })

  it('never overwrites AN container details already entered by staff', () => {
    const booking = emptyBookingConfirmation()
    booking.cargoVolumes = { "20'DC": 2 }
    booking.commodity = 'STONE'

    const current = emptyArrivalNotice()
    current.descriptionOfGoods = 'CUSTOM DESCRIPTION'
    current.containers[0] = {
      ...current.containers[0]!,
      containerNo: 'SEGU1234567',
      sealNo: 'SEAL-01',
    }

    const next = mapArrivalNoticeCargoFromBooking(booking, current)

    expect(next.containers).toEqual(current.containers)
    expect(next.descriptionOfGoods).toBe('CUSTOM DESCRIPTION')
  })

  it('prefillArrivalNoticeFromBooking still applies header + cargo together', () => {
    const booking = emptyBookingConfirmation()
    booking.bookingNumber = 'BK-101'
    booking.cargoVolumes = { "20'DC": 1 }
    booking.grossWeight = '1000'
    booking.commodity = 'Rice IN Foodstuffs'

    const next = prefillArrivalNoticeFromBooking(booking, emptyArrivalNotice())
    expect(next.shipmentNumber).toBe('BK-101')
    expect(next.containers).toHaveLength(1)
    expect(next.containers[0]?.type).toBe("20'DC")
    expect(next.descriptionOfGoods).toBe('Rice IN Foodstuffs')
  })

  it("seeds 3 typed rows from 20'DC: 3 with GW/measurement on first row only", () => {
    const booking = emptyBookingConfirmation()
    booking.cargoVolumes = { "20'DC": 3 }
    booking.grossWeight = '15000 KGS'
    booking.measurement = '45 CBM'

    const next = prefillArrivalNoticeFromBooking(booking, emptyArrivalNotice())
    expect(next.containers).toHaveLength(3)
    expect(next.containers.map((row) => row.type)).toEqual([
      "20'DC",
      "20'DC",
      "20'DC",
    ])
    expect(next.containers.every((row) => row.containerNo === '')).toBe(true)
    expect(next.containers[0]?.grossWeight).toBe('15000 KGS')
    expect(next.containers[0]?.measurement).toBe('45 CBM')
    expect(
      next.containers.slice(1).every((row) => row.grossWeight === '')
    ).toBe(true)
    expect(
      next.containers.slice(1).every((row) => row.measurement === '')
    ).toBe(true)
  })

  it('parses legacy booking volume text when cargoVolumes is empty', () => {
    const booking = emptyBookingConfirmation()
    booking.cargoVolumes = {}
    booking.volume = "2 x 20'DC\n1 x 40'HC"
    booking.grossWeight = '9000'
    booking.measurement = '12'

    const next = prefillArrivalNoticeFromBooking(booking, emptyArrivalNotice())
    expect(next.containers.map((row) => row.type)).toEqual([
      "20'DC",
      "20'DC",
      "40'HC",
    ])
    expect(next.containers[0]?.grossWeight).toBe('9000')
    expect(next.containers[0]?.measurement).toBe('12')
    expect(next.volume).toBe("2 x 20'DC\n1 x 40'HC")
  })

  it('falls back to one blank row with booking GW/measurement when volumes empty', () => {
    const booking = emptyBookingConfirmation()
    booking.cargoVolumes = {}
    booking.volume = ''
    booking.grossWeight = '1000'
    booking.measurement = '2'
    booking.commodity = 'GENERAL'

    const next = prefillArrivalNoticeFromBooking(booking, emptyArrivalNotice())
    expect(next.containers).toHaveLength(1)
    expect(next.containers[0]?.type).toBe('')
    expect(next.containers[0]?.containerNo).toBe('')
    expect(next.containers[0]?.grossWeight).toBe('1000')
    expect(next.containers[0]?.measurement).toBe('2')
    expect(next.containers[0]?.note).toBe('')
    expect(next.descriptionOfGoods).toBe('GENERAL')
  })

  it('seeds BL route, schedule, and cargo from Booking without parties', () => {
    const booking = emptyBookingConfirmation()
    booking.date = '2026-08-05'
    booking.etd = '2026-08-06'
    booking.placeOfReceipt = 'QUI NHON'
    booking.portOfLoading = 'DA NANG'
    booking.portOfDischarge = 'KOBE'
    booking.placeOfDelivery = 'KOBE'
    booking.vesselVoyage = 'YOUCAN / 001E'
    booking.grossWeight = '24000'
    booking.measurement = '20'
    booking.commodity = 'Rice IN Foodstuffs'
    booking.cargoVolumes = { "20'DC": 2 }
    booking.volume = "2 x 20'DC"

    const next = prefillBillOfLadingFromBooking(booking, emptyBillOfLading())
    expect(next.dateOfIssue).toBe('2026-08-06')
    expect(next.cleanOnBoardDate).toBe('2026-08-06')
    expect(next.placeOfReceipt).toBe('QUI NHON')
    expect(next.portOfLoading).toBe('DA NANG')
    expect(next.portOfDischarge).toBe('KOBE')
    expect(next.placeOfDelivery).toBe('KOBE')
    expect(next.placeOfIssue).toBe('DA NANG')
    expect(next.freightPayableAt).toBe('KOBE')
    expect(next.oceanVessel).toBe('YOUCAN / 001E')
    expect(next.fblNumber).toBe('')
    expect(next.consignor).toBe('')
    expect(next.serviceMode).toBe('')
    expect(next.shippingMark).toBe('')
    expect(next.numberAndKindOfPackages).toBe("2 x 20'DC")
    expect(next.containers).toHaveLength(2)
    expect(next.containers.map((row) => row.type)).toEqual(["20'DC", "20'DC"])
    expect(next.containers[0]?.containerNo).toBe('')
    expect(next.containers[0]?.sealNo).toBe('')
    expect(next.containers[0]?.grossWeight).toBe('24000')
    expect(next.containers[0]?.measurement).toBe('20')
    expect(next.descriptionOfGoods).toBe('Rice IN Foodstuffs')
    expect(next.grossWeight).toBe('24000 KGS')
    expect(next.measurement).toBe('20 CBM')
  })

  it('maps AN containers onto DO cargo rows without sharing arrays', () => {
    const an = emptyArrivalNotice()
    an.mblNumber = 'MBL1'
    an.hblNumber = 'HBL1'
    an.consignee = 'CONSIGNEE CO'
    an.consigneePartyId = 11
    an.notifyPartyId = 12
    an.serviceMode = 'FCL/FCL - CY/CY'
    an.descriptionOfGoods = 'STONE'
    an.etd = '2026-08-06'
    an.eta = '2026-08-12'
    an.containers = [
      {
        type: "20'DC",
        containerNo: 'CONT1',
        sealNo: 'SEAL1',
        grossWeight: '100',
        measurement: '2',
        tare: '',
        packageType: '',
        noOfPkgs: '1',
        note: 'ignored',
        method: '',
      },
    ]

    const next = prefillDeliveryOrderFromAn(an, emptyDeliveryOrder())
    expect(next.mblNumber).toBe('MBL1')
    expect(next.notifyPartyId).toBe(12)
    expect(next.deliverTo).toBe('CONSIGNEE CO')
    expect(next.consigneePartyId).toBe(11)
    expect(next.serviceMode).toBe('FCL/FCL - CY/CY')
    expect(next.descriptionOfGoods).toBe('STONE')
    expect(next.etd).toBe('2026-08-06')
    expect(next.eta).toBe('2026-08-12')
    expect(next.containers).toEqual(an.containers)
    expect(next.containers).not.toBe(an.containers)
    expect(next.cargoRows).toEqual([
      {
        containerSealNumber: 'CONT1 / SEAL1',
        quantity: '1',
        descriptionOfGoods: "20'DC\nSTONE",
        grossWeight: '100 KGS',
        measurement: '2 CBM',
      },
    ])
    expect(next.volume).toBe("1 x 20'DC")
    expect(next.doNumber).toBe('')
  })

  it('syncs only DO cargo/container rows from AN without touching other DO fields', () => {
    const an = emptyArrivalNotice()
    an.serviceMode = 'CY/CY'
    an.descriptionOfGoods = 'UPDATED STONE'
    an.containers = [
      {
        type: "20'DC",
        containerNo: 'C1',
        sealNo: 'S1',
        noOfPkgs: '3',
        packageType: 'PKGS',
        grossWeight: '500',
        measurement: '8',
        tare: '',
        note: '',
        method: '',
      },
    ]

    const doPayload = emptyDeliveryOrder()
    doPayload.doNumber = 'KEEP DO'
    doPayload.deliverTo = 'KEEP DELIVER TO'
    doPayload.marks = 'KEEP MARKS'
    doPayload.serviceMode = 'OLD MODE'
    doPayload.descriptionOfGoods = 'OLD DESC'
    doPayload.containers = [
      {
        type: "40'HC",
        containerNo: 'OLD',
        sealNo: '',
        noOfPkgs: '1',
        packageType: '',
        grossWeight: '1',
        measurement: '1',
        tare: '',
        note: '',
        method: '',
      },
    ]

    const next = syncDeliveryOrderCargoFromArrivalNotice(an, doPayload)
    expect(next.doNumber).toBe('KEEP DO')
    expect(next.deliverTo).toBe('KEEP DELIVER TO')
    expect(next.marks).toBe('KEEP MARKS')
    expect(next.serviceMode).toBe('CY/CY')
    expect(next.descriptionOfGoods).toBe('UPDATED STONE')
    expect(next.containers).toEqual(an.containers)
    expect(next.containers).not.toBe(an.containers)
    expect(next.cargoRows).toEqual([
      {
        containerSealNumber: 'C1 / S1',
        quantity: '3 PKGS',
        descriptionOfGoods: "20'DC\nUPDATED STONE",
        grossWeight: '500 KGS',
        measurement: '8 CBM',
      },
    ])
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

    booking.commodity = 'STONE'
    const bl = applyPrefillFromPrevious(
      'bl',
      'booking',
      booking,
      emptyBillOfLading()
    )
    expect(bl.descriptionOfGoods).toBe('STONE')
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
      voyageNumber: '001E',
    })
    expect(stripped).toEqual({
      fblNumber: 'X',
      blFormVariant: 'original',
    })
  })
})
