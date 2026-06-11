import type {
  BookingShippingResponse,
  BookingShippingUpsertRequest,
} from '@/features/admin/types/bookingShipping.types'

export const emptyBookingShippingForm = (): BookingShippingUpsertRequest => ({
  bookingNo: null,
  bookingTo: null,
  bookingNumberReference: null,
  bookingNote: null,
  serviceMode: null,
  placeOfReceiptPortId: null,
  portOfLoadingPortId: null,
  pickUp: null,
  etd: null,
  dateOfPickUp: null,
  dropOffWarehouse: null,
  feederVessel: null,
  feederVoyage: null,
  motherVessel: null,
  motherVoyage: null,
  provider: null,
  carrier: null,
  cyCutOff: null,
  siCutOff: null,
  vgmCutOff: null,
  gateIn: null,
  temp: null,
  vent: null,
  freightTerms: null,
  portOfDischargePortId: null,
  placeOfDeliveryPortId: null,
  finalDestinationPortId: null,
  eta: null,
  volume: null,
  cargoType: null,
  cargoName: null,
  grossWeightKgs: null,
  measurementCbm: null,
  contact: null,
  specialRemark: null,
  dateOfCreation: null,
  termsAndConditions: null,
  transitLegs: [],
})

export const toBookingShippingForm = (
  data: BookingShippingResponse,
): BookingShippingUpsertRequest => ({
  bookingNo: data.bookingNo ?? null,
  bookingTo: data.bookingTo ?? null,
  bookingNumberReference: data.bookingNumberReference ?? null,
  bookingNote: data.bookingNote ?? null,
  serviceMode: data.serviceMode ?? null,
  placeOfReceiptPortId: data.placeOfReceiptPortId ?? null,
  portOfLoadingPortId: data.portOfLoadingPortId ?? null,
  pickUp: data.pickUp ?? null,
  etd: data.etd ?? null,
  dateOfPickUp: data.dateOfPickUp ?? null,
  dropOffWarehouse: data.dropOffWarehouse ?? null,
  feederVessel: data.feederVessel ?? null,
  feederVoyage: data.feederVoyage ?? null,
  motherVessel: data.motherVessel ?? null,
  motherVoyage: data.motherVoyage ?? null,
  provider: data.provider ?? null,
  carrier: data.carrier ?? null,
  cyCutOff: data.cyCutOff ?? null,
  siCutOff: data.siCutOff ?? null,
  vgmCutOff: data.vgmCutOff ?? null,
  gateIn: data.gateIn ?? null,
  temp: data.temp ?? null,
  vent: data.vent ?? null,
  freightTerms: data.freightTerms ?? null,
  portOfDischargePortId: data.portOfDischargePortId ?? null,
  placeOfDeliveryPortId: data.placeOfDeliveryPortId ?? null,
  finalDestinationPortId: data.finalDestinationPortId ?? null,
  eta: data.eta ?? null,
  volume: data.volume ?? null,
  cargoType: data.cargoType ?? null,
  cargoName: data.cargoName ?? null,
  grossWeightKgs: data.grossWeightKgs ?? null,
  measurementCbm: data.measurementCbm ?? null,
  contact: data.contact ?? null,
  specialRemark: data.specialRemark ?? null,
  dateOfCreation: data.dateOfCreation ?? null,
  termsAndConditions: data.termsAndConditions ?? null,
  transitLegs: (data.transitLegs ?? []).map((leg) => ({
    id: leg.id,
    portId: leg.portId,
    sortOrder: leg.sortOrder,
    eta: leg.eta ?? null,
    etd: leg.etd ?? null,
  })),
})

export function collectPortIds(form: BookingShippingUpsertRequest): number[] {
  const ids = new Set<number>()
  const scalarIds = [
    form.placeOfReceiptPortId,
    form.portOfLoadingPortId,
    form.portOfDischargePortId,
    form.placeOfDeliveryPortId,
    form.finalDestinationPortId,
  ]
  scalarIds.forEach((id) => {
    if (id != null) ids.add(id)
  })
  form.transitLegs.forEach((leg) => {
    if (leg.portId) ids.add(leg.portId)
  })
  return Array.from(ids)
}
