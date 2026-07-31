export const TRANSPORT_DOCUMENT_TYPES = ['an', 'booking', 'do'] as const

export type TransportDocumentType = (typeof TRANSPORT_DOCUMENT_TYPES)[number]

export const TRANSPORT_DOCUMENT_STATUSES = ['PROCESSING', 'COMPLETED'] as const

export type TransportDocumentStatus =
  (typeof TRANSPORT_DOCUMENT_STATUSES)[number]

export interface CargoRow {
  containerSealNumber: string
  quantity: string
  descriptionOfGoods: string
  grossWeight: string
  measurement: string
}

export interface ArrivalNoticePayload {
  agent: string
  date: string
  anNumber: string
  shipper: string
  consignee: string
  notifyParty: string
  mblNumber: string
  hblNumber: string
  vesselVoyage: string
  etdEta: string
  cfsTerminal: string
  shipmentNumber: string
  referenceNumber: string
  billOfLadingType: string
  placeOfReceipt: string
  portOfLoading: string
  portOfDischarge: string
  placeOfDelivery: string
  finalDestination: string
  serviceMode: string
  note: string
  marks: string
  volume: string
  customerAttention: string
  cargoRows: CargoRow[]
}

export interface DeliveryOrderPayload {
  doNumber: string
  date: string
  to: string
  deliverTo: string
  notifyParty: string
  mblNumber: string
  hblNumber: string
  etd: string
  eta: string
  shipmentNumber: string
  vesselVoyage: string
  placeOfReceipt: string
  portOfLoading: string
  portOfDischarge: string
  placeOfDelivery: string
  finalDestination: string
  serviceMode: string
  cfsTerminal: string
  note: string
  marks: string
  volume: string
  customerAttention: string
  cargoRows: CargoRow[]
}

export interface BookingConfirmationPayload {
  date: string
  bookingNumber: string
  to: string
  vesselVoyage: string
  etd: string
  eta: string
  placeOfReceipt: string
  portOfLoading: string
  pickupDate: string
  pickupPlace: string
  portOfDischarge: string
  placeOfDelivery: string
  dropoffPlace: string
  closingTime: string
  siCutoff: string
  vgmCutoff: string
  contact: string
  commodity: string
  volume: string
  grossWeight: string
  measurement: string
  transitPort: string
  specialRemark: string
  motherVessel: string
  motherVoyage: string
  pic: string
}

export interface TransportDocumentPayloadMap {
  an: ArrivalNoticePayload
  booking: BookingConfirmationPayload
  do: DeliveryOrderPayload
}

export type TransportDocumentPayload =
  TransportDocumentPayloadMap[TransportDocumentType]

export interface TransportDocumentRecord {
  id: number
  documentType: TransportDocumentType
  referenceNumber: string | null
  payload: TransportDocumentPayload
  status: TransportDocumentStatus
  createdByUserId: number
  createdAt: string
  updatedAt: string
  updatedByUserId: number | null
  lockedAt: string | null
  deletedAt: string | null
  deletedByUserId: number | null
  createdBy: {
    id: number
    fullName: string | null
    email: string | null
  } | null
}

export type TransportDocumentDeleteMode = 'soft' | 'hard'

export type TransportDocumentActionPermissions = {
  canLock: boolean
  canArchive: boolean
  canHardDelete: boolean
}
