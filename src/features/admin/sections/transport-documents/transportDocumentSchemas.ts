import { z } from 'zod'
import type {
  ArrivalNoticePayload,
  BillOfLadingPayload,
  BookingConfirmationPayload,
  DeliveryOrderPayload,
  TransportDocumentPayloadMap,
  TransportDocumentType,
} from './transportDocument.types'

const shortText = z.string().trim().max(500, 'Use 500 characters or fewer')
const longText = z.string().trim().max(2_000, 'Use 2,000 characters or fewer')
const xlText = z.string().trim().max(4_000, 'Use 4,000 characters or fewer')
const partyId = z.number().int().positive().nullable().optional()

export const cargoRowSchema = z.object({
  containerSealNumber: shortText,
  quantity: shortText,
  descriptionOfGoods: longText,
  grossWeight: shortText,
  measurement: shortText,
})

export const arrivalNoticeSchema = z.object({
  agent: shortText,
  agentPartyId: partyId,
  date: shortText,
  anNumber: shortText,
  shipper: longText,
  shipperPartyId: partyId,
  consignee: longText,
  consigneePartyId: partyId,
  notifyParty: longText,
  notifyPartyId: partyId,
  notifyPartySameAsConsignee: z.boolean().default(false),
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
  consigneePartyId: partyId,
  notifyParty: longText,
  notifyPartyId: partyId,
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
  clientPartyId: partyId,
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
  agentPartyId: null,
  date: '',
  anNumber: '',
  shipper: '',
  shipperPartyId: null,
  consignee: '',
  consigneePartyId: null,
  notifyParty: '',
  notifyPartyId: null,
  notifyPartySameAsConsignee: false,
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
  consigneePartyId: null,
  notifyParty: '',
  notifyPartyId: null,
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
  clientPartyId: null,
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

export const billOfLadingSchema = z.object({
  fblNumber: shortText,
  consignor: longText,
  shipperPartyId: partyId,
  consignedToOrderOf: longText,
  consigneePartyId: partyId,
  notifyAddress: longText,
  notifyPartyId: partyId,
  placeOfReceipt: shortText,
  oceanVessel: shortText,
  voyageNumber: shortText,
  portOfLoading: shortText,
  portOfDischarge: shortText,
  placeOfDelivery: shortText,
  marksAndNumbers: longText,
  numberAndKindOfPackages: longText,
  descriptionOfGoods: xlText,
  grossWeight: shortText,
  measurement: shortText,
  freightTerms: shortText,
  cleanOnBoard: shortText,
  declarationOfInterest: shortText,
  declaredValue: shortText,
  freightAmount: shortText,
  freightPayableAt: shortText,
  placeOfIssue: shortText,
  dateOfIssue: shortText,
  numberOfOriginals: shortText,
  cargoInsurance: z.enum(['', 'not_covered', 'covered']),
  deliveryApplyTo: longText,
  blFormVariant: z.enum(['non_negotiable', 'original', 'surrendered']),
})

export const emptyBillOfLading = (): BillOfLadingPayload => ({
  fblNumber: '',
  consignor: '',
  shipperPartyId: null,
  consignedToOrderOf: '',
  consigneePartyId: null,
  notifyAddress: '',
  notifyPartyId: null,
  placeOfReceipt: '',
  oceanVessel: '',
  voyageNumber: '',
  portOfLoading: '',
  portOfDischarge: '',
  placeOfDelivery: '',
  marksAndNumbers: '',
  numberAndKindOfPackages: '',
  descriptionOfGoods: '',
  grossWeight: '',
  measurement: '',
  freightTerms: '',
  cleanOnBoard: '',
  declarationOfInterest: '',
  declaredValue: '',
  freightAmount: '',
  freightPayableAt: '',
  placeOfIssue: '',
  dateOfIssue: '',
  numberOfOriginals: '',
  cargoInsurance: '',
  deliveryApplyTo: '',
  blFormVariant: 'non_negotiable',
})

/** Normalize BL payloads and drop legacy stamp toggle keys. */
export function normalizeBillOfLadingPayload(
  payload: unknown
): BillOfLadingPayload {
  const raw =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : {}
  const {
    showSurrendered: legacySurrendered,
    includeCompanyStamp: _ignoredStamp,
    ...rest
  } = raw
  void _ignoredStamp
  const blFormVariant =
    rest.blFormVariant === 'original' ||
    rest.blFormVariant === 'surrendered' ||
    rest.blFormVariant === 'non_negotiable'
      ? rest.blFormVariant
      : legacySurrendered === 'yes'
        ? 'surrendered'
        : 'non_negotiable'
  return billOfLadingSchema.parse({
    ...emptyBillOfLading(),
    ...rest,
    blFormVariant,
  })
}

/** Strip legacy stamp keys before persisting a BL payload. */
export function stripLegacyBillOfLadingKeys<T extends Record<string, unknown>>(
  payload: T
): Omit<T, 'showSurrendered' | 'includeCompanyStamp'> {
  const {
    showSurrendered: _a,
    includeCompanyStamp: _b,
    ...rest
  } = payload as T & {
    showSurrendered?: unknown
    includeCompanyStamp?: unknown
  }
  void _a
  void _b
  return rest
}

export const createEmptyTransportDocuments =
  (): TransportDocumentPayloadMap => ({
    an: emptyArrivalNotice(),
    booking: emptyBookingConfirmation(),
    do: emptyDeliveryOrder(),
    bl: emptyBillOfLading(),
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
      return bookingConfirmationSchema.parse({
        ...emptyBookingConfirmation(),
        ...payload,
      }) as TransportDocumentPayloadMap[T]
    case 'do':
      return deliveryOrderSchema.parse(
        payload
      ) as TransportDocumentPayloadMap[T]
    case 'bl':
      return normalizeBillOfLadingPayload(
        payload
      ) as TransportDocumentPayloadMap[T]
  }
}
