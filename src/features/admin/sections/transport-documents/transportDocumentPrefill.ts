import type {
  AnContainer,
  ArrivalNoticePayload,
  BillOfLadingPayload,
  BookingConfirmationPayload,
  DeliveryOrderPayload,
  TransportDocumentPayloadMap,
  TransportDocumentType,
} from './transportDocument.types'
import {
  anContainersToBlCargoTextFields,
  anContainersToCargoRows,
  anContainersToVolumeText,
  emptyAnContainer,
  normalizeAnContainers,
  seedAnContainersFromVolumes,
} from './anContainerModel'
import { normalizeBookingCargoVolumes } from './cargoVolumeModel'

/** Previous document type used to prefill the target form. */
export const PREFILL_SOURCE_TYPE: Partial<
  Record<TransportDocumentType, TransportDocumentType>
> = {
  an: 'booking',
  bl: 'an',
  do: 'an',
}

export function getPrefillSourceType(
  target: TransportDocumentType
): TransportDocumentType | null {
  return PREFILL_SOURCE_TYPE[target] ?? null
}

function splitVesselVoyage(vesselVoyage: string): {
  oceanVessel: string
  voyageNumber: string
} {
  const trimmed = vesselVoyage.trim()
  if (!trimmed) return { oceanVessel: '', voyageNumber: '' }
  const parts = trimmed.split(/[\\/]/).map((part) => part.trim())
  if (parts.length >= 2) {
    return {
      oceanVessel: parts[0] ?? '',
      voyageNumber: parts.slice(1).join('/'),
    }
  }
  return { oceanVessel: trimmed, voyageNumber: '' }
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
  if (rows.length === 0) {
    return [
      {
        ...emptyAnContainer(),
        grossWeight: source.grossWeight,
        measurement: source.measurement,
      },
    ]
  }
  return rows.map((row, index) =>
    index === 0
      ? {
          ...row,
          grossWeight: source.grossWeight,
          measurement: source.measurement,
        }
      : row
  )
}

export function prefillArrivalNoticeFromBooking(
  source: BookingConfirmationPayload,
  current: ArrivalNoticePayload
): ArrivalNoticePayload {
  const { cargoVolumes } = normalizeBookingCargoVolumes(source)
  const seeded = seedAnContainersFromVolumes(cargoVolumes)
  const containers = applyBookingCargoTotalsToFirstRow(seeded, source)

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
    descriptionOfGoods: source.commodity,
    // Volume is derived from containers (no free-text Cargo field).
    volume: anContainersToVolumeText(containers),
    containers,
  }
}

/**
 * BL Cargo is owned by Arrival Notice: containers + description + derived
 * packages / GW / measurement. Shipping mark is BL-owned and is not
 * overwritten here. Call on BL open, BL save, and after AN save so the
 * sibling BL cargo never drifts.
 */
export function syncBillOfLadingCargoFromArrivalNotice(
  source: ArrivalNoticePayload,
  current: BillOfLadingPayload
): BillOfLadingPayload {
  const containers = normalizeAnContainers({
    containers: source.containers,
  }).map((row) => ({ ...row }))
  const seeded =
    containers.length > 0 ? containers : [{ ...emptyAnContainer() }]
  const descriptionOfGoods = source.descriptionOfGoods.trim()
  const cargoText = anContainersToBlCargoTextFields(seeded, descriptionOfGoods)
  const volumeText = anContainersToVolumeText(seeded) || source.volume.trim()
  return {
    ...current,
    serviceMode: source.serviceMode,
    numberAndKindOfPackages: volumeText,
    containers: seeded,
    descriptionOfGoods: cargoText.descriptionOfGoods,
    grossWeight: cargoText.grossWeight,
    measurement: cargoText.measurement,
  }
}

export function prefillBillOfLadingFromArrivalNotice(
  source: ArrivalNoticePayload,
  current: BillOfLadingPayload
): BillOfLadingPayload {
  const { oceanVessel, voyageNumber } = splitVesselVoyage(source.vesselVoyage)
  const synced = syncBillOfLadingCargoFromArrivalNotice(source, current)
  return {
    ...synced,
    fblNumber: source.hblNumber,
    consignor: source.shipper,
    shipperPartyId: source.shipperPartyId ?? null,
    consignedToOrderOf: source.consignee,
    consigneePartyId: source.consigneePartyId ?? null,
    notifyAddress: source.notifyParty,
    notifyPartyId: source.notifyPartyId ?? null,
    placeOfReceipt: source.placeOfReceipt,
    portOfLoading: source.portOfLoading,
    portOfDischarge: source.portOfDischarge,
    placeOfDelivery: source.placeOfDelivery,
    oceanVessel,
    voyageNumber,
    dateOfIssue: source.date,
    placeOfIssue: source.portOfLoading,
    freightPayableAt: source.placeOfDelivery,
    // Optional one-time seed from AN marks; never forced to "N/M".
    shippingMark: synced.shippingMark.trim()
      ? synced.shippingMark
      : source.marks,
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
  if (targetType === 'bl' && sourceType === 'an') {
    return prefillBillOfLadingFromArrivalNotice(
      sourcePayload as ArrivalNoticePayload,
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
