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
  TransportDocumentType,
} from './transportDocument.types'

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

/**
 * Booking cargo totals are shipment-level (one GW KGS + one CBM), not per
 * container. Put them on the first AN row only — do not invent equal splits.
 * Commodity maps to shipment `descriptionOfGoods` (not container note).
 * Never invent containerNo / sealNo.
 */
function applyBookingCargoTotalsToFirstRow(
  rows: AnContainer[],
  source: BookingConfirmationPayload
): AnContainer[] {
  let base = rows
  if (base.length === 0) {
    const { cargoVolumes } = normalizeBookingCargoVolumes(source)
    base = seedAnContainersFromVolumes(cargoVolumes)
  }
  if (base.length === 0) {
    if (!source.grossWeight.trim() && !source.measurement.trim()) {
      return []
    }
    return [
      {
        ...emptyAnContainer(),
        grossWeight: source.grossWeight,
        measurement: source.measurement,
      },
    ]
  }
  return base.map((row, index) =>
    index === 0
      ? {
          ...row,
          grossWeight: source.grossWeight,
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
    portOfLoading: source.portOfLoading,
    portOfDischarge: source.portOfDischarge,
    placeOfDelivery: source.placeOfDelivery,
    finalDestination: source.placeOfDelivery,
  }
}

/**
 * Seed AN container rows from Booking cargo volumes when the create form opens.
 * Totals (GW / measurement) stay on row 1; each row keeps its Type.
 * If staff already entered container data while the workflow was loading,
 * preserve it instead of replacing it with Booking defaults.
 */
export function mapArrivalNoticeCargoFromBooking(
  source: BookingConfirmationPayload,
  current: ArrivalNoticePayload
): ArrivalNoticePayload {
  const { cargoVolumes } = normalizeBookingCargoVolumes(source)
  const seeded = seedAnContainersFromVolumes(cargoVolumes)
  const containers = applyBookingCargoTotalsToFirstRow(seeded, source)
  const hasEnteredContainer = current.containers.some((row) =>
    Object.values(row).some((value) => value.trim().length > 0)
  )
  const nextContainers = hasEnteredContainer
    ? current.containers
    : containers.length > 0
      ? containers
      : current.containers

  return {
    ...current,
    commodityId: current.commodityId ?? source.commodityId ?? null,
    descriptionOfGoods: current.descriptionOfGoods.trim() || source.commodity,
    volume: current.volume.trim() || anContainersToVolumeText(nextContainers),
    containers: nextContainers,
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
 * One-time BL seed from Booking on create: route, schedule, cargo containers,
 * and derived packages / GW / measurement. Parties, FBL no., service mode,
 * and shipping mark stay BL-owned (not copied from booking).
 */
export function prefillBillOfLadingFromBooking(
  source: BookingConfirmationPayload,
  current: BillOfLadingPayload
): BillOfLadingPayload {
  const { cargoVolumes } = normalizeBookingCargoVolumes(source)
  const seeded = seedAnContainersFromVolumes(cargoVolumes)
  const containers =
    seeded.length > 0 ? applyBookingCargoTotalsToFirstRow(seeded, source) : []
  const descriptionOfGoods = source.commodity.trim()
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
    portOfLoading: source.portOfLoading,
    portOfDischarge: source.portOfDischarge,
    placeOfDelivery: source.placeOfDelivery,
    placeOfIssue: source.portOfLoading,
    freightPayableAt: source.placeOfDelivery,
    numberAndKindOfPackages: volumeText,
    containers,
    descriptionOfGoods: cargoText.descriptionOfGoods,
    grossWeight: cargoText.grossWeight,
    measurement: cargoText.measurement,
  }
}

/**
 * DO cargo/containers mirror BL: owned by Arrival Notice. Overwrite
 * `containers` + derived `cargoRows` (PDF table), plus `serviceMode` and
 * `descriptionOfGoods` (read-only mirrors of AN, not editable on DO); leave
 * all other DO fields. Call on DO open, DO save, and after AN save so the
 * sibling DO never drifts.
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
    portOfLoading: source.portOfLoading,
    portOfDischarge: source.portOfDischarge,
    placeOfDelivery: source.placeOfDelivery,
    finalDestination: source.finalDestination,
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
