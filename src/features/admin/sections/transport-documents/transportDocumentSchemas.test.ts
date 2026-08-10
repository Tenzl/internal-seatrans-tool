import { describe, expect, it } from 'vitest'
import type { ArrivalNoticePayload } from './transportDocument.types'
import {
  cargoRowSchema,
  emptyArrivalNotice,
  emptyBillOfLading,
  emptyBookingConfirmation,
  emptyDeliveryOrder,
  normalizeArrivalNoticePayload,
  normalizeBillOfLadingPayload,
  normalizeDeliveryOrderPayload,
  parseTransportDocument,
  resolveArrivalNoticeScheduleFields,
} from './transportDocumentSchemas'

describe('transport document schemas', () => {
  it('keeps the backend cargo row property names intact', () => {
    expect(
      cargoRowSchema.parse({
        containerSealNumber: ' CMAU8501220 / R7540686 ',
        quantity: '930 CARTONS',
        descriptionOfGoods: 'GREEN TEA',
        grossWeight: '16,368 KGS',
        measurement: '63.9 CBM',
      })
    ).toEqual({
      containerSealNumber: 'CMAU8501220 / R7540686',
      quantity: '930 CARTONS',
      descriptionOfGoods: 'GREEN TEA',
      grossWeight: '16,368 KGS',
      measurement: '63.9 CBM',
    })
  })

  it('rejects more than 20 container rows before the preview request', () => {
    const payload = emptyArrivalNotice()
    payload.containers = Array.from({ length: 21 }, () => ({
      type: '',
      containerNo: '',
      sealNo: '',
      grossWeight: '',
      measurement: '',
      tare: '',
      packageType: '',
      noOfPkgs: '',
      note: '',
      method: '',
    }))

    expect(() => parseTransportDocument('an', payload)).toThrow(
      'A maximum of 20 container rows is allowed'
    )
  })

  it('migrates legacy AN cargoRows into containers on parse', () => {
    const parsed = parseTransportDocument('an', {
      ...emptyArrivalNotice(),
      containers: undefined,
      cargoRows: [
        {
          containerSealNumber: 'CONT / SEAL',
          quantity: '10',
          descriptionOfGoods: 'STONE',
          grossWeight: '100',
          measurement: '2',
        },
      ],
    } as never)

    expect(parsed.containers).toEqual([
      {
        type: '',
        containerNo: 'CONT',
        sealNo: 'SEAL',
        grossWeight: '100',
        measurement: '2',
        tare: '',
        packageType: '',
        noOfPkgs: '10',
        note: 'STONE',
        method: '',
      },
    ])
    expect(parsed.descriptionOfGoods).toBe('STONE')
    expect(Object.prototype.hasOwnProperty.call(parsed, 'cargoRows')).toBe(
      false
    )
  })

  it('splits legacy AN etdEta into separate etd and eta date fields', () => {
    expect(
      resolveArrivalNoticeScheduleFields({
        etdEta: 'ETD 2026-08-06 / ETA 2026-08-12',
      })
    ).toEqual({ etd: '2026-08-06', eta: '2026-08-12' })

    const migrated = normalizeArrivalNoticePayload({
      ...emptyArrivalNotice(),
      etdEta: '2026-08-06 / 2026-08-12',
    })
    expect(migrated.etd).toBe('2026-08-06')
    expect(migrated.eta).toBe('2026-08-12')
    expect(Object.prototype.hasOwnProperty.call(migrated, 'etdEta')).toBe(false)

    const prefersSplit = normalizeArrivalNoticePayload({
      ...emptyArrivalNotice(),
      etd: '2026-09-01',
      eta: '2026-09-10',
      etdEta: 'ignored / legacy',
    })
    expect(prefersSplit.etd).toBe('2026-09-01')
    expect(prefersSplit.eta).toBe('2026-09-10')
  })

  it('keeps AN billOfLadingType on normalize', () => {
    const migrated = normalizeArrivalNoticePayload({
      ...emptyArrivalNotice(),
      billOfLadingType: 'Surrendered',
    })
    expect(migrated.billOfLadingType).toBe('Surrendered')
  })

  it('hydrates AN descriptionOfGoods from legacy container note when empty', () => {
    const payload = emptyArrivalNotice()
    payload.descriptionOfGoods = ''
    payload.containers = [
      {
        ...payload.containers[0]!,
        note: 'LEGACY COMMODITY',
      },
    ]
    const parsed = parseTransportDocument('an', payload)
    expect(parsed.descriptionOfGoods).toBe('LEGACY COMMODITY')
  })

  it('derives AN volume from typed containers on parse', () => {
    const parsed = parseTransportDocument('an', {
      ...emptyArrivalNotice(),
      volume: 'stale free text',
      containers: [
        {
          type: "20'DC",
          containerNo: 'A',
          sealNo: '',
          grossWeight: '',
          measurement: '',
          tare: '',
          packageType: '',
          noOfPkgs: '',
          note: '',
          method: '',
        },
        {
          type: "40'HC",
          containerNo: 'B',
          sealNo: '',
          grossWeight: '',
          measurement: '',
          tare: '',
          packageType: '',
          noOfPkgs: '',
          note: '',
          method: '',
        },
      ],
    })

    expect(parsed.volume).toBe("1 x 20'DC\n1 x 40'HC")
  })

  it('keeps legacy AN volume text when containers have no types', () => {
    const parsed = parseTransportDocument('an', {
      ...emptyArrivalNotice(),
      volume: '10 PKGS',
      containers: [
        {
          type: '',
          containerNo: 'A',
          sealNo: '',
          grossWeight: '',
          measurement: '',
          tare: '',
          packageType: '',
          noOfPkgs: '10',
          note: '',
          method: '',
        },
      ],
    })

    expect(parsed.volume).toBe('10 PKGS')
  })

  it('defaults the AN same-as flag for records saved before Party linking', () => {
    const legacy = emptyArrivalNotice() as ArrivalNoticePayload & {
      notifyPartySameAsConsignee?: boolean
    }
    delete legacy.notifyPartySameAsConsignee

    expect(
      parseTransportDocument('an', legacy).notifyPartySameAsConsignee
    ).toBe(false)
  })

  it('re-derives AN same-as when the flag is missing but Notify mirrors Consignee', () => {
    const legacy = emptyArrivalNotice() as ArrivalNoticePayload & {
      notifyPartySameAsConsignee?: boolean
    }
    delete legacy.notifyPartySameAsConsignee
    legacy.consignee = 'ACME CO\n1 Road'
    legacy.notifyParty = 'ACME CO\n1 Road'
    legacy.consigneePartyId = 9
    legacy.notifyPartyId = 9

    expect(
      parseTransportDocument('an', legacy).notifyPartySameAsConsignee
    ).toBe(true)
  })

  it('keeps an explicit false AN same-as flag even when parties still match', () => {
    const payload = emptyArrivalNotice()
    payload.notifyPartySameAsConsignee = false
    payload.consignee = 'ACME'
    payload.notifyParty = 'ACME'
    payload.consigneePartyId = 3
    payload.notifyPartyId = 3

    expect(
      parseTransportDocument('an', payload).notifyPartySameAsConsignee
    ).toBe(false)
  })

  it('normalizes Booking cargoVolumes and derives the multiline volume string', () => {
    const booking = emptyBookingConfirmation()
    booking.cargoVolumes = { "20'DC": 3, "40'RF": 1 }
    booking.volume = ''

    const parsed = parseTransportDocument('booking', booking)
    expect(parsed.cargoVolumes).toEqual({ "20'DC": 3, "40'RF": 1 })
    expect(parsed.volume).toBe("3 x 20'DC\n1 x 40'RF")
  })

  it('hydrates Booking cargoVolumes from a legacy volume string', () => {
    const booking = emptyBookingConfirmation()
    booking.volume = "2 x 40'HC"

    const parsed = parseTransportDocument('booking', booking)
    expect(parsed.cargoVolumes).toEqual({ "40'HC": 2 })
    expect(parsed.volume).toBe("2 x 40'HC")
  })

  it('keeps Booking commodity and PIC ids with their display snapshots', () => {
    const booking = emptyBookingConfirmation()
    booking.commodity = 'RICE IN FOODSTUFFS'
    booking.commodityId = 12
    booking.pic = 'Operations, Email: ops@example.com'
    booking.picUserId = 34

    expect(parseTransportDocument('booking', booking)).toMatchObject({
      commodity: 'RICE IN FOODSTUFFS',
      commodityId: 12,
      pic: 'Operations, Email: ops@example.com',
      picUserId: 34,
    })
  })

  it('rejects more than 20 BL container rows before the preview request', () => {
    const payload = emptyBillOfLading()
    payload.containers = Array.from({ length: 21 }, () => ({
      type: '',
      containerNo: '',
      sealNo: '',
      grossWeight: '',
      measurement: '',
      tare: '',
      packageType: '',
      noOfPkgs: '',
      note: '',
      method: '',
    }))

    expect(() => parseTransportDocument('bl', payload)).toThrow(
      'A maximum of 20 container rows is allowed'
    )
  })

  it('migrates legacy BL free-text cargo into containers and re-derives PDF fields', () => {
    const normalized = normalizeBillOfLadingPayload({
      fblNumber: 'BL-1',
      descriptionOfGoods: "20'DC\nSTONE",
      grossWeight: '100\n200',
      measurement: '2\n4',
      numberAndKindOfPackages: '10 PKGS',
    })

    expect(normalized.containers).toHaveLength(1)
    expect(normalized.containers[0]).toMatchObject({
      note: "20'DC\nSTONE",
      grossWeight: '100\n200',
      measurement: '2\n4',
      noOfPkgs: '10',
      packageType: 'PKGS',
    })
    expect(normalized.descriptionOfGoods).toBe("20'DC\nSTONE")
    expect(normalized.grossWeight).toBe('100\n200 KGS')
    expect(normalized.measurement).toBe('2\n4 CBM')
  })

  it('migrates legacy BL marksAndNumbers into shippingMark', () => {
    const normalized = normalizeBillOfLadingPayload({
      fblNumber: 'BL-1',
      marksAndNumbers: 'LEGACY MARK',
    })
    expect(normalized.shippingMark).toBe('LEGACY MARK')
    expect(
      Object.prototype.hasOwnProperty.call(normalized, 'marksAndNumbers')
    ).toBe(false)
  })

  it('prefers explicit shippingMark over legacy marksAndNumbers', () => {
    const normalized = normalizeBillOfLadingPayload({
      fblNumber: 'BL-1',
      shippingMark: '',
      marksAndNumbers: 'LEGACY MARK',
    })
    expect(normalized.shippingMark).toBe('')
  })

  it('rejects more than 20 DO container rows before the preview request', () => {
    const payload = emptyDeliveryOrder()
    payload.containers = Array.from({ length: 21 }, () => ({
      type: '',
      containerNo: '',
      sealNo: '',
      grossWeight: '',
      measurement: '',
      tare: '',
      packageType: '',
      noOfPkgs: '',
      note: '',
      method: '',
    }))

    expect(() => parseTransportDocument('do', payload)).toThrow(
      'A maximum of 20 container rows is allowed'
    )
  })

  it('migrates legacy DO cargoRows into containers and re-derives PDF rows', () => {
    const normalized = normalizeDeliveryOrderPayload({
      ...emptyDeliveryOrder(),
      containers: undefined,
      cargoRows: [
        {
          containerSealNumber: 'CONT / SEAL',
          quantity: '10',
          descriptionOfGoods: 'STONE',
          grossWeight: '100',
          measurement: '2',
        },
      ],
    })

    expect(normalized.containers).toEqual([
      {
        type: '',
        containerNo: 'CONT',
        sealNo: 'SEAL',
        grossWeight: '100',
        measurement: '2',
        tare: '',
        packageType: '',
        noOfPkgs: '10',
        note: 'STONE',
        method: '',
      },
    ])
    expect(normalized.cargoRows).toEqual([
      {
        containerSealNumber: 'CONT / SEAL',
        quantity: '10',
        descriptionOfGoods: '',
        grossWeight: '100 KGS',
        measurement: '2 CBM',
      },
    ])
  })

  it('keeps every AN, Booking, DO and BL field in the backend contract', () => {
    expect(Object.keys(emptyArrivalNotice()).sort()).toEqual(
      [
        'agent',
        'agentPartyId',
        'anNumber',
        'billOfLadingType',
        'cfsTerminal',
        'consignee',
        'consigneePartyId',
        'containers',
        'commodityId',
        'customerAttention',
        'date',
        'descriptionOfGoods',
        'eta',
        'etd',
        'finalDestination',
        'hblNumber',
        'marks',
        'mblNumber',
        'note',
        'notifyParty',
        'notifyPartyId',
        'notifyPartySameAsConsignee',
        'placeOfDelivery',
        'placeOfReceipt',
        'portOfDischarge',
        'portOfLoading',
        'referenceNumber',
        'serviceMode',
        'shipmentNumber',
        'shipper',
        'shipperPartyId',
        'vesselVoyage',
        'volume',
      ].sort()
    )
    expect(Object.keys(emptyBookingConfirmation()).sort()).toEqual(
      [
        'bookingNumber',
        'cargoVolumes',
        'clientPartyId',
        'closingTime',
        'commodity',
        'commodityId',
        'contact',
        'date',
        'dropoffPlace',
        'eta',
        'etd',
        'grossWeight',
        'measurement',
        'motherVessel',
        'motherVoyage',
        'pic',
        'picUserId',
        'pickupDate',
        'pickupPlace',
        'placeOfDelivery',
        'placeOfReceipt',
        'portOfDischarge',
        'portOfLoading',
        'siCutoff',
        'specialRemark',
        'to',
        'transitPort',
        'vgmCutoff',
        'vesselVoyage',
        'volume',
      ].sort()
    )
    expect(Object.keys(emptyDeliveryOrder()).sort()).toEqual(
      [
        'cargoRows',
        'cfsTerminal',
        'containers',
        'customerAttention',
        'date',
        'deliverTo',
        'consigneePartyId',
        'descriptionOfGoods',
        'doNumber',
        'eta',
        'etd',
        'finalDestination',
        'hblNumber',
        'marks',
        'mblNumber',
        'note',
        'notifyParty',
        'notifyPartyId',
        'placeOfDelivery',
        'placeOfReceipt',
        'portOfDischarge',
        'portOfLoading',
        'serviceMode',
        'shipmentNumber',
        'to',
        'vesselVoyage',
        'volume',
      ].sort()
    )
    expect(Object.keys(emptyBillOfLading()).sort()).toEqual(
      [
        'blFormVariant',
        'cargoInsurance',
        'cleanOnBoardDate',
        'consignedToOrderOf',
        'consigneePartyId',
        'consignor',
        'containers',
        'dateOfIssue',
        'declarationOfInterest',
        'declaredValue',
        'deliveryApplyTo',
        'descriptionOfGoods',
        'fblNumber',
        'freightAmount',
        'freightPayableAt',
        'freightTerms',
        'grossWeight',
        'shippingMark',
        'measurement',
        'notifyAddress',
        'notifyPartyId',
        'numberAndKindOfPackages',
        'numberOfOriginals',
        'oceanVessel',
        'placeOfDelivery',
        'placeOfIssue',
        'placeOfReceipt',
        'portOfDischarge',
        'portOfLoading',
        'serviceMode',
        'shipperPartyId',
        'voyageNumber',
      ].sort()
    )
  })
})
