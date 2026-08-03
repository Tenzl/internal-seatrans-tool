import type {
  ArrivalNoticePayload,
  BillOfLadingPayload,
  BookingConfirmationPayload,
  DeliveryOrderPayload,
  TransportDocumentPayloadMap,
  TransportDocumentType,
} from './transportDocument.types'
import { emptyCargoRow } from './transportDocumentSchemas'

/** Previous document type used to prefill the target form. */
export const PREFILL_SOURCE_TYPE: Partial<
  Record<TransportDocumentType, TransportDocumentType>
> = {
  bl: 'booking',
  an: 'bl',
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

function joinVesselVoyage(oceanVessel: string, voyageNumber: string): string {
  const vessel = oceanVessel.trim()
  const voyage = voyageNumber.trim()
  if (vessel && voyage) return `${vessel}/${voyage}`
  return vessel || voyage
}

function variantLabel(
  variant: BillOfLadingPayload['blFormVariant']
): string {
  switch (variant) {
    case 'original':
      return 'Original'
    case 'surrendered':
      return 'Surrendered'
    default:
      return 'Non-negotiable'
  }
}

export function prefillBillOfLadingFromOrder(
  source: BookingConfirmationPayload,
  current: BillOfLadingPayload
): BillOfLadingPayload {
  const { oceanVessel, voyageNumber } = splitVesselVoyage(source.vesselVoyage)
  return {
    ...current,
    placeOfReceipt: source.placeOfReceipt,
    portOfLoading: source.portOfLoading,
    portOfDischarge: source.portOfDischarge,
    placeOfDelivery: source.placeOfDelivery,
    oceanVessel,
    voyageNumber,
    grossWeight: source.grossWeight,
    measurement: source.measurement,
    descriptionOfGoods: source.commodity,
    dateOfIssue: source.date,
    placeOfIssue: source.portOfLoading,
    freightPayableAt: source.placeOfDelivery,
  }
}

export function prefillArrivalNoticeFromBl(
  source: BillOfLadingPayload,
  current: ArrivalNoticePayload
): ArrivalNoticePayload {
  return {
    ...current,
    shipper: source.consignor,
    consignee: source.consignedToOrderOf,
    notifyParty: source.notifyAddress,
    placeOfReceipt: source.placeOfReceipt,
    portOfLoading: source.portOfLoading,
    portOfDischarge: source.portOfDischarge,
    placeOfDelivery: source.placeOfDelivery,
    vesselVoyage: joinVesselVoyage(source.oceanVessel, source.voyageNumber),
    marks: source.marksAndNumbers,
    volume: source.numberAndKindOfPackages,
    hblNumber: source.fblNumber,
    referenceNumber: source.fblNumber,
    billOfLadingType: variantLabel(source.blFormVariant),
    date: source.dateOfIssue,
  }
}

export function prefillDeliveryOrderFromAn(
  source: ArrivalNoticePayload,
  current: DeliveryOrderPayload
): DeliveryOrderPayload {
  const cargoRows =
    source.cargoRows.length > 0
      ? source.cargoRows.map((row) => ({ ...row }))
      : [emptyCargoRow()]

  return {
    ...current,
    date: source.date,
    notifyParty: source.notifyParty,
    mblNumber: source.mblNumber,
    hblNumber: source.hblNumber,
    shipmentNumber: source.shipmentNumber,
    vesselVoyage: source.vesselVoyage,
    placeOfReceipt: source.placeOfReceipt,
    portOfLoading: source.portOfLoading,
    portOfDischarge: source.portOfDischarge,
    placeOfDelivery: source.placeOfDelivery,
    finalDestination: source.finalDestination,
    serviceMode: source.serviceMode,
    cfsTerminal: source.cfsTerminal,
    marks: source.marks,
    volume: source.volume,
    note: source.note,
    customerAttention: source.customerAttention,
    cargoRows,
  }
}

export function applyPrefillFromPrevious<T extends TransportDocumentType>(
  targetType: T,
  sourceType: TransportDocumentType,
  sourcePayload: TransportDocumentPayloadMap[TransportDocumentType],
  currentPayload: TransportDocumentPayloadMap[T]
): TransportDocumentPayloadMap[T] {
  if (targetType === 'bl' && sourceType === 'booking') {
    return prefillBillOfLadingFromOrder(
      sourcePayload as BookingConfirmationPayload,
      currentPayload as BillOfLadingPayload
    ) as TransportDocumentPayloadMap[T]
  }
  if (targetType === 'an' && sourceType === 'bl') {
    return prefillArrivalNoticeFromBl(
      sourcePayload as BillOfLadingPayload,
      currentPayload as ArrivalNoticePayload
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
