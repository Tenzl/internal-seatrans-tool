import { z } from 'zod'
import {
  AN_CONTAINER_MAX_ROWS,
  anContainersToBlCargoTextFields,
  anContainersToCargoRows,
  anContainersToVolumeText,
  emptyAnContainer,
  legacyBlCargoTextToContainers,
  normalizeAnContainers,
  resolveDescriptionOfGoods,
} from './anContainerModel'
import {
  compactCargoVolumes,
  normalizeBookingCargoVolumes,
} from './cargoVolumeModel'
import { deriveNotifySameAsConsignee } from './notifyPartySameAsConsignee'
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

const cargoVolumesSchema = z
  .record(z.string(), z.number().int().nonnegative())
  .default({})
  .transform((value) => compactCargoVolumes(value))

export const cargoRowSchema = z.object({
  containerSealNumber: shortText,
  quantity: shortText,
  descriptionOfGoods: longText,
  grossWeight: shortText,
  measurement: shortText,
})

export const anContainerSchema = z.object({
  type: z.string().trim().max(20),
  containerNo: shortText,
  sealNo: shortText,
  grossWeight: shortText,
  measurement: shortText,
  tare: shortText,
  packageType: shortText,
  noOfPkgs: shortText,
  note: longText,
  method: shortText,
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
  etd: shortText,
  eta: shortText,
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
  commodityId: partyId,
  descriptionOfGoods: xlText,
  volume: shortText,
  customerAttention: longText,
  containers: z
    .array(anContainerSchema)
    .max(
      AN_CONTAINER_MAX_ROWS,
      `A maximum of ${AN_CONTAINER_MAX_ROWS} container rows is allowed`
    ),
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
  descriptionOfGoods: xlText,
  volume: shortText,
  customerAttention: longText,
  /** Canonical multi-container rows (shared with Arrival Notice / BL). */
  containers: z
    .array(anContainerSchema)
    .max(
      AN_CONTAINER_MAX_ROWS,
      `A maximum of ${AN_CONTAINER_MAX_ROWS} container rows is allowed`
    ),
  /** Legacy row shape; derived from `containers` for PDF rendering. */
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
  commodityId: partyId,
  volume: shortText,
  cargoVolumes: cargoVolumesSchema,
  grossWeight: shortText,
  measurement: shortText,
  transitPort: shortText,
  specialRemark: longText,
  motherVessel: shortText,
  motherVoyage: shortText,
  pic: longText,
  picUserId: partyId,
})

export const emptyCargoRow = () => ({
  containerSealNumber: '',
  quantity: '',
  descriptionOfGoods: '',
  grossWeight: '',
  measurement: '',
})

export { emptyAnContainer }

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
  etd: '',
  eta: '',
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
  commodityId: null,
  descriptionOfGoods: '',
  volume: '',
  customerAttention: '',
  containers: [emptyAnContainer()],
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
  descriptionOfGoods: '',
  volume: '',
  customerAttention: '',
  containers: [emptyAnContainer()],
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
  commodityId: null,
  volume: '',
  cargoVolumes: {},
  grossWeight: '',
  measurement: '',
  transitPort: '',
  specialRemark: '',
  motherVessel: '',
  motherVoyage: '',
  pic: '',
  picUserId: null,
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
  serviceMode: shortText,
  shippingMark: longText,
  numberAndKindOfPackages: longText,
  descriptionOfGoods: xlText,
  grossWeight: shortText,
  measurement: shortText,
  containers: z
    .array(anContainerSchema)
    .max(
      AN_CONTAINER_MAX_ROWS,
      `A maximum of ${AN_CONTAINER_MAX_ROWS} container rows is allowed`
    ),
  freightTerms: shortText,
  cleanOnBoardDate: shortText,
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
  serviceMode: '',
  shippingMark: '',
  numberAndKindOfPackages: '',
  descriptionOfGoods: '',
  grossWeight: '',
  measurement: '',
  containers: [emptyAnContainer()],
  freightTerms: '',
  cleanOnBoardDate: '',
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

/**
 * Normalize BL payloads: migrate free-text cargo → containers when missing,
 * derive PDF GW / measurement from containers, keep shipment descriptionOfGoods
 * as free-text (legacy fill from container note when empty).
 */
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
    cargoRows: legacyCargoRows,
    marksAndNumbers: legacyMarksAndNumbers,
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

  let containers = normalizeAnContainers({
    containers: rest.containers,
    cargoRows: legacyCargoRows,
  })
  if (containers.length === 0) {
    containers = legacyBlCargoTextToContainers({
      descriptionOfGoods: rest.descriptionOfGoods,
      grossWeight: rest.grossWeight,
      measurement: rest.measurement,
      numberAndKindOfPackages: rest.numberAndKindOfPackages,
    })
  }
  if (containers.length === 0) {
    containers = [emptyAnContainer()]
  }

  const descriptionOfGoods = resolveDescriptionOfGoods({
    descriptionOfGoods: rest.descriptionOfGoods,
    containers,
  })
  const derived = anContainersToBlCargoTextFields(
    containers,
    descriptionOfGoods
  )
  const hasStructuredCargo = containers.some(
    (row) =>
      row.type ||
      row.containerNo ||
      row.sealNo ||
      row.grossWeight ||
      row.measurement ||
      row.tare ||
      row.packageType ||
      row.noOfPkgs ||
      row.note ||
      row.method
  )
  // Prefer shippingMark; migrate legacy marksAndNumbers when absent.
  const shippingMark =
    typeof rest.shippingMark === 'string'
      ? rest.shippingMark
      : typeof legacyMarksAndNumbers === 'string'
        ? legacyMarksAndNumbers
        : ''

  // Prefer cleanOnBoardDate; strip legacy "CLEAN ON BOARD …" free-text.
  const cleanOnBoardDate =
    typeof rest.cleanOnBoardDate === 'string' && rest.cleanOnBoardDate.trim()
      ? rest.cleanOnBoardDate
      : typeof rest.cleanOnBoard === 'string' && rest.cleanOnBoard.trim()
        ? rest.cleanOnBoard.replace(/^CLEAN\s+ON\s+BOARD\s*/i, '').trim()
        : ''

  return billOfLadingSchema.parse({
    ...emptyBillOfLading(),
    ...rest,
    blFormVariant,
    containers,
    descriptionOfGoods,
    shippingMark,
    cleanOnBoardDate,
    grossWeight: hasStructuredCargo
      ? derived.grossWeight
      : typeof rest.grossWeight === 'string'
        ? rest.grossWeight
        : '',
    measurement: hasStructuredCargo
      ? derived.measurement
      : typeof rest.measurement === 'string'
        ? rest.measurement
        : '',
  })
}

/**
 * Normalize DO payloads: migrate legacy `cargoRows` → `containers` when
 * missing, re-derive `cargoRows` (PDF table input) from containers and the
 * (AN-synced) shipment `descriptionOfGoods`.
 */
export function normalizeDeliveryOrderPayload(
  payload: unknown
): DeliveryOrderPayload {
  const raw =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : {}
  const { cargoRows: legacyCargoRows, ...rest } = raw
  let containers = normalizeAnContainers({
    containers: rest.containers,
    cargoRows: legacyCargoRows,
  })
  if (containers.length === 0) {
    containers = [emptyAnContainer()]
  }
  const descriptionOfGoods =
    typeof rest.descriptionOfGoods === 'string' ? rest.descriptionOfGoods : ''
  return deliveryOrderSchema.parse({
    ...emptyDeliveryOrder(),
    ...rest,
    containers,
    descriptionOfGoods,
    cargoRows: anContainersToCargoRows(containers, descriptionOfGoods),
  })
}

/** Normalize Booking payloads: hydrate cargoVolumes from legacy volume text. */
export function normalizeBookingConfirmationPayload(
  payload: unknown
): BookingConfirmationPayload {
  const raw =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : {}
  const merged = {
    ...emptyBookingConfirmation(),
    ...raw,
  }
  const normalized = normalizeBookingCargoVolumes({
    cargoVolumes:
      merged.cargoVolumes && typeof merged.cargoVolumes === 'object'
        ? (merged.cargoVolumes as Record<string, unknown>)
        : {},
    volume: typeof merged.volume === 'string' ? merged.volume : '',
  })
  return bookingConfirmationSchema.parse({
    ...merged,
    ...normalized,
  })
}

/**
 * Strip a leading ETD/ETA label from a single schedule date string.
 * Used when migrating legacy combined `etdEta` values into separate fields.
 */
export function stripScheduleDatePrefix(value: string): string {
  return value.replace(/^\s*(ETD|ETA)\b[:\s-]*/i, '').trim()
}

/**
 * Split legacy combined `etdEta` ("a / b") into separate ETD and ETA strings.
 * Prefers already-split `etd` / `eta` when either is present.
 */
export function resolveArrivalNoticeScheduleFields(raw: {
  etd?: unknown
  eta?: unknown
  etdEta?: unknown
}): { etd: string; eta: string } {
  const etd =
    typeof raw.etd === 'string' ? stripScheduleDatePrefix(raw.etd) : ''
  const eta =
    typeof raw.eta === 'string' ? stripScheduleDatePrefix(raw.eta) : ''
  if (etd || eta) {
    return { etd, eta }
  }
  if (typeof raw.etdEta !== 'string' || !raw.etdEta.trim()) {
    return { etd: '', eta: '' }
  }
  const parts = raw.etdEta
    .split('/')
    .map((part) => stripScheduleDatePrefix(part))
    .filter(Boolean)
  return {
    etd: parts[0] ?? '',
    eta: parts.slice(1).join(' / '),
  }
}

/**
 * Normalize AN payloads: migrate legacy cargoRows → containers,
 * hydrate shipment descriptionOfGoods (legacy from container note),
 * derive Volume from typed containers (keep legacy text when none),
 * split legacy combined `etdEta` into `etd` / `eta`,
 * drop cargoRows from the persisted shape.
 */
export function normalizeArrivalNoticePayload(
  payload: unknown
): ArrivalNoticePayload {
  const raw =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : {}
  const { cargoRows: legacyCargoRows, etdEta: legacyEtdEta, ...rest } = raw
  const containers = normalizeAnContainers({
    containers: rest.containers,
    cargoRows: legacyCargoRows,
  })
  const derivedVolume = anContainersToVolumeText(containers)
  const legacyVolume = typeof rest.volume === 'string' ? rest.volume : ''
  const descriptionOfGoods = resolveDescriptionOfGoods({
    descriptionOfGoods: rest.descriptionOfGoods,
    containers,
  })
  const schedule = resolveArrivalNoticeScheduleFields({
    etd: rest.etd,
    eta: rest.eta,
    etdEta: legacyEtdEta,
  })
  const withDefaults = {
    ...emptyArrivalNotice(),
    ...rest,
    ...schedule,
    containers,
    descriptionOfGoods,
    volume: derivedVolume || legacyVolume,
  }
  const parsed = arrivalNoticeSchema.parse(withDefaults)
  return {
    ...parsed,
    notifyPartySameAsConsignee: deriveNotifySameAsConsignee({
      // Prefer the raw flag when present so an explicit false survives parse
      // (schema default would otherwise turn a missing key into false first).
      notifyPartySameAsConsignee:
        typeof rest.notifyPartySameAsConsignee === 'boolean'
          ? rest.notifyPartySameAsConsignee
          : undefined,
      consignee: parsed.consignee,
      consigneePartyId: parsed.consigneePartyId,
      notifyParty: parsed.notifyParty,
      notifyPartyId: parsed.notifyPartyId,
    }),
  }
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
      return normalizeArrivalNoticePayload(
        payload
      ) as TransportDocumentPayloadMap[T]
    case 'booking':
      return normalizeBookingConfirmationPayload(
        payload
      ) as TransportDocumentPayloadMap[T]
    case 'do':
      return normalizeDeliveryOrderPayload(
        payload
      ) as TransportDocumentPayloadMap[T]
    case 'bl':
      return normalizeBillOfLadingPayload(
        payload
      ) as TransportDocumentPayloadMap[T]
  }
}
