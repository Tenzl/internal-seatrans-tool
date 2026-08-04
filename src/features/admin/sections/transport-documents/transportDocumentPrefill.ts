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

export function prefillArrivalNoticeFromBooking(
  source: BookingConfirmationPayload,
  current: ArrivalNoticePayload
): ArrivalNoticePayload {
  const schedule = [source.etd.trim(), source.eta.trim()]
    .filter(Boolean)
    .join(' / ')
  return {
    ...current,
    date: source.date,
    shipmentNumber: source.bookingNumber,
    referenceNumber: source.bookingNumber,
    vesselVoyage: source.vesselVoyage,
    etdEta: schedule,
    placeOfReceipt: source.placeOfReceipt,
    portOfLoading: source.portOfLoading,
    portOfDischarge: source.portOfDischarge,
    placeOfDelivery: source.placeOfDelivery,
    finalDestination: source.placeOfDelivery,
    volume: source.volume,
    cargoRows: [
      {
        ...emptyCargoRow(),
        quantity: source.volume,
        descriptionOfGoods: source.commodity,
        grossWeight: source.grossWeight,
        measurement: source.measurement,
      },
    ],
  }
}

export function prefillBillOfLadingFromArrivalNotice(
  source: ArrivalNoticePayload,
  current: BillOfLadingPayload
): BillOfLadingPayload {
  const { oceanVessel, voyageNumber } = splitVesselVoyage(source.vesselVoyage)
  const cargoValues = (
    key: 'descriptionOfGoods' | 'grossWeight' | 'measurement'
  ) =>
    source.cargoRows
      .map((row) => row[key].trim())
      .filter(Boolean)
      .join('\n')
  return {
    ...current,
    fblNumber: source.hblNumber,
    consignor: source.shipper,
    consignedToOrderOf: source.consignee,
    notifyAddress: source.notifyParty,
    placeOfReceipt: source.placeOfReceipt,
    portOfLoading: source.portOfLoading,
    portOfDischarge: source.portOfDischarge,
    placeOfDelivery: source.placeOfDelivery,
    oceanVessel,
    voyageNumber,
    marksAndNumbers: source.marks,
    numberAndKindOfPackages: source.volume,
    descriptionOfGoods: cargoValues('descriptionOfGoods'),
    grossWeight: cargoValues('grossWeight'),
    measurement: cargoValues('measurement'),
    dateOfIssue: source.date,
    placeOfIssue: source.portOfLoading,
    freightPayableAt: source.placeOfDelivery,
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
