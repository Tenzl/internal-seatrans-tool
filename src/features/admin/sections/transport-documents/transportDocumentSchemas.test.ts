import { describe, expect, it } from 'vitest'
import {
  cargoRowSchema,
  emptyArrivalNotice,
  emptyBookingConfirmation,
  emptyDeliveryOrder,
  parseTransportDocument,
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

  it('rejects more than 20 cargo rows before the preview request', () => {
    const payload = emptyArrivalNotice()
    payload.cargoRows = Array.from({ length: 21 }, () => ({
      containerSealNumber: '',
      quantity: '',
      descriptionOfGoods: '',
      grossWeight: '',
      measurement: '',
    }))

    expect(() => parseTransportDocument('an', payload)).toThrow(
      'A maximum of 20 cargo rows is allowed'
    )
  })

  it('keeps every AN, Booking and DO field in the backend contract', () => {
    expect(Object.keys(emptyArrivalNotice()).sort()).toEqual(
      [
        'agent',
        'anNumber',
        'billOfLadingType',
        'cargoRows',
        'cfsTerminal',
        'consignee',
        'customerAttention',
        'date',
        'etdEta',
        'finalDestination',
        'hblNumber',
        'marks',
        'mblNumber',
        'note',
        'notifyParty',
        'placeOfDelivery',
        'placeOfReceipt',
        'portOfDischarge',
        'portOfLoading',
        'referenceNumber',
        'serviceMode',
        'shipmentNumber',
        'shipper',
        'vesselVoyage',
        'volume',
      ].sort()
    )
    expect(Object.keys(emptyBookingConfirmation()).sort()).toEqual(
      [
        'bookingNumber',
        'closingTime',
        'commodity',
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
        'customerAttention',
        'date',
        'deliverTo',
        'doNumber',
        'eta',
        'etd',
        'finalDestination',
        'hblNumber',
        'marks',
        'mblNumber',
        'note',
        'notifyParty',
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
  })
})
