import type {
  ArrivalNoticePayload,
  BillOfLadingPayload,
  BookingConfirmationPayload,
  CargoRow,
  DeliveryOrderPayload,
  TransportDocumentType,
} from './transportDocument.types'

export type TransportDocumentFieldKind =
  | 'date'
  | 'datetime-local'
  | 'text'
  | 'textarea'
  | 'select'

type TransportDocumentFieldKey = Exclude<
  | keyof ArrivalNoticePayload
  | keyof BookingConfirmationPayload
  | keyof DeliveryOrderPayload
  | keyof BillOfLadingPayload,
  'cargoRows'
>

export interface TransportDocumentFieldOption {
  value: string
  label: string
}

export interface TransportDocumentFieldSpec {
  key: TransportDocumentFieldKey
  label: string
  kind?: TransportDocumentFieldKind
  placeholder?: string
  span?: 1 | 2 | 3
  options?: TransportDocumentFieldOption[]
}

export interface TransportDocumentFieldSection {
  title: string
  description?: string
  fields: TransportDocumentFieldSpec[]
}

export interface TransportDocumentDefinition {
  type: TransportDocumentType
  shortLabel: string
  label: string
  description: string
}

/** Lifecycle order: Order → BL → AN → DO */
export const TRANSPORT_DOCUMENTS: TransportDocumentDefinition[] = [
  {
    type: 'booking',
    shortLabel: 'Order',
    label: 'Order',
    description: 'Initial order / booking confirmation schedule',
  },
  {
    type: 'bl',
    shortLabel: 'BL',
    label: 'Bill of Lading',
    description: 'FIATA multimodal transport bill of lading',
  },
  {
    type: 'an',
    shortLabel: 'AN',
    label: 'Arrival Notice',
    description: 'Incoming shipment notification',
  },
  {
    type: 'do',
    shortLabel: 'DO',
    label: 'Delivery Order',
    description: 'Cargo release instruction',
  },
]

export const TRANSPORT_DOCUMENT_FORM_SECTIONS: Record<
  TransportDocumentType,
  TransportDocumentFieldSection[]
> = {
  booking: [
    {
      title: 'Identity',
      fields: [
        { key: 'bookingNumber', label: 'Booking No.' },
        { key: 'date', label: 'Date', kind: 'date' },
      ],
    },
    {
      title: 'Parties',
      fields: [{ key: 'to', label: 'To', kind: 'textarea', span: 3 }],
    },
    {
      title: 'Route',
      fields: [
        { key: 'placeOfReceipt', label: 'Place of receipt' },
        { key: 'portOfLoading', label: 'Port of loading' },
        { key: 'portOfDischarge', label: 'Port of discharge' },
        { key: 'placeOfDelivery', label: 'Place of delivery' },
        { key: 'transitPort', label: 'Transit port' },
      ],
    },
    {
      title: 'Schedule',
      fields: [
        { key: 'vesselVoyage', label: 'Vessel / Voyage' },
        { key: 'etd', label: 'ETD', kind: 'date' },
        { key: 'eta', label: 'ETA', kind: 'date' },
        { key: 'motherVessel', label: 'Mother vessel' },
        { key: 'motherVoyage', label: 'Mother voyage' },
      ],
    },
    {
      title: 'Pickup and cut-offs',
      fields: [
        { key: 'pickupDate', label: 'Date of pickup', kind: 'date' },
        { key: 'pickupPlace', label: 'Place of pickup' },
        { key: 'dropoffPlace', label: 'Place of drop-off' },
        { key: 'closingTime', label: 'Closing time', kind: 'datetime-local' },
        { key: 'siCutoff', label: 'SI cut-off', kind: 'datetime-local' },
        { key: 'vgmCutoff', label: 'VGM cut-off', kind: 'datetime-local' },
      ],
    },
    {
      title: 'Cargo',
      fields: [
        { key: 'commodity', label: 'Commodity', kind: 'textarea', span: 2 },
        { key: 'volume', label: 'Volume' },
        { key: 'grossWeight', label: 'Gross weight (KGS)' },
        { key: 'measurement', label: 'Measurement (CBM)' },
        {
          key: 'specialRemark',
          label: 'Special remark',
          kind: 'textarea',
          span: 3,
        },
      ],
    },
    {
      title: 'Contact',
      fields: [
        { key: 'contact', label: 'Contact', kind: 'textarea' },
        { key: 'pic', label: 'PIC', kind: 'textarea', span: 2 },
      ],
    },
  ],
  bl: [
    {
      title: 'Identity',
      description:
        'Choose a blank BL form; fields and the author signature overlay onto it.',
      fields: [
        { key: 'fblNumber', label: 'FBL No.' },
        {
          key: 'blFormVariant',
          label: 'BL form',
          kind: 'select',
          options: [
            { value: 'non_negotiable', label: 'Non-negotiable' },
            { value: 'original', label: 'Original' },
            { value: 'surrendered', label: 'Surrendered' },
          ],
        },
        { key: 'placeOfIssue', label: 'Place of issue' },
        { key: 'dateOfIssue', label: 'Date of issue', kind: 'date' },
        { key: 'numberOfOriginals', label: "Number of Original FBL's" },
      ],
    },
    {
      title: 'Parties',
      fields: [
        { key: 'consignor', label: 'Consignor', kind: 'textarea', span: 3 },
        {
          key: 'consignedToOrderOf',
          label: 'Consigned to order of',
          kind: 'textarea',
          span: 3,
        },
        {
          key: 'notifyAddress',
          label: 'Notify address',
          kind: 'textarea',
          span: 3,
        },
      ],
    },
    {
      title: 'Route',
      fields: [
        { key: 'placeOfReceipt', label: 'Place of receipt' },
        { key: 'portOfLoading', label: 'Port of loading' },
        { key: 'portOfDischarge', label: 'Port of discharge' },
        { key: 'placeOfDelivery', label: 'Place of delivery' },
      ],
    },
    {
      title: 'Vessel',
      fields: [
        { key: 'oceanVessel', label: 'Ocean vessel' },
        { key: 'voyageNumber', label: 'Voyage no.' },
      ],
    },
    {
      title: 'Cargo',
      fields: [
        {
          key: 'marksAndNumbers',
          label: 'Marks and numbers',
          kind: 'textarea',
          span: 2,
        },
        {
          key: 'numberAndKindOfPackages',
          label: 'Number and kind of packages',
          kind: 'textarea',
        },
        {
          key: 'descriptionOfGoods',
          label: 'Description of goods',
          kind: 'textarea',
          span: 3,
        },
        { key: 'grossWeight', label: 'Gross weight' },
        { key: 'measurement', label: 'Measurement' },
      ],
    },
    {
      title: 'Commercial',
      fields: [
        { key: 'freightTerms', label: 'Freight terms' },
        { key: 'cleanOnBoard', label: 'Clean on board' },
        { key: 'freightAmount', label: 'Freight amount' },
        { key: 'freightPayableAt', label: 'Freight payable at' },
        {
          key: 'declarationOfInterest',
          label: 'Declaration of interest (Clause 6.2)',
          kind: 'textarea',
        },
        {
          key: 'declaredValue',
          label: 'Declared value (Clauses 7 & 8)',
          kind: 'textarea',
        },
        {
          key: 'cargoInsurance',
          label: 'Cargo insurance',
          kind: 'select',
          options: [
            { value: '', label: 'Unchecked' },
            { value: 'not_covered', label: 'Not covered' },
            { value: 'covered', label: 'Covered (attached policy)' },
          ],
        },
      ],
    },
    {
      title: 'Delivery note',
      fields: [
        {
          key: 'deliveryApplyTo',
          label: 'For delivery of goods please apply to',
          kind: 'textarea',
          span: 3,
        },
      ],
    },
  ],
  an: [
    {
      title: 'Identity',
      fields: [
        { key: 'anNumber', label: 'AN No.' },
        { key: 'date', label: 'Date', kind: 'date' },
        { key: 'agent', label: 'Agent' },
      ],
    },
    {
      title: 'Parties',
      fields: [
        { key: 'shipper', label: 'Shipper', kind: 'textarea' },
        { key: 'consignee', label: 'Consignee', kind: 'textarea' },
        { key: 'notifyParty', label: 'Notify party', kind: 'textarea' },
      ],
    },
    {
      title: 'References',
      fields: [
        { key: 'mblNumber', label: 'MBL No.' },
        { key: 'hblNumber', label: 'HBL No.' },
        { key: 'shipmentNumber', label: 'Shipment No.' },
        { key: 'referenceNumber', label: 'Reference No.' },
        { key: 'billOfLadingType', label: 'Type of B/L' },
      ],
    },
    {
      title: 'Route',
      fields: [
        { key: 'placeOfReceipt', label: 'Place of receipt' },
        { key: 'portOfLoading', label: 'Port of loading' },
        { key: 'portOfDischarge', label: 'Port of discharge' },
        { key: 'placeOfDelivery', label: 'Place of delivery' },
        { key: 'finalDestination', label: 'Final destination' },
      ],
    },
    {
      title: 'Schedule / ops',
      fields: [
        { key: 'vesselVoyage', label: 'Vessel / Voyage No.' },
        { key: 'etdEta', label: 'ETD / ETA' },
        { key: 'serviceMode', label: 'Service mode' },
        { key: 'cfsTerminal', label: 'CFS terminal' },
      ],
    },
    {
      title: 'Cargo',
      fields: [
        { key: 'marks', label: 'Marks', kind: 'textarea', span: 2 },
        { key: 'volume', label: 'Volume' },
        { key: 'note', label: 'Note', kind: 'textarea', span: 3 },
        {
          key: 'customerAttention',
          label: "For customer's attention",
          kind: 'textarea',
          span: 3,
        },
      ],
    },
  ],
  do: [
    {
      title: 'Identity',
      fields: [
        { key: 'doNumber', label: 'DO No.' },
        { key: 'date', label: 'Date', kind: 'date' },
        { key: 'to', label: 'To', kind: 'textarea' },
      ],
    },
    {
      title: 'Delivery parties',
      fields: [
        {
          key: 'deliverTo',
          label: 'Deliver shipment to',
          kind: 'textarea',
          span: 2,
        },
        { key: 'notifyParty', label: 'Notify party', kind: 'textarea' },
      ],
    },
    {
      title: 'References',
      fields: [
        { key: 'mblNumber', label: 'MBL No.' },
        { key: 'hblNumber', label: 'HBL No.' },
        { key: 'shipmentNumber', label: 'Shipment No.' },
      ],
    },
    {
      title: 'Route',
      fields: [
        { key: 'placeOfReceipt', label: 'Place of receipt' },
        { key: 'portOfLoading', label: 'Port of loading' },
        { key: 'portOfDischarge', label: 'Port of discharge' },
        { key: 'placeOfDelivery', label: 'Place of delivery' },
        { key: 'finalDestination', label: 'Final destination' },
      ],
    },
    {
      title: 'Schedule / ops',
      fields: [
        { key: 'vesselVoyage', label: 'Vessel / Voyage No.' },
        { key: 'etd', label: 'ETD', kind: 'date' },
        { key: 'eta', label: 'ETA', kind: 'date' },
        { key: 'serviceMode', label: 'Service mode' },
        { key: 'cfsTerminal', label: 'CFS terminal' },
      ],
    },
    {
      title: 'Cargo',
      fields: [
        { key: 'marks', label: 'Marks', kind: 'textarea', span: 2 },
        { key: 'volume', label: 'Volume' },
        { key: 'note', label: 'Note', kind: 'textarea', span: 3 },
        {
          key: 'customerAttention',
          label: "For customer's attention",
          kind: 'textarea',
          span: 3,
        },
      ],
    },
  ],
}

export const TRANSPORT_FIELD_SPAN_CLASS: Record<
  NonNullable<TransportDocumentFieldSpec['span']>,
  string
> = {
  1: '',
  2: 'md:col-span-2',
  3: 'md:col-span-2 xl:col-span-3',
}

export const CARGO_ROW_COLUMNS: Array<{
  key: keyof CargoRow
  label: string
  maxLength: number
}> = [
  { key: 'containerSealNumber', label: 'Container / Seal No.', maxLength: 500 },
  { key: 'quantity', label: 'Quantity', maxLength: 500 },
  {
    key: 'descriptionOfGoods',
    label: 'Description of goods',
    maxLength: 2_000,
  },
  { key: 'grossWeight', label: 'Gross weight', maxLength: 500 },
  { key: 'measurement', label: 'Measurement', maxLength: 500 },
]

export function getTransportDocumentDefinition(type: TransportDocumentType) {
  return (
    TRANSPORT_DOCUMENTS.find((document) => document.type === type) ??
    TRANSPORT_DOCUMENTS[0]
  )
}
