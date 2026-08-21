import type {
  AnContainer,
  TransportDocumentType,
} from './transportDocument.types'

export const REQUIRED_DOCUMENT_FIELDS: Record<
  TransportDocumentType,
  readonly string[]
> = {
  booking: [
    'bookingNumber',
    'date',
    'to',
    'vesselVoyage',
    'etd',
    'eta',
    'portOfLoading',
    'portOfDischarge',
    'commodityType',
    'commodityName',
    'grossWeight',
    'measurement',
    'pic',
    'cargoVolumes',
  ],
  bl: [
    'fblNumber',
    'consignor',
    'consignedToOrderOf',
    'oceanVessel',
    'portOfLoading',
    'portOfDischarge',
    'serviceMode',
    'shippingMark',
    'descriptionOfGoods',
    'placeOfIssue',
    'dateOfIssue',
    'numberOfOriginals',
    'containers',
  ],
  an: [
    'anNumber',
    'date',
    'agent',
    'shipper',
    'consignee',
    'hblNumber',
    'vesselVoyage',
    'eta',
    'portOfLoading',
    'portOfDischarge',
    'serviceMode',
    'descriptionOfGoods',
    'containers',
  ],
  do: [
    'doNumber',
    'date',
    'to',
    'deliverTo',
    'hblNumber',
    'vesselVoyage',
    'eta',
    'portOfLoading',
    'portOfDischarge',
    'serviceMode',
    'descriptionOfGoods',
    'containers',
  ],
}

export const REQUIRED_CONTAINER_FIELDS = new Set<keyof AnContainer>([
  'type',
  'containerNo',
  'sealNo',
  'grossWeight',
  'measurement',
  'noOfPkgs',
  'packageType',
])

export function isTransportDocumentFieldRequired(
  type: TransportDocumentType,
  key: string
) {
  return REQUIRED_DOCUMENT_FIELDS[type].includes(key)
}
