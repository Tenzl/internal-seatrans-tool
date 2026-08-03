import { describe, expect, it } from 'vitest'
import {
  CARGO_ROW_COLUMNS,
  TRANSPORT_DOCUMENT_FORM_SECTIONS,
  TRANSPORT_DOCUMENTS,
} from './transportDocumentFormConfig'
import {
  buildTransportDocumentFileName,
  getTransportDocumentCargoRows,
} from './transportDocumentFormRules'
import { createEmptyTransportDocuments } from './transportDocumentSchemas'

const fieldOrder = (type: 'an' | 'booking' | 'do' | 'bl') =>
  TRANSPORT_DOCUMENT_FORM_SECTIONS[type].flatMap((section) =>
    section.fields.map((field) => field.key)
  )

describe('transport document form config', () => {
  it('lists documents in lifecycle order with Order label', () => {
    expect(TRANSPORT_DOCUMENTS.map((document) => document.type)).toEqual([
      'booking',
      'bl',
      'an',
      'do',
    ])
    expect(TRANSPORT_DOCUMENTS[0]?.label).toBe('Order')
    expect(TRANSPORT_DOCUMENTS[0]?.shortLabel).toBe('Order')
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
      'volume',
      'grossWeight',
      'measurement',
      'specialRemark',
      'contact',
      'pic',
    ])
    expect(fieldOrder('bl')).toEqual([
      'fblNumber',
      'blFormVariant',
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
      'marksAndNumbers',
      'numberAndKindOfPackages',
      'descriptionOfGoods',
      'grossWeight',
      'measurement',
      'freightTerms',
      'cleanOnBoard',
      'freightAmount',
      'freightPayableAt',
      'declarationOfInterest',
      'declaredValue',
      'cargoInsurance',
      'deliveryApplyTo',
    ])
    expect(fieldOrder('an')).toEqual([
      'anNumber',
      'date',
      'agent',
      'shipper',
      'consignee',
      'notifyParty',
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
      'etdEta',
      'serviceMode',
      'cfsTerminal',
      'marks',
      'volume',
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
      'marks',
      'volume',
      'note',
      'customerAttention',
    ])
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

  it('builds safe PDF names from each document reference', () => {
    const forms = createEmptyTransportDocuments()
    forms.an.anNumber = ' AN 25/01 '
    forms.booking.bookingNumber = 'BK_100'

    expect(buildTransportDocumentFileName('an', forms, 'AN')).toBe(
      'AN-AN-25-01.pdf'
    )
    expect(buildTransportDocumentFileName('booking', forms, 'Order')).toBe(
      'Order-BK_100.pdf'
    )
    expect(buildTransportDocumentFileName('do', forms, 'DO')).toBe('DO.pdf')
  })

  it('only exposes cargo rows for AN and DO forms', () => {
    const forms = createEmptyTransportDocuments()

    expect(getTransportDocumentCargoRows('an', forms)).toBe(forms.an.cargoRows)
    expect(getTransportDocumentCargoRows('do', forms)).toBe(forms.do.cargoRows)
    expect(getTransportDocumentCargoRows('booking', forms)).toBeNull()
  })
})
