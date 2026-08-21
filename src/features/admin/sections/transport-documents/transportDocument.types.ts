import type { PageResponse } from '@/shared/types/api.types'

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
  placeOfReceiptPortId?: number | null
  portOfLoading: string
  portOfLoadingPortId?: number | null
  portOfDischarge: string
  portOfDischargePortId?: number | null
  placeOfDelivery: string
  placeOfDeliveryPortId?: number | null
  finalDestination: string
  finalDestinationPortId?: number | null
  serviceMode: string
  note: string
  marks: string
  /** Booking Type identity and stable snapshot copied when AN is created. */
  commodityTypeId?: number | null
  commodityType?: string
  /** Booking Commodity identity and stable snapshot copied when AN is created. */
  commodityId?: number | null
  commodityName?: string
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
  placeOfReceiptPortId?: number | null
  portOfLoading: string
  portOfLoadingPortId?: number | null
  portOfDischarge: string
  portOfDischargePortId?: number | null
  placeOfDelivery: string
  placeOfDeliveryPortId?: number | null
  finalDestination: string
  finalDestinationPortId?: number | null
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
  placeOfReceiptPortId?: number | null
  portOfLoading: string
  portOfLoadingPortId?: number | null
  /** Independent B/L issuing place; not derived from the cargo route. */
  placeOfIssue: string
  placeOfIssuePortId?: number | null
  pickupDate: string
  pickupPlace: string
  pickupPlacePortId?: number | null
  portOfDischarge: string
  portOfDischargePortId?: number | null
  placeOfDelivery: string
  placeOfDeliveryPortId?: number | null
  dropoffPlace: string
  dropoffPlacePortId?: number | null
  closingTime: string
  siCutoff: string
  vgmCutoff: string
  contact: string
  /** Independent Freight Forwarding Type identity and stable display snapshot. */
  commodityTypeId?: number | null
  commodityType: string
  /** Independent Freight Forwarding Commodity identity and stable name snapshot. */
  commodityId?: number | null
  commodityName: string
  /** Stable rendered description; generated selections update, custom legacy text does not. */
  commodity: string
  /** Derived multiline display / PDF / prefill string (e.g. `3 x 20'DC`). */
  volume: string
  /** Structured cargo volumes; only types with qty > 0 are stored. */
  cargoVolumes: BookingCargoVolumes
  grossWeight: string
  measurement: string
  transitPort: string
  transitPortId?: number | null
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
  /** Same as Consignee — copies Consigned to order of into Notify address. */
  notifyPartySameAsConsignee?: boolean
  placeOfReceipt: string
  placeOfReceiptPortId?: number | null
  /** Vessel + voyage in one field (e.g. `SITC MINHE / 2615N`). */
  oceanVessel: string
  portOfLoading: string
  portOfLoadingPortId?: number | null
  portOfDischarge: string
  portOfDischargePortId?: number | null
  placeOfDelivery: string
  placeOfDeliveryPortId?: number | null
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
  placeOfIssuePortId?: number | null
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

export interface TransportDocumentV2CargoVolume {
  containerTypeCode: string
  quantity: number
  rowOrder?: number
}

export interface TransportDocumentV2Envelope {
  document: Record<string, unknown>
  presentation: Record<string, unknown>
  cargoVolumes: TransportDocumentV2CargoVolume[]
  containers: AnContainer[]
  expectedVersion?: number
  bookingFlow?: BookingFlow
  bookingId?: number
}

export interface TransportDocumentV2Record extends Omit<
  TransportDocumentRecord,
  | 'referenceNumber'
  | 'payload'
  | 'updatedByUserId'
  | 'deletedAt'
  | 'deletedByUserId'
> {
  document: Record<string, unknown>
  presentation: Record<string, unknown>
  cargoVolumes: TransportDocumentV2CargoVolume[]
  containers: AnContainer[]
}

export interface BookingReportRow {
  booking_id: number
  booking_flow: BookingFlow
  booking_number: string | null
  booking_date: string
  booking_status: TransportDocumentStatus
  workflow_status: TransportDocumentStatus
  client_party_id: number | null
  client_name: string | null
  port_of_loading_id: number | null
  port_of_loading_name: string | null
  port_of_discharge_id: number | null
  port_of_discharge_name: string | null
  commodity_type_id: number | null
  commodity_type_name: string | null
  commodity_id: number | null
  commodity_name: string | null
  vessel_voyage: string | null
  planned_container_count: string
  planned_container_types: Record<string, number>
  planned_gross_weight_kg: string | null
  planned_measurement_cbm: string | null
  actual_container_count: string
  actual_gross_weight_kg: string
  actual_measurement_cbm: string
  has_bl: boolean
  has_an: boolean
  has_do: boolean
  bl_id: number | null
  bl_status: TransportDocumentStatus | null
  bl_date: string | null
  an_id: number | null
  an_status: TransportDocumentStatus | null
  an_date: string | null
  do_id: number | null
  do_status: TransportDocumentStatus | null
  do_date: string | null
}

export interface BookingReportSummary {
  total_bookings: number
  planned_containers: string
  planned_gross_weight_kg: string
  planned_measurement_cbm: string
  actual_containers: string
  actual_gross_weight_kg: string
  actual_measurement_cbm: string
}

export interface BookingReportResponse extends PageResponse<BookingReportRow> {
  summary: BookingReportSummary
}

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
  /** Aggregate status for the entire Booking workflow; present on Booking rows. */
  workflowStatus?: TransportDocumentStatus
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
  status: TransportDocumentStatus
  documents: Partial<Record<TransportDocumentType, TransportDocumentRecord>>
}

export interface BookingCopySource {
  sourceBookingId: number
  bookingFlow: BookingFlow
  payload: BookingConfirmationPayload
}

export interface BillOfLadingNumberDuplicate {
  id: number
  bookingId: number | null
  bookingNumber: string | null
  number: string
  createdAt: string
}

export interface BillOfLadingNumberCheck {
  number: string
  duplicate: boolean
  matches: BillOfLadingNumberDuplicate[]
}

export interface DocumentNumberDuplicateMatch {
  id: number
  documentType: TransportDocumentType
  bookingId: number | null
  bookingNumber: string | null
  number: string
  createdAt: string
}

export interface DocumentNumberCheck {
  documentType: TransportDocumentType
  number: string
  duplicate: boolean
  matches: DocumentNumberDuplicateMatch[]
}

export type TransportDocumentActionPermissions = {
  canLock: boolean
  canUnlock: boolean
  canHardDelete: boolean
}
