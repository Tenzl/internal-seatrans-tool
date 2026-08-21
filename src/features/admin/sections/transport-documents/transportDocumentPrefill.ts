import {
  anContainersToBlCargoTextFields,
  anContainersToCargoRows,
  anContainersToVolumeText,
  emptyAnContainer,
  normalizeAnContainers,
  seedAnContainersFromVolumes,
} from './anContainerModel'
import { normalizeBookingCargoVolumes } from './cargoVolumeModel'
import type {
  AnContainer,
  ArrivalNoticePayload,
  BillOfLadingPayload,
  BookingConfirmationPayload,
  DeliveryOrderPayload,
  TransportDocumentPayloadMap,
  TransportDocumentRecord,
  TransportDocumentType,
} from './transportDocument.types'
import { formatBookingCommodityDescription } from './transportDocumentSchemas'

/** Previous document type used to prefill the target form. */
export const PREFILL_SOURCE_TYPE: Partial<
  Record<TransportDocumentType, TransportDocumentType>
> = {
  an: 'booking',
  bl: 'booking',
  do: 'an',
}

export function getPrefillSourceType(
  target: TransportDocumentType
): TransportDocumentType | null {
  return PREFILL_SOURCE_TYPE[target] ?? null
}

export function isWorkflowPrefillEnabled({
  bookingId,
  targetRecordId,
  sourceType,
}: {
  bookingId: number | null
  targetRecordId: number | null
  sourceType: TransportDocumentType | null
}): boolean {
  return bookingId != null && targetRecordId == null && sourceType != null
}

export function buildWorkflowPrefillKey(
  bookingId: number,
  targetType: TransportDocumentType,
  source: Pick<TransportDocumentRecord, 'id' | 'version' | 'updatedAt'>
): string {
  return [
    bookingId,
    targetType,
    source.id,
    source.version,
    source.updatedAt,
  ].join(':')
}

/**
 * Booking gross weight is shipment-level and is not a container weight.
 * Container gross weight therefore stays blank until the operator enters the
 * actual value for that container. Measurement keeps the existing first-row
 * prefill because it is still represented by the cargo table today.
 * Commodity maps to shipment `descriptionOfGoods` (not container note).
 * Never invent containerNo / sealNo.
 */
function applyBookingMeasurementToFirstRow(
  rows: AnContainer[],
  source: BookingConfirmationPayload
): AnContainer[] {
  let base = rows
  if (base.length === 0) {
    const { cargoVolumes } = normalizeBookingCargoVolumes(source)
    base = seedAnContainersFromVolumes(cargoVolumes)
  }
  if (base.length === 0) return []
  return base.map((row, index) =>
    index === 0
      ? {
          ...row,
          measurement: source.measurement,
        }
      : row
  )
}

/** Route, schedule, and refs from Booking — no container table yet. */
export function prefillArrivalNoticeHeaderFromBooking(
  source: BookingConfirmationPayload,
  current: ArrivalNoticePayload
): ArrivalNoticePayload {
  return {
    ...current,
    date: source.date,
    shipmentNumber: source.bookingNumber,
    referenceNumber: source.bookingNumber,
    vesselVoyage: source.vesselVoyage,
    etd: source.etd,
    eta: source.eta,
    placeOfReceipt: source.placeOfReceipt,
    placeOfReceiptPortId: source.placeOfReceiptPortId ?? null,
    portOfLoading: source.portOfLoading,
    portOfLoadingPortId: source.portOfLoadingPortId ?? null,
    portOfDischarge: source.portOfDischarge,
    portOfDischargePortId: source.portOfDischargePortId ?? null,
    placeOfDelivery: source.placeOfDelivery,
    placeOfDeliveryPortId: source.placeOfDeliveryPortId ?? null,
    finalDestination: source.placeOfDelivery,
    finalDestinationPortId: source.placeOfDeliveryPortId ?? null,
  }
}

/**
 * Keep Booking-owned AN cargo synchronized while the AN is still uncreated.
 * Booking GW is never copied into a container. Measurement stays on row 1;
 * every row receives the selected Booking Type as its package type. The screen
 * stops calling this mapper once AN creation returns a persisted ID.
 */
export function mapArrivalNoticeCargoFromBooking(
  source: BookingConfirmationPayload,
  current: ArrivalNoticePayload
): ArrivalNoticePayload {
  const { cargoVolumes } = normalizeBookingCargoVolumes(source)
  const packageType = source.commodityType.trim()
  const seeded = seedAnContainersFromVolumes(cargoVolumes).map((row) => ({
    ...row,
    packageType,
  }))
  const containers = applyBookingMeasurementToFirstRow(seeded, source)
  const bookingDescription =
    source.commodity.trim() ||
    formatBookingCommodityDescription(
      source.commodityName,
      source.commodityType
    )

  return {
    ...current,
    commodityTypeId: source.commodityTypeId ?? null,
    commodityType: source.commodityType,
    commodityId: source.commodityId ?? null,
    commodityName: source.commodityName,
    descriptionOfGoods: bookingDescription,
    volume: anContainersToVolumeText(containers),
    containers,
  }
}

export function prefillArrivalNoticeFromBooking(
  source: BookingConfirmationPayload,
  current: ArrivalNoticePayload
): ArrivalNoticePayload {
  return mapArrivalNoticeCargoFromBooking(
    source,
    prefillArrivalNoticeHeaderFromBooking(source, current)
  )
}

/**
 * Keep Booking-owned BL fields synchronized while the BL is still a new form:
 * route, schedule, cargo containers, and derived packages / GW / measurement.
 * Parties, FBL no., service mode, and shipping mark stay BL-owned. The screen
 * stops calling this mapper as soon as BL creation returns a persisted ID.
 */
export function prefillBillOfLadingFromBooking(
  source: BookingConfirmationPayload,
  current: BillOfLadingPayload
): BillOfLadingPayload {
  const { cargoVolumes } = normalizeBookingCargoVolumes(source)
  const packageType = source.commodityType.trim()
  const seeded = seedAnContainersFromVolumes(cargoVolumes).map((row) => ({
    ...row,
    packageType,
  }))
  const containers =
    seeded.length > 0 ? applyBookingMeasurementToFirstRow(seeded, source) : []
  const descriptionOfGoods =
    source.commodity.trim() ||
    formatBookingCommodityDescription(
      source.commodityName,
      source.commodityType
    )
  const cargoText = anContainersToBlCargoTextFields(
    containers,
    descriptionOfGoods
  )
  const volumeText = anContainersToVolumeText(containers)

  return {
    ...current,
    dateOfIssue: source.etd,
    cleanOnBoardDate: source.etd,
    // Full vessel/voyage string — BL PDF uses one combined oceanVessel cell.
    oceanVessel: source.vesselVoyage.trim(),
    placeOfReceipt: source.placeOfReceipt,
    placeOfReceiptPortId: source.placeOfReceiptPortId ?? null,
    portOfLoading: source.portOfLoading,
    portOfLoadingPortId: source.portOfLoadingPortId ?? null,
    portOfDischarge: source.portOfDischarge,
    portOfDischargePortId: source.portOfDischargePortId ?? null,
    placeOfDelivery: source.placeOfDelivery,
    placeOfDeliveryPortId: source.placeOfDeliveryPortId ?? null,
    placeOfIssue: source.placeOfIssue,
    placeOfIssuePortId: source.placeOfIssuePortId ?? null,
    freightPayableAt: source.placeOfDelivery,
    numberAndKindOfPackages: volumeText,
    containers,
    descriptionOfGoods: cargoText.descriptionOfGoods,
    grossWeight: cargoText.grossWeight,
    measurement: cargoText.measurement,
  }
}

/**
 * DO cargo/containers are owned by Arrival Notice. Overwrite
 * `containers` + derived `cargoRows` (PDF table), plus `serviceMode` and
 * `descriptionOfGoods` (read-only mirrors of AN, not editable on DO); leave
 * all other DO fields. The screen calls this only while DO is uncreated and
 * stops as soon as Create returns a persisted ID.
 */
export function syncDeliveryOrderCargoFromArrivalNotice(
  source: ArrivalNoticePayload,
  current: DeliveryOrderPayload
): DeliveryOrderPayload {
  const containers = normalizeAnContainers({
    containers: source.containers,
  }).map((row) => ({ ...row }))
  const seeded =
    containers.length > 0 ? containers : [{ ...emptyAnContainer() }]
  return {
    ...current,
    serviceMode: source.serviceMode,
    descriptionOfGoods: source.descriptionOfGoods,
    containers: seeded,
    cargoRows: anContainersToCargoRows(seeded, source.descriptionOfGoods),
  }
}

export function prefillDeliveryOrderFromAn(
  source: ArrivalNoticePayload,
  current: DeliveryOrderPayload
): DeliveryOrderPayload {
  const containers = normalizeAnContainers({ containers: source.containers })
  const volumeText =
    anContainersToVolumeText(containers) || source.volume.trim()

  return {
    ...syncDeliveryOrderCargoFromArrivalNotice(source, current),
    date: source.date,
    deliverTo: source.consignee,
    consigneePartyId: source.consigneePartyId ?? null,
    notifyParty: source.notifyParty,
    notifyPartyId: source.notifyPartyId ?? null,
    mblNumber: source.mblNumber,
    hblNumber: source.hblNumber,
    shipmentNumber: source.shipmentNumber,
    vesselVoyage: source.vesselVoyage,
    etd: source.etd,
    eta: source.eta,
    placeOfReceipt: source.placeOfReceipt,
    placeOfReceiptPortId: source.placeOfReceiptPortId ?? null,
    portOfLoading: source.portOfLoading,
    portOfLoadingPortId: source.portOfLoadingPortId ?? null,
    portOfDischarge: source.portOfDischarge,
    portOfDischargePortId: source.portOfDischargePortId ?? null,
    placeOfDelivery: source.placeOfDelivery,
    placeOfDeliveryPortId: source.placeOfDeliveryPortId ?? null,
    finalDestination: source.finalDestination,
    finalDestinationPortId: source.finalDestinationPortId ?? null,
    cfsTerminal: source.cfsTerminal,
    marks: source.marks,
    volume: volumeText,
    note: source.note,
    customerAttention: source.customerAttention,
  }
}

export function applyPrefillFromPrevious<T extends TransportDocumentType>(
  targetType: T,
  sourceType: TransportDocumentType,
  sourcePayload: TransportDocumentPayloadMap[TransportDocumentType],
  currentPayload: TransportDocumentPayloadMap[T]
): TransportDocumentPayloadMap[T] {
  if (targetType === 'an' && sourceType === 'booking') {
    return prefillArrivalNoticeFromBooking(
      sourcePayload as BookingConfirmationPayload,
      currentPayload as ArrivalNoticePayload
    ) as TransportDocumentPayloadMap[T]
  }
  if (targetType === 'bl' && sourceType === 'booking') {
    return prefillBillOfLadingFromBooking(
      sourcePayload as BookingConfirmationPayload,
      currentPayload as BillOfLadingPayload
    ) as TransportDocumentPayloadMap[T]
  }
  if (targetType === 'do' && sourceType === 'an') {
    return prefillDeliveryOrderFromAn(
      sourcePayload as ArrivalNoticePayload,
      currentPayload as DeliveryOrderPayload
    ) as TransportDocumentPayloadMap[T]
  }
  return currentPayload
}
