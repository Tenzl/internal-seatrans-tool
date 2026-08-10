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

/** Arrival Notice actual-container row (payload JSON). */
export interface AnContainer {
  type: string
  containerNo: string
  sealNo: string
  grossWeight: string
  measurement: string
  tare: string
  packageType: string
  noOfPkgs: string
  note: string
  method: string
}

export interface ArrivalNoticePayload {
  agent: string
  agentPartyId?: number | null
  date: string
  anNumber: string
  shipper: string
  shipperPartyId?: number | null
  consignee: string
  consigneePartyId?: number | null
  notifyParty: string
  notifyPartyId?: number | null
  notifyPartySameAsConsignee?: boolean
  mblNumber: string
  hblNumber: string
  vesselVoyage: string
  etd: string
  eta: string
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
  commodityId?: number | null
  /**
   * Shipment-level goods description (PDF cargo “Description of Goods”).
   * Separate from per-container `containers[].note`.
   */
  descriptionOfGoods: string
  volume: string
  customerAttention: string
  /** Canonical multi-container rows (0..N). */
  containers: AnContainer[]
}

export interface DeliveryOrderPayload {
  doNumber: string
  date: string
  to: string
  deliverTo: string
  consigneePartyId?: number | null
  notifyParty: string
  notifyPartyId?: number | null
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
  /**
   * AN service mode (e.g. `FCL/FCL - CY/CY`). Synced from Arrival Notice;
   * not edited on DO.
   */
  serviceMode: string
  cfsTerminal: string
  note: string
  marks: string
  /**
   * Shipment-level goods description mirrored from Arrival Notice (aligned
   * with Bill of Lading). Synced from AN; not edited on DO. Also feeds the
   * first cargo row's description cell (see `anContainersToCargoRows`).
   */
  descriptionOfGoods: string
  volume: string
  customerAttention: string
  /** Canonical multi-container rows (shared with Arrival Notice / BL). */
  containers: AnContainer[]
  /** Legacy row shape; derived from `containers` for PDF rendering. */
  cargoRows: CargoRow[]
}

/** Sparse map of container type → qty (> 0 only). See cargoVolumeModel. */
export type BookingCargoVolumes = Partial<
  Record<
    | "45'RF"
    | "20'DC"
    | "40'DC"
    | "20'RF"
    | "40'RF"
    | "20'FR"
    | "40'FR"
    | "40'HC"
    | "45'HC"
    | "40'HQ",
    number
  >
>

export interface BookingConfirmationPayload {
  date: string
  bookingNumber: string
  to: string
  clientPartyId?: number | null
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
  commodityId?: number | null
  /** Derived multiline display / PDF / prefill string (e.g. `3 x 20'DC`). */
  volume: string
  /** Structured cargo volumes; only types with qty > 0 are stored. */
  cargoVolumes: BookingCargoVolumes
  grossWeight: string
  measurement: string
  transitPort: string
  specialRemark: string
  motherVessel: string
  motherVoyage: string
  pic: string
  picUserId?: number | null
}

export interface BillOfLadingPayload {
  fblNumber: string
  consignor: string
  shipperPartyId?: number | null
  consignedToOrderOf: string
  consigneePartyId?: number | null
  notifyAddress: string
  notifyPartyId?: number | null
  placeOfReceipt: string
  oceanVessel: string
  voyageNumber: string
  portOfLoading: string
  portOfDischarge: string
  placeOfDelivery: string
  /**
   * AN service mode (e.g. `FCL/FCL - CY/CY`) — PDF marks column first line.
   * Synced from Arrival Notice; not edited on BL.
   */
  serviceMode: string
  /**
   * Editable shipping mark printed in the BL marks column beside
   * descriptionOfGoods. BL-owned (not continuously synced from AN).
   * Empty prints blank — never auto-injected as "N/M".
   */
  shippingMark: string
  numberAndKindOfPackages: string
  /**
   * PDF overlay free-text description. Persisted shipment-level field
   * (aligned with Arrival Notice); GW / measurement still derive from
   * `containers` when structured rows are present.
   */
  descriptionOfGoods: string
  grossWeight: string
  measurement: string
  /** Canonical multi-container rows (shared with Arrival Notice). */
  containers: AnContainer[]
  freightTerms: string
  /** Date only; PDF always prefixes with fixed "CLEAN ON BOARD". */
  cleanOnBoardDate: string
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
  version: number
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
