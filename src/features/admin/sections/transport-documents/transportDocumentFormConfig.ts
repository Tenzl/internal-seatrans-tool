import type {
  CustomerType,
  PartnerAdditionType,
} from '../partner-management/partnerManagementTypes'
import type {
  AnContainer,
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
  | 'port-name'
  | 'party'

type TransportDocumentFieldKey = Exclude<
  | keyof ArrivalNoticePayload
  | keyof BookingConfirmationPayload
  | keyof DeliveryOrderPayload
  | keyof BillOfLadingPayload,
  'cargoRows' | 'cargoVolumes' | 'containers'
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
  partyIdKey?:
    | 'clientPartyId'
    | 'agentPartyId'
    | 'shipperPartyId'
    | 'consigneePartyId'
    | 'notifyPartyId'
  additionType?: PartnerAdditionType
  customerType?: CustomerType
  /** `name` = fill partner name only (Booking Client). Default full block. */
  partyValueMode?: 'full' | 'name'
  /**
   * Field-label weight. Default `medium` (light bold for HBL/MBL/etc.).
   * Use `strong` for Reference so it stays heavier than sibling identity labels.
   */
  labelEmphasis?: 'medium' | 'strong'
  /**
   * True when this field's value is synced from Arrival Notice and must stay
   * read-only outside AN (e.g. Service Mode / Description of goods on BL/DO).
   */
  syncedFromAn?: boolean
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

/** Workflow order branches after Arrival Notice: Export -> Bill of Lading, Import -> Delivery Order. */
export const TRANSPORT_DOCUMENTS: TransportDocumentDefinition[] = [
  {
    type: 'booking',
    shortLabel: 'Booking',
    label: 'Booking',
    description: 'Root booking confirmation and shipment schedule',
  },
  {
    type: 'an',
    shortLabel: 'Arrival Notice',
    label: 'Arrival Notice',
    description: 'Incoming shipment notification',
  },
  {
    type: 'bl',
    shortLabel: 'Bill of Lading',
    label: 'Bill of Lading',
    description: 'FIATA multimodal transport bill of lading',
  },
  {
    type: 'do',
    shortLabel: 'Delivery Order',
    label: 'Delivery Order',
    description: 'Cargo release instruction',
  },
]

/** Service mode dropdown values shared by the AN and DO forms. */
export const SERVICE_MODE_OPTIONS: TransportDocumentFieldOption[] = [
  { value: 'LCL/LCL - CFS/DOOR', label: 'LCL/LCL - CFS/DOOR' },
  { value: 'FCL/FCL - CY/DOOR', label: 'FCL/FCL - CY/DOOR' },
  { value: 'FCL/FCL - CY/CY', label: 'FCL/FCL - CY/CY' },
  { value: 'FCL/LCL - CY/CFS', label: 'FCL/LCL - CY/CFS' },
  { value: 'LCL/FCL - CFS/CY', label: 'LCL/FCL - CFS/CY' },
  { value: 'LCL/LCL - CFS/CFS', label: 'LCL/LCL - CFS/CFS' },
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
      title: 'Client',
      fields: [
        {
          key: 'to',
          label: 'Client',
          kind: 'party',
          partyIdKey: 'clientPartyId',
          additionType: 'CUSTOMER',
          partyValueMode: 'name',
          span: 2,
        },
      ],
    },
    {
      title: 'Route',
      fields: [
        {
          key: 'placeOfReceipt',
          label: 'Place of receipt',
          kind: 'port-name',
        },
        {
          key: 'portOfLoading',
          label: 'Port of loading',
          kind: 'port-name',
        },
        {
          key: 'portOfDischarge',
          label: 'Port of discharge',
          kind: 'port-name',
        },
        {
          key: 'placeOfDelivery',
          label: 'Place of delivery',
          kind: 'port-name',
        },
        { key: 'transitPort', label: 'Transit port', kind: 'port-name' },
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
        { key: 'pickupPlace', label: 'Place of pickup', kind: 'port-name' },
        {
          key: 'dropoffPlace',
          label: 'Place of drop-off',
          kind: 'port-name',
        },
        { key: 'closingTime', label: 'Closing time', kind: 'datetime-local' },
        { key: 'siCutoff', label: 'SI cut-off', kind: 'datetime-local' },
        { key: 'vgmCutoff', label: 'VGM cut-off', kind: 'datetime-local' },
      ],
    },
    {
      title: 'Cargo',
      fields: [
        { key: 'commodity', label: 'Commodity', kind: 'textarea', span: 2 },
        { key: 'grossWeight', label: 'Gross weight (KGS)' },
        { key: 'measurement', label: 'Measurement (CBM)' },
        {
          key: 'specialRemark',
          label: 'Special remark',
          kind: 'textarea',
          span: 2,
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
        'Fields and the author signature overlay onto the Bill of Lading form selected in the bottom bar.',
      fields: [
        { key: 'fblNumber', label: 'FBL No.' },
        { key: 'placeOfIssue', label: 'Place of issue', kind: 'port-name' },
        { key: 'dateOfIssue', label: 'Date of issue', kind: 'date' },
        { key: 'numberOfOriginals', label: "Number of Original FBL's" },
      ],
    },
    {
      title: 'Parties',
      fields: [
        {
          key: 'consignor',
          label: 'Consignor',
          kind: 'party',
          partyIdKey: 'shipperPartyId',
          additionType: 'SHIPPER',
        },
        {
          key: 'consignedToOrderOf',
          label: 'Consigned to order of',
          kind: 'party',
          partyIdKey: 'consigneePartyId',
          additionType: 'CONSIGNEE',
        },
        {
          key: 'notifyAddress',
          label: 'Notify address',
          kind: 'party',
          partyIdKey: 'notifyPartyId',
          additionType: 'NOTIFY_PARTY',
        },
      ],
    },
    {
      title: 'Route',
      fields: [
        {
          key: 'placeOfReceipt',
          label: 'Place of receipt',
          kind: 'port-name',
        },
        {
          key: 'portOfLoading',
          label: 'Port of loading',
          kind: 'port-name',
        },
        {
          key: 'portOfDischarge',
          label: 'Port of discharge',
          kind: 'port-name',
        },
        {
          key: 'placeOfDelivery',
          label: 'Place of delivery',
          kind: 'port-name',
        },
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
      description:
        'Service mode and description of goods are synced from Arrival Notice. Shipping mark is edited here for the BL PDF.',
      fields: [
        {
          key: 'serviceMode',
          label: 'Service mode',
          kind: 'select',
          options: SERVICE_MODE_OPTIONS,
          syncedFromAn: true,
        },
        {
          key: 'shippingMark',
          label: 'Shipping mark',
          kind: 'textarea',
          span: 2,
          placeholder: 'e.g. N/M or marks as shown on cargo',
        },
        {
          key: 'descriptionOfGoods',
          label: 'Description of goods',
          kind: 'textarea',
          span: 3,
          syncedFromAn: true,
        },
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
        { key: 'anNumber', label: 'Arrival Notice No.' },
        { key: 'date', label: 'Date', kind: 'date' },
      ],
    },
    {
      title: 'Parties',
      fields: [
        {
          key: 'shipper',
          label: 'Shipper',
          kind: 'party',
          partyIdKey: 'shipperPartyId',
          additionType: 'SHIPPER',
        },
        {
          key: 'consignee',
          label: 'Consignee',
          kind: 'party',
          partyIdKey: 'consigneePartyId',
          additionType: 'CONSIGNEE',
        },
        {
          key: 'notifyParty',
          label: 'Notify Party',
          kind: 'party',
          partyIdKey: 'notifyPartyId',
          additionType: 'NOTIFY_PARTY',
        },
        {
          key: 'agent',
          label: 'Agent',
          kind: 'party',
          partyIdKey: 'agentPartyId',
          customerType: 'AGENT',
        },
      ],
    },
    {
      title: 'References',
      fields: [
        { key: 'mblNumber', label: 'MBL No.' },
        { key: 'hblNumber', label: 'HBL No.' },
        { key: 'shipmentNumber', label: 'Shipment No.' },
        {
          key: 'referenceNumber',
          label: 'Reference No.',
          labelEmphasis: 'strong',
        },
        { key: 'billOfLadingType', label: 'Type of Bill of Lading' },
      ],
    },
    {
      title: 'Route',
      fields: [
        {
          key: 'placeOfReceipt',
          label: 'Place of receipt',
          kind: 'port-name',
        },
        {
          key: 'portOfLoading',
          label: 'Port of loading',
          kind: 'port-name',
        },
        {
          key: 'portOfDischarge',
          label: 'Port of discharge',
          kind: 'port-name',
        },
        {
          key: 'placeOfDelivery',
          label: 'Place of delivery',
          kind: 'port-name',
        },
        {
          key: 'finalDestination',
          label: 'Final destination',
          kind: 'port-name',
        },
      ],
    },
    {
      title: 'Schedule / ops',
      fields: [
        { key: 'vesselVoyage', label: 'Vessel / Voyage No.' },
        { key: 'etd', label: 'ETD', kind: 'date' },
        { key: 'eta', label: 'ETA', kind: 'date' },
        {
          key: 'serviceMode',
          label: 'Service mode',
          kind: 'select',
          options: SERVICE_MODE_OPTIONS,
        },
        { key: 'cfsTerminal', label: 'CFS terminal' },
      ],
    },
    {
      title: 'Cargo',
      fields: [
        {
          key: 'descriptionOfGoods',
          label: 'Description of goods',
          kind: 'textarea',
        },
        { key: 'marks', label: 'Marks', kind: 'textarea' },
        { key: 'note', label: 'Note', kind: 'textarea', span: 2 },
        {
          key: 'customerAttention',
          label: "For customer's attention",
          kind: 'textarea',
          span: 2,
        },
      ],
    },
  ],
  do: [
    {
      title: 'Identity',
      fields: [
        { key: 'doNumber', label: 'Delivery Order No.' },
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
          kind: 'party',
          partyIdKey: 'consigneePartyId',
          additionType: 'CONSIGNEE',
          span: 2,
        },
        {
          key: 'notifyParty',
          label: 'Notify party',
          kind: 'party',
          partyIdKey: 'notifyPartyId',
          additionType: 'NOTIFY_PARTY',
        },
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
        {
          key: 'placeOfReceipt',
          label: 'Place of receipt',
          kind: 'port-name',
        },
        {
          key: 'portOfLoading',
          label: 'Port of loading',
          kind: 'port-name',
        },
        {
          key: 'portOfDischarge',
          label: 'Port of discharge',
          kind: 'port-name',
        },
        {
          key: 'placeOfDelivery',
          label: 'Place of delivery',
          kind: 'port-name',
        },
        {
          key: 'finalDestination',
          label: 'Final destination',
          kind: 'port-name',
        },
      ],
    },
    {
      title: 'Schedule / ops',
      fields: [
        { key: 'vesselVoyage', label: 'Vessel / Voyage No.' },
        { key: 'etd', label: 'ETD', kind: 'date' },
        { key: 'eta', label: 'ETA', kind: 'date' },
        {
          key: 'serviceMode',
          label: 'Service mode',
          kind: 'select',
          options: SERVICE_MODE_OPTIONS,
          syncedFromAn: true,
        },
        { key: 'cfsTerminal', label: 'CFS terminal' },
      ],
    },
    {
      title: 'Cargo',
      description:
        'Description of goods is mapped from Arrival Notice and read-only here.',
      fields: [
        {
          key: 'descriptionOfGoods',
          label: 'Description of goods',
          kind: 'textarea',
          span: 2,
          syncedFromAn: true,
        },
        { key: 'marks', label: 'Marks', kind: 'textarea' },
        {
          key: 'customerAttention',
          label: "For customer's attention",
          kind: 'textarea',
        },
        { key: 'note', label: 'Note', kind: 'textarea', span: 2 },
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

export const AN_CONTAINER_COLUMNS: Array<{
  key: keyof AnContainer
  label: string
  maxLength: number
}> = [
  { key: 'type', label: 'Type', maxLength: 20 },
  { key: 'containerNo', label: 'Container No.', maxLength: 500 },
  { key: 'sealNo', label: 'Seal No.', maxLength: 500 },
  { key: 'grossWeight', label: 'Gross Weight (KGS)', maxLength: 500 },
  { key: 'measurement', label: 'Measurement (CBM)', maxLength: 500 },
  { key: 'tare', label: 'Tare', maxLength: 500 },
  { key: 'noOfPkgs', label: 'No of Pkgs', maxLength: 500 },
  { key: 'packageType', label: 'Package type', maxLength: 500 },
  { key: 'note', label: 'Note', maxLength: 2_000 },
  { key: 'method', label: 'Method', maxLength: 500 },
]

export const BL_FORM_VARIANT_OPTIONS: TransportDocumentFieldOption[] = [
  { value: 'non_negotiable', label: 'Non-negotiable' },
  { value: 'original', label: 'Original' },
  { value: 'surrendered', label: 'Surrendered' },
]

/**
 * Keep a stored legacy value selectable even when it predates the current
 * option list (e.g. Service Mode text saved before this dropdown existed),
 * so old records render the saved value instead of a blank Select.
 */
export function resolveSelectFieldOptions(
  options: TransportDocumentFieldOption[],
  value: string
): TransportDocumentFieldOption[] {
  if (!value || options.some((option) => option.value === value)) {
    return options
  }
  return [{ value, label: value }, ...options]
}

export function getTransportDocumentDefinition(type: TransportDocumentType) {
  return (
    TRANSPORT_DOCUMENTS.find((document) => document.type === type) ??
    TRANSPORT_DOCUMENTS[0]
  )
}
