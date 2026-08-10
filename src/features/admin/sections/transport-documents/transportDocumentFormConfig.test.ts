import { describe, expect, it } from 'vitest'
import {
  AN_CONTAINER_COLUMNS,
  CARGO_ROW_COLUMNS,
  resolveSelectFieldOptions,
  SERVICE_MODE_OPTIONS,
  TRANSPORT_DOCUMENT_FORM_SECTIONS,
  TRANSPORT_DOCUMENTS,
} from './transportDocumentFormConfig'
import {
  buildTransportDocumentFileName,
  getTransportDocumentContainers,
} from './transportDocumentFormRules'
import { createEmptyTransportDocuments } from './transportDocumentSchemas'

const fieldOrder = (type: 'an' | 'booking' | 'do' | 'bl') =>
  TRANSPORT_DOCUMENT_FORM_SECTIONS[type].flatMap((section) =>
    section.fields.map((field) => field.key)
  )

const fieldKind = (type: 'an' | 'booking' | 'do' | 'bl', key: string) =>
  TRANSPORT_DOCUMENT_FORM_SECTIONS[type]
    .flatMap((section) => section.fields)
    .find((field) => field.key === key)?.kind

const fieldSpec = (type: 'an' | 'booking' | 'do' | 'bl', key: string) =>
  TRANSPORT_DOCUMENT_FORM_SECTIONS[type]
    .flatMap((section) => section.fields)
    .find((field) => field.key === key)

describe('transport document form config', () => {
  it('lists Booking and Arrival Notice before the two final document types', () => {
    expect(TRANSPORT_DOCUMENTS.map((document) => document.type)).toEqual([
      'booking',
      'an',
      'bl',
      'do',
    ])
    expect(TRANSPORT_DOCUMENTS[0]?.label).toBe('Booking')
    expect(TRANSPORT_DOCUMENTS[0]?.shortLabel).toBe('Booking')
    expect(TRANSPORT_DOCUMENTS[1]?.shortLabel).toBe('Arrival Notice')
    expect(TRANSPORT_DOCUMENTS[2]?.shortLabel).toBe('Bill of Lading')
    expect(TRANSPORT_DOCUMENTS[3]?.shortLabel).toBe('Delivery Order')
  })

  it('keeps the official field order for every document', () => {
    expect(fieldOrder('booking')).toEqual([
      'bookingNumber',
      'date',
      'to',
      'placeOfReceipt',
      'portOfLoading',
      'portOfDischarge',
      'placeOfDelivery',
      'transitPort',
      'vesselVoyage',
      'etd',
      'eta',
      'motherVessel',
      'motherVoyage',
      'pickupDate',
      'pickupPlace',
      'dropoffPlace',
      'closingTime',
      'siCutoff',
      'vgmCutoff',
      'commodity',
      'grossWeight',
      'measurement',
      'specialRemark',
      'pic',
      'contact',
    ])
    expect(fieldOrder('bl')).toEqual([
      'fblNumber',
      'placeOfIssue',
      'dateOfIssue',
      'numberOfOriginals',
      'consignor',
      'consignedToOrderOf',
      'notifyAddress',
      'placeOfReceipt',
      'portOfLoading',
      'portOfDischarge',
      'placeOfDelivery',
      'oceanVessel',
      'voyageNumber',
      'serviceMode',
      'shippingMark',
      'descriptionOfGoods',
      'freightTerms',
      'cleanOnBoardDate',
      'freightAmount',
      'freightPayableAt',
      'cargoInsurance',
      'declarationOfInterest',
      'declaredValue',
      'deliveryApplyTo',
    ])
    expect(fieldOrder('an')).toEqual([
      'anNumber',
      'date',
      'shipper',
      'consignee',
      'notifyParty',
      'agent',
      'mblNumber',
      'hblNumber',
      'shipmentNumber',
      'referenceNumber',
      'billOfLadingType',
      'placeOfReceipt',
      'portOfLoading',
      'portOfDischarge',
      'placeOfDelivery',
      'finalDestination',
      'vesselVoyage',
      'etd',
      'eta',
      'serviceMode',
      'cfsTerminal',
      'descriptionOfGoods',
      'marks',
      'note',
      'customerAttention',
    ])
    expect(fieldOrder('do')).toEqual([
      'doNumber',
      'date',
      'to',
      'deliverTo',
      'notifyParty',
      'mblNumber',
      'hblNumber',
      'shipmentNumber',
      'placeOfReceipt',
      'portOfLoading',
      'portOfDischarge',
      'placeOfDelivery',
      'finalDestination',
      'vesselVoyage',
      'etd',
      'eta',
      'serviceMode',
      'cfsTerminal',
      'descriptionOfGoods',
      'marks',
      'customerAttention',
      'note',
    ])
  })

  it('uses the Booking date picker for AN and DO ETD/ETA fields', () => {
    expect(fieldKind('booking', 'etd')).toBe('date')
    expect(fieldKind('booking', 'eta')).toBe('date')
    expect(fieldKind('an', 'etd')).toBe('date')
    expect(fieldKind('an', 'eta')).toBe('date')
    expect(fieldKind('do', 'etd')).toBe('date')
    expect(fieldKind('do', 'eta')).toBe('date')
    expect(fieldOrder('an')).not.toContain('etdEta')
  })

  it('omits free-text Volume from AN and DO Cargo (derived from containers)', () => {
    expect(fieldOrder('an')).not.toContain('volume')
    expect(fieldOrder('do')).not.toContain('volume')
  })

  it('pairs AN descriptionOfGoods with marks, and DO marks with customerAttention', () => {
    expect(fieldSpec('an', 'descriptionOfGoods')?.span).toBeUndefined()
    expect(fieldSpec('an', 'marks')?.span).toBeUndefined()
    expect(fieldSpec('an', 'note')?.span).toBe(2)
    expect(fieldSpec('an', 'customerAttention')?.span).toBe(2)

    expect(fieldSpec('do', 'descriptionOfGoods')?.span).toBe(2)
    expect(fieldSpec('do', 'marks')?.span).toBeUndefined()
    expect(fieldSpec('do', 'customerAttention')?.span).toBeUndefined()
    expect(fieldSpec('do', 'note')?.span).toBe(2)
    expect(
      TRANSPORT_DOCUMENT_FORM_SECTIONS.do
        .find((section) => section.title === 'Cargo')
        ?.fields.map((field) => field.key)
    ).toEqual(['descriptionOfGoods', 'marks', 'customerAttention', 'note'])
  })

  it('exposes editable Shipping mark on BL Cargo; packages stay omitted', () => {
    expect(fieldOrder('bl')).toContain('shippingMark')
    expect(fieldOrder('bl')).not.toContain('marksAndNumbers')
    expect(fieldOrder('bl')).not.toContain('numberAndKindOfPackages')
    const cargoFields =
      TRANSPORT_DOCUMENT_FORM_SECTIONS.bl.find(
        (section) => section.title === 'Cargo'
      )?.fields ?? []
    expect(cargoFields.map((field) => field.key)).toEqual([
      'serviceMode',
      'shippingMark',
      'descriptionOfGoods',
    ])
    expect(fieldSpec('bl', 'shippingMark')?.label).toBe('Shipping mark')
    expect(fieldSpec('bl', 'shippingMark')?.kind).toBeUndefined()
    expect(fieldSpec('bl', 'shippingMark')?.syncedFromAn).toBeUndefined()
  })

  it('keeps Booking Volume as CargoVolumeEditor (no free-text volume field)', () => {
    expect(
      TRANSPORT_DOCUMENT_FORM_SECTIONS.booking.map((section) => section.title)
    ).toContain('Cargo')
    expect(
      TRANSPORT_DOCUMENT_FORM_SECTIONS.booking.map((section) => section.title)
    ).not.toContain('Cargo volume')
    expect(fieldOrder('booking')).not.toContain('volume')
    const cargoFields =
      TRANSPORT_DOCUMENT_FORM_SECTIONS.booking.find(
        (section) => section.title === 'Cargo'
      )?.fields ?? []
    expect(cargoFields.map((field) => field.key)).toEqual([
      'commodity',
      'grossWeight',
      'measurement',
      'specialRemark',
    ])
  })

  it('persists the selected PIC user id alongside the display text', () => {
    expect(fieldSpec('booking', 'pic')).toMatchObject({
      kind: 'internal-user',
      internalUserIdKey: 'picUserId',
    })
  })

  it('keeps cargo columns in backend and PDF order', () => {
    expect(CARGO_ROW_COLUMNS.map((column) => column.key)).toEqual([
      'containerSealNumber',
      'quantity',
      'descriptionOfGoods',
      'grossWeight',
      'measurement',
    ])
  })

  it('keeps AN container columns in the slim Actual Container order', () => {
    expect(AN_CONTAINER_COLUMNS.map((column) => column.key)).toEqual([
      'type',
      'containerNo',
      'sealNo',
      'grossWeight',
      'measurement',
      'tare',
      'noOfPkgs',
      'packageType',
      'note',
      'method',
    ])
    expect(
      AN_CONTAINER_COLUMNS.find((column) => column.key === 'grossWeight')?.label
    ).toBe('Gross Weight (KGS)')
    expect(
      AN_CONTAINER_COLUMNS.find((column) => column.key === 'measurement')?.label
    ).toBe('Measurement (CBM)')
    expect(
      AN_CONTAINER_COLUMNS.find((column) => column.key === 'noOfPkgs')?.label
    ).toBe('No of Pkgs')
    expect(
      AN_CONTAINER_COLUMNS.find((column) => column.key === 'packageType')?.label
    ).toBe('Package type')
  })

  it('uses paginated port search for every port and place field', () => {
    const portFields = {
      booking: [
        'placeOfReceipt',
        'portOfLoading',
        'portOfDischarge',
        'placeOfDelivery',
        'transitPort',
        'pickupPlace',
        'dropoffPlace',
      ],
      bl: [
        'placeOfIssue',
        'placeOfReceipt',
        'portOfLoading',
        'portOfDischarge',
        'placeOfDelivery',
      ],
      an: [
        'placeOfReceipt',
        'portOfLoading',
        'portOfDischarge',
        'placeOfDelivery',
        'finalDestination',
      ],
      do: [
        'placeOfReceipt',
        'portOfLoading',
        'portOfDischarge',
        'placeOfDelivery',
        'finalDestination',
      ],
    } as const

    Object.entries(portFields).forEach(([type, keys]) => {
      keys.forEach((key) => {
        expect(fieldKind(type as keyof typeof portFields, key)).toBe(
          'port-name'
        )
      })
    })
  })

  it('connects each document Party field to its matching Party role', () => {
    expect(fieldSpec('booking', 'to')).toMatchObject({
      label: 'Client',
      kind: 'party',
      partyIdKey: 'clientPartyId',
      additionType: 'CUSTOMER',
      partyValueMode: 'name',
    })
    expect(fieldSpec('an', 'agent')).toMatchObject({
      kind: 'party',
      partyIdKey: 'agentPartyId',
      customerType: 'AGENT',
    })
    expect(fieldSpec('an', 'agent')?.partyValueMode).toBeUndefined()
    expect(fieldSpec('an', 'shipper')).toMatchObject({
      kind: 'party',
      partyIdKey: 'shipperPartyId',
      additionType: 'SHIPPER',
    })
    expect(fieldSpec('an', 'consignee')).toMatchObject({
      kind: 'party',
      partyIdKey: 'consigneePartyId',
      additionType: 'CONSIGNEE',
    })
    expect(fieldSpec('an', 'notifyParty')).toMatchObject({
      kind: 'party',
      partyIdKey: 'notifyPartyId',
      additionType: 'NOTIFY_PARTY',
    })
    expect(fieldSpec('bl', 'consignor')).toMatchObject({
      kind: 'party',
      partyIdKey: 'shipperPartyId',
      additionType: 'SHIPPER',
    })
    expect(fieldSpec('bl', 'consignedToOrderOf')).toMatchObject({
      kind: 'party',
      partyIdKey: 'consigneePartyId',
      additionType: 'CONSIGNEE',
    })
    expect(fieldSpec('bl', 'notifyAddress')).toMatchObject({
      kind: 'party',
      partyIdKey: 'notifyPartyId',
      additionType: 'NOTIFY_PARTY',
    })
    expect(fieldSpec('do', 'notifyParty')).toMatchObject({
      kind: 'party',
      partyIdKey: 'notifyPartyId',
      additionType: 'NOTIFY_PARTY',
    })
    expect(fieldSpec('do', 'deliverTo')).toMatchObject({
      kind: 'party',
      partyIdKey: 'consigneePartyId',
      additionType: 'CONSIGNEE',
    })
  })

  it('builds safe PDF names from each document reference', () => {
    const forms = createEmptyTransportDocuments()
    forms.an.anNumber = ' AN 25/01 '
    forms.booking.bookingNumber = 'BK_100'

    expect(buildTransportDocumentFileName('an', forms, 'Arrival Notice')).toBe(
      'Arrival-Notice-AN-25-01.pdf'
    )
    expect(buildTransportDocumentFileName('booking', forms, 'Booking')).toBe(
      'Booking-BK_100.pdf'
    )
    expect(buildTransportDocumentFileName('do', forms, 'Delivery Order')).toBe(
      'Delivery-Order.pdf'
    )
  })

  it('renders Service Mode as a select with the six canonical options on AN, DO, and BL', () => {
    expect(fieldSpec('an', 'serviceMode')).toMatchObject({
      kind: 'select',
      options: SERVICE_MODE_OPTIONS,
    })
    expect(fieldSpec('do', 'serviceMode')).toMatchObject({
      kind: 'select',
      options: SERVICE_MODE_OPTIONS,
    })
    expect(fieldSpec('bl', 'serviceMode')).toMatchObject({
      kind: 'select',
      options: SERVICE_MODE_OPTIONS,
    })
    expect(SERVICE_MODE_OPTIONS.map((option) => option.value)).toEqual([
      'LCL/LCL - CFS/DOOR',
      'FCL/FCL - CY/DOOR',
      'FCL/FCL - CY/CY',
      'FCL/LCL - CY/CFS',
      'LCL/FCL - CFS/CY',
      'LCL/LCL - CFS/CFS',
    ])
  })

  it('marks Service Mode and Description of goods read-only (synced from AN) on DO only', () => {
    expect(fieldSpec('an', 'serviceMode')?.syncedFromAn).toBeUndefined()
    expect(fieldSpec('do', 'serviceMode')?.syncedFromAn).toBe(true)
    expect(fieldSpec('bl', 'serviceMode')?.syncedFromAn).toBeUndefined()
    expect(fieldSpec('an', 'descriptionOfGoods')?.syncedFromAn).toBeUndefined()
    expect(fieldSpec('do', 'descriptionOfGoods')?.syncedFromAn).toBe(true)
    expect(fieldSpec('bl', 'descriptionOfGoods')?.syncedFromAn).toBeUndefined()
  })

  it('exposes containers for AN, BL and DO', () => {
    const forms = createEmptyTransportDocuments()

    expect(getTransportDocumentContainers('an', forms)).toBe(
      forms.an.containers
    )
    expect(getTransportDocumentContainers('bl', forms)).toBe(
      forms.bl.containers
    )
    expect(getTransportDocumentContainers('do', forms)).toBe(
      forms.do.containers
    )
  })

  describe('resolveSelectFieldOptions', () => {
    it('returns the original options when the value is empty or already listed', () => {
      expect(resolveSelectFieldOptions(SERVICE_MODE_OPTIONS, '')).toBe(
        SERVICE_MODE_OPTIONS
      )
      expect(
        resolveSelectFieldOptions(SERVICE_MODE_OPTIONS, 'FCL/FCL - CY/CY')
      ).toBe(SERVICE_MODE_OPTIONS)
    })

    it('prepends an unrecognized legacy value as a selectable option', () => {
      expect(
        resolveSelectFieldOptions(SERVICE_MODE_OPTIONS, 'LEGACY MODE')
      ).toEqual([
        { value: 'LEGACY MODE', label: 'LEGACY MODE' },
        ...SERVICE_MODE_OPTIONS,
      ])
    })
  })
})
