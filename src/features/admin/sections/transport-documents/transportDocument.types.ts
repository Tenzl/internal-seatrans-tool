export const TRANSPORT_DOCUMENT_TYPES = ['an', 'booking', 'do', 'bl'] as const

export type TransportDocumentType = (typeof TRANSPORT_DOCUMENT_TYPES)[number]

export const BOOKING_FLOWS = ['IMPORT', 'EXPORT'] as const

export type BookingFlow = (typeof BOOKING_FLOWS)[number]

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

export interface BillOfLadingPayload {
  fblNumber: string
  consignor: string
  consignedToOrderOf: string
  notifyAddress: string
  placeOfReceipt: string
  oceanVessel: string
  voyageNumber: string
  portOfLoading: string
  portOfDischarge: string
  placeOfDelivery: string
  marksAndNumbers: string
  numberAndKindOfPackages: string
  descriptionOfGoods: string
  grossWeight: string
  measurement: string
  freightTerms: string
  cleanOnBoard: string
  declarationOfInterest: string
  declaredValue: string
  freightAmount: string
  freightPayableAt: string
  placeOfIssue: string
  dateOfIssue: string
  numberOfOriginals: string
  cargoInsurance: '' | 'not_covered' | 'covered'
  deliveryApplyTo: string
  /** Blank template: non-negotiable / original / surrendered PNG */
  blFormVariant: 'non_negotiable' | 'original' | 'surrendered'
}

export interface TransportDocumentPayloadMap {
  an: ArrivalNoticePayload
  booking: BookingConfirmationPayload
  do: DeliveryOrderPayload
  bl: BillOfLadingPayload
}

export type TransportDocumentPayload =
  TransportDocumentPayloadMap[TransportDocumentType]

export interface TransportDocumentRecord {
  id: number
  documentType: TransportDocumentType
  /** Optional during rolling deployment for records created before workflows. */
  bookingFlow?: BookingFlow | null
  bookingId?: number | null
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

export interface BookingWorkflow {
  id: number
  flow: BookingFlow
  documents: Partial<Record<TransportDocumentType, TransportDocumentRecord>>
}

export type TransportDocumentDeleteMode = 'soft' | 'hard'

export type TransportDocumentActionPermissions = {
  canLock: boolean
  canUnlock: boolean
  canArchive: boolean
  canHardDelete: boolean
}
