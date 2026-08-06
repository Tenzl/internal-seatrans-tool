import { describe, expect, it } from 'vitest'
import {
  applyPrefillFromPrevious,
  getPrefillSourceType,
  mapArrivalNoticeCargoFromBooking,
  prefillArrivalNoticeFromBooking,
  prefillArrivalNoticeHeaderFromBooking,
  prefillBillOfLadingFromArrivalNotice,
  prefillDeliveryOrderFromAn,
  syncBillOfLadingCargoFromArrivalNotice,
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
    expect(getPrefillSourceType('bl')).toBe('an')
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
    booking.commodity = 'STONE'
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

  it('maps Booking cargo onto AN on first save with typed container rows', () => {
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
    expect(next.descriptionOfGoods).toBe('STONE')
    expect(next.containers[1]?.grossWeight).toBe('')
    expect(next.containers[1]?.measurement).toBe('')
    expect(next.containers[1]?.note).toBe('')
  })

  it('prefillArrivalNoticeFromBooking still applies header + cargo together', () => {
    const booking = emptyBookingConfirmation()
    booking.bookingNumber = 'BK-101'
    booking.cargoVolumes = { "20'DC": 1 }
    booking.grossWeight = '1000'
    booking.commodity = 'STONE'

    const next = prefillArrivalNoticeFromBooking(booking, emptyArrivalNotice())
    expect(next.shipmentNumber).toBe('BK-101')
    expect(next.containers).toHaveLength(1)
    expect(next.containers[0]?.type).toBe("20'DC")
    expect(next.descriptionOfGoods).toBe('STONE')
  })

  it('seeds 3 typed rows from 20\'DC: 3 with GW/measurement on first row only', () => {
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
    expect(next.containers.slice(1).every((row) => row.grossWeight === '')).toBe(
      true
    )
    expect(next.containers.slice(1).every((row) => row.measurement === '')).toBe(
      true
    )
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

  it('maps shared AN parties, route and copies containers onto BL', () => {
    const an = emptyArrivalNotice()
    an.hblNumber = 'ST2607036'
    an.shipper = 'SHIPPER CO'
    an.shipperPartyId = 10
    an.notifyParty = 'NOTIFY CO'
    an.notifyPartyId = 12
    an.consignee = 'CONSIGNEE CO'
    an.consigneePartyId = 11
    an.vesselVoyage = 'SITC / 2615N'
    an.marks = 'N/M'
    an.serviceMode = 'FCL/FCL - CY/CY'
    an.volume = '10 PKGS'
    an.descriptionOfGoods = 'STONE AND PARTS'
    an.containers = [
      {
        type: "20'DC",
        containerNo: 'CONT1',
        sealNo: 'SEAL1',
        noOfPkgs: '10',
        packageType: 'PKGS',
        grossWeight: '100',
        measurement: '2',
        tare: '',
        note: 'row note ignored',
        method: '',
      },
      {
        type: "40'HC",
        containerNo: 'CONT2',
        sealNo: '',
        noOfPkgs: '5',
        packageType: '',
        grossWeight: '200',
        measurement: '4',
        tare: '',
        note: '',
        method: '',
      },
    ]

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
    expect(next.shippingMark).toBe('N/M')
    expect(next.serviceMode).toBe('FCL/FCL - CY/CY')
    expect(next.numberAndKindOfPackages).toBe("1 x 20'DC\n1 x 40'HC")
    expect(next.containers).toEqual(an.containers)
    expect(next.containers).not.toBe(an.containers)
    expect(next.descriptionOfGoods).toBe('STONE AND PARTS')
    expect(next.grossWeight).toBe('100\n200')
    expect(next.measurement).toBe('2\n4')
  })

  it('syncs only BL cargo fields from AN without touching parties/route', () => {
    const an = emptyArrivalNotice()
    an.marks = 'NEW MARKS'
    an.serviceMode = 'CY/CY'
    an.descriptionOfGoods = 'UPDATED STONE'
    an.volume = 'legacy volume ignored when typed'
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

    const bl = emptyBillOfLading()
    bl.consignor = 'KEEP CONSIGNOR'
    bl.oceanVessel = 'KEEP VESSEL'
    bl.freightTerms = 'FREIGHT PREPAID'
    bl.shippingMark = 'OLD'
    bl.descriptionOfGoods = 'OLD DESC'
    bl.containers = [
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

    const next = syncBillOfLadingCargoFromArrivalNotice(an, bl)
    expect(next.consignor).toBe('KEEP CONSIGNOR')
    expect(next.oceanVessel).toBe('KEEP VESSEL')
    expect(next.freightTerms).toBe('FREIGHT PREPAID')
    expect(next.shippingMark).toBe('OLD')
    expect(next.serviceMode).toBe('CY/CY')
    expect(next.descriptionOfGoods).toBe('UPDATED STONE')
    expect(next.numberAndKindOfPackages).toBe("1 x 20'DC")
    expect(next.containers).toEqual(an.containers)
    expect(next.containers).not.toBe(an.containers)
    expect(next.grossWeight).toBe('500')
    expect(next.measurement).toBe('8')
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
        grossWeight: '100',
        measurement: '2',
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
        grossWeight: '500',
        measurement: '8',
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
