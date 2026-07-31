import { describe, expect, it } from 'vitest'
import {
  CARGO_ROW_COLUMNS,
  TRANSPORT_DOCUMENT_FORM_SECTIONS,
} from './transportDocumentFormConfig'
import {
  buildTransportDocumentFileName,
  getTransportDocumentCargoRows,
} from './transportDocumentFormRules'
import { createEmptyTransportDocuments } from './transportDocumentSchemas'

const fieldOrder = (type: 'an' | 'booking' | 'do') =>
  TRANSPORT_DOCUMENT_FORM_SECTIONS[type].flatMap((section) =>
    section.fields.map((field) => field.key)
  )

describe('transport document form config', () => {
  it('keeps the official field order for every document', () => {
    expect(fieldOrder('an')).toEqual([
      'agent',
      'date',
      'anNumber',
      'shipper',
      'consignee',
      'notifyParty',
      'mblNumber',
      'hblNumber',
      'shipmentNumber',
      'vesselVoyage',
      'etdEta',
      'cfsTerminal',
      'referenceNumber',
      'billOfLadingType',
      'serviceMode',
      'placeOfReceipt',
      'portOfLoading',
      'portOfDischarge',
      'placeOfDelivery',
      'finalDestination',
      'marks',
      'volume',
      'note',
      'customerAttention',
    ])
    expect(fieldOrder('booking')).toEqual([
      'date',
      'bookingNumber',
      'to',
      'vesselVoyage',
      'etd',
      'eta',
      'placeOfReceipt',
      'portOfLoading',
      'portOfDischarge',
      'placeOfDelivery',
      'transitPort',
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
      'motherVessel',
      'motherVoyage',
      'specialRemark',
      'contact',
      'pic',
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
      'vesselVoyage',
      'etd',
      'eta',
      'serviceMode',
      'cfsTerminal',
      'placeOfReceipt',
      'portOfLoading',
      'portOfDischarge',
      'placeOfDelivery',
      'finalDestination',
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
    expect(buildTransportDocumentFileName('booking', forms, 'Booking')).toBe(
      'Booking-BK_100.pdf'
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
