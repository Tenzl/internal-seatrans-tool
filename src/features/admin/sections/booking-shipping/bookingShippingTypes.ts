export interface BookingTransitLegResponse {
  id: number
  portId: number
  sortOrder: number
  eta?: string | null
  etd?: string | null
}

export interface BookingShippingResponse {
  id?: number | null
  bookingPartnerId: number
  bookingNo?: string | null
  bookingTo?: string | null
  bookingNumberReference?: string | null
  bookingNote?: string | null
  serviceMode?: string | null
  placeOfReceiptPortId?: number | null
  portOfLoadingPortId?: number | null
  pickUp?: string | null
  etd?: string | null
  dateOfPickUp?: string | null
  dropOffWarehouse?: string | null
  feederVessel?: string | null
  feederVoyage?: string | null
  motherVessel?: string | null
  motherVoyage?: string | null
  provider?: string | null
  carrier?: string | null
  cyCutOff?: string | null
  siCutOff?: string | null
  vgmCutOff?: string | null
  gateIn?: string | null
  temp?: number | string | null
  vent?: string | null
  freightTerms?: string | null
  portOfDischargePortId?: number | null
  placeOfDeliveryPortId?: number | null
  finalDestinationPortId?: number | null
  eta?: string | null
  volume?: string | null
  cargoType?: string | null
  cargoName?: string | null
  grossWeightKgs?: number | string | null
  measurementCbm?: number | string | null
  contact?: string | null
  specialRemark?: string | null
  dateOfCreation?: string | null
  termsAndConditions?: string | null
  transitLegs: BookingTransitLegResponse[]
}

export interface BookingTransitLegRequest {
  id?: number | null
  portId: number
  sortOrder: number
  eta?: string | null
  etd?: string | null
}

export interface BookingShippingUpsertRequest {
  bookingNo?: string | null
  bookingTo?: string | null
  bookingNumberReference?: string | null
  bookingNote?: string | null
  serviceMode?: string | null
  placeOfReceiptPortId?: number | null
  portOfLoadingPortId?: number | null
  pickUp?: string | null
  etd?: string | null
  dateOfPickUp?: string | null
  dropOffWarehouse?: string | null
  feederVessel?: string | null
  feederVoyage?: string | null
  motherVessel?: string | null
  motherVoyage?: string | null
  provider?: string | null
  carrier?: string | null
  cyCutOff?: string | null
  siCutOff?: string | null
  vgmCutOff?: string | null
  gateIn?: string | null
  temp?: number | string | null
  vent?: string | null
  freightTerms?: string | null
  portOfDischargePortId?: number | null
  placeOfDeliveryPortId?: number | null
  finalDestinationPortId?: number | null
  eta?: string | null
  volume?: string | null
  cargoType?: string | null
  cargoName?: string | null
  grossWeightKgs?: number | string | null
  measurementCbm?: number | string | null
  contact?: string | null
  specialRemark?: string | null
  dateOfCreation?: string | null
  termsAndConditions?: string | null
  transitLegs: BookingTransitLegRequest[]
}
