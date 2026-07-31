import { z } from 'zod'
import type {
  ArrivalNoticePayload,
  BookingConfirmationPayload,
  DeliveryOrderPayload,
  TransportDocumentPayloadMap,
  TransportDocumentType,
} from './transportDocument.types'

const shortText = z.string().trim().max(500, 'Use 500 characters or fewer')
const longText = z.string().trim().max(2_000, 'Use 2,000 characters or fewer')

export const cargoRowSchema = z.object({
  containerSealNumber: shortText,
  quantity: shortText,
  descriptionOfGoods: longText,
  grossWeight: shortText,
  measurement: shortText,
})

export const arrivalNoticeSchema = z.object({
  agent: shortText,
  date: shortText,
  anNumber: shortText,
  shipper: longText,
  consignee: longText,
  notifyParty: longText,
  mblNumber: shortText,
  hblNumber: shortText,
  vesselVoyage: shortText,
  etdEta: shortText,
  cfsTerminal: shortText,
  shipmentNumber: shortText,
  referenceNumber: shortText,
  billOfLadingType: shortText,
  placeOfReceipt: shortText,
  portOfLoading: shortText,
  portOfDischarge: shortText,
  placeOfDelivery: shortText,
  finalDestination: shortText,
  serviceMode: shortText,
  note: longText,
  marks: longText,
  volume: shortText,
  customerAttention: longText,
  cargoRows: z
    .array(cargoRowSchema)
    .max(20, 'A maximum of 20 cargo rows is allowed'),
})

export const deliveryOrderSchema = z.object({
  doNumber: shortText,
  date: shortText,
  to: longText,
  deliverTo: longText,
  notifyParty: longText,
  mblNumber: shortText,
  hblNumber: shortText,
  etd: shortText,
  eta: shortText,
  shipmentNumber: shortText,
  vesselVoyage: shortText,
  placeOfReceipt: shortText,
  portOfLoading: shortText,
  portOfDischarge: shortText,
  placeOfDelivery: shortText,
  finalDestination: shortText,
  serviceMode: shortText,
  cfsTerminal: shortText,
  note: longText,
  marks: longText,
  volume: shortText,
  customerAttention: longText,
  cargoRows: z
    .array(cargoRowSchema)
    .max(20, 'A maximum of 20 cargo rows is allowed'),
})

export const bookingConfirmationSchema = z.object({
  date: shortText,
  bookingNumber: shortText,
  to: longText,
  vesselVoyage: shortText,
  etd: shortText,
  eta: shortText,
  placeOfReceipt: shortText,
  portOfLoading: shortText,
  pickupDate: shortText,
  pickupPlace: shortText,
  portOfDischarge: shortText,
  placeOfDelivery: shortText,
  dropoffPlace: shortText,
  closingTime: shortText,
  siCutoff: shortText,
  vgmCutoff: shortText,
  contact: shortText,
  commodity: longText,
  volume: shortText,
  grossWeight: shortText,
  measurement: shortText,
  transitPort: shortText,
  specialRemark: longText,
  motherVessel: shortText,
  motherVoyage: shortText,
  pic: longText,
})

export const emptyCargoRow = () => ({
  containerSealNumber: '',
  quantity: '',
  descriptionOfGoods: '',
  grossWeight: '',
  measurement: '',
})

export const emptyArrivalNotice = (): ArrivalNoticePayload => ({
  agent: '',
  date: '',
  anNumber: '',
  shipper: '',
  consignee: '',
  notifyParty: '',
  mblNumber: '',
  hblNumber: '',
  vesselVoyage: '',
  etdEta: '',
  cfsTerminal: '',
  shipmentNumber: '',
  referenceNumber: '',
  billOfLadingType: '',
  placeOfReceipt: '',
  portOfLoading: '',
  portOfDischarge: '',
  placeOfDelivery: '',
  finalDestination: '',
  serviceMode: '',
  note: '',
  marks: '',
  volume: '',
  customerAttention: '',
  cargoRows: [emptyCargoRow()],
})

export const emptyDeliveryOrder = (): DeliveryOrderPayload => ({
  doNumber: '',
  date: '',
  to: '',
  deliverTo: '',
  notifyParty: '',
  mblNumber: '',
  hblNumber: '',
  etd: '',
  eta: '',
  shipmentNumber: '',
  vesselVoyage: '',
  placeOfReceipt: '',
  portOfLoading: '',
  portOfDischarge: '',
  placeOfDelivery: '',
  finalDestination: '',
  serviceMode: '',
  cfsTerminal: '',
  note: '',
  marks: '',
  volume: '',
  customerAttention: '',
  cargoRows: [emptyCargoRow()],
})

export const emptyBookingConfirmation = (): BookingConfirmationPayload => ({
  date: '',
  bookingNumber: '',
  to: '',
  vesselVoyage: '',
  etd: '',
  eta: '',
  placeOfReceipt: '',
  portOfLoading: '',
  pickupDate: '',
  pickupPlace: '',
  portOfDischarge: '',
  placeOfDelivery: '',
  dropoffPlace: '',
  closingTime: '',
  siCutoff: '',
  vgmCutoff: '',
  contact: '',
  commodity: '',
  volume: '',
  grossWeight: '',
  measurement: '',
  transitPort: '',
  specialRemark: '',
  motherVessel: '',
  motherVoyage: '',
  pic: '',
})

export const createEmptyTransportDocuments =
  (): TransportDocumentPayloadMap => ({
    an: emptyArrivalNotice(),
    booking: emptyBookingConfirmation(),
    do: emptyDeliveryOrder(),
  })

export function parseTransportDocument<T extends TransportDocumentType>(
  type: T,
  payload: TransportDocumentPayloadMap[T]
): TransportDocumentPayloadMap[T] {
  switch (type) {
    case 'an':
      return arrivalNoticeSchema.parse(
        payload
      ) as TransportDocumentPayloadMap[T]
    case 'booking':
      return bookingConfirmationSchema.parse(
        payload
      ) as TransportDocumentPayloadMap[T]
    case 'do':
      return deliveryOrderSchema.parse(
        payload
      ) as TransportDocumentPayloadMap[T]
  }
}
