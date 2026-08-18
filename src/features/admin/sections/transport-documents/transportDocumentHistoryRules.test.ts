import { describe, expect, it } from 'vitest'
import type { TransportDocumentRecord } from './transportDocument.types'
import {
  buildBookingCopyUrl,
  buildHistoryDocumentFileName,
  buildTransportDocumentDetailUrl,
  getHistoryDocumentSections,
  getTransportDocumentDetailParams,
  getTransportDocumentRowCapabilities,
} from './transportDocumentHistoryRules'

const containers = [
  {
    type: "20'DC",
    containerNo: 'CONT-1',
    sealNo: '',
    grossWeight: '100',
    measurement: '1',
    tare: '',
    packageType: '',
    noOfPkgs: '2',
    note: 'Parts',
    method: '',
  },
]

const record: TransportDocumentRecord = {
  id: 12,
  version: 1,
  documentType: 'an',
  referenceNumber: 'AN 24/001',
  payload: {
    agent: 'SeaTrans',
    date: '2026-07-30',
    anNumber: 'AN 24/001',
    shipper: 'Example shipper',
    consignee: '',
    notifyParty: '',
    mblNumber: '',
    hblNumber: '',
    vesselVoyage: '',
    etd: '',
    eta: '',
    cfsTerminal: '',
    shipmentNumber: '',
    referenceNumber: '',
    billOfLadingType: '',
    placeOfReceipt: '',
    portOfLoading: '',
    portOfDischarge: '',
    placeOfDelivery: '',
    finalDestination: '',
    serviceMode: '',
    note: '',
    marks: '',
    descriptionOfGoods: '',
    volume: '',
    customerAttention: '',
    containers,
  },
  status: 'PROCESSING',
  createdByUserId: 3,
  createdAt: '2026-07-30T08:00:00.000Z',
  updatedAt: '2026-07-30T08:00:00.000Z',
  updatedByUserId: 3,
  lockedAt: null,
  deletedAt: null,
  deletedByUserId: null,
  createdBy: null,
}

const doRecord: TransportDocumentRecord = {
  ...record,
  id: 13,
  documentType: 'do',
  payload: {
    doNumber: 'DO 24/001',
    date: '2026-07-30',
    to: '',
    deliverTo: '',
    notifyParty: '',
    mblNumber: '',
    hblNumber: '',
    etd: '',
    eta: '',
    shipmentNumber: '',
    vesselVoyage: '',
    placeOfReceipt: '',
    portOfLoading: '',
    portOfDischarge: '',
    placeOfDelivery: '',
    finalDestination: '',
    serviceMode: '',
    cfsTerminal: '',
    note: '',
    marks: '',
    descriptionOfGoods: '',
    volume: '',
    customerAttention: '',
    containers,
    cargoRows: [],
  },
}

describe('transport document history actions', () => {
  it('opens a copied booking as a new record with the source flow', () => {
    expect(
      buildBookingCopyUrl({
        ...record,
        documentType: 'booking',
        bookingFlow: 'IMPORT',
      })
    ).toBe('/booking/documents/booking-confirmation?flow=IMPORT&copyFrom=12')
  })

  it('builds a safe PDF file name from the immutable record', () => {
    expect(buildHistoryDocumentFileName(record)).toBe(
      'Arrival-Notice-AN-24-001.pdf'
    )
  })

  it('maps the saved payload to labelled detail sections', () => {
    const sections = getHistoryDocumentSections(record)

    expect(sections[0]).toMatchObject({
      title: 'Identity',
      fields: [
        { label: 'Arrival Notice No.', value: 'AN 24/001' },
        { label: 'Date', value: '2026-07-30' },
      ],
    })
    expect(sections[1]).toMatchObject({
      title: 'Parties',
      fields: [
        { label: 'Shipper', value: expect.any(String) },
        { label: 'Consignee', value: expect.any(String) },
        { label: 'Notify Party', value: expect.any(String) },
        { label: 'Agent', value: 'SeaTrans' },
      ],
    })
    expect(sections.at(-1)).toMatchObject({
      title: 'Containers',
      containers,
    })
  })

  it('shows a Containers section (not legacy cargo rows) for Delivery Order', () => {
    const sections = getHistoryDocumentSections(doRecord)
    expect(sections.at(-1)).toMatchObject({
      title: 'Containers',
      containers,
    })
  })

  it('adds preview=1 for COMPLETED view-details navigation', () => {
    expect(getTransportDocumentDetailParams(record)).toEqual({
      recordId: '12',
    })
    expect(
      getTransportDocumentDetailParams({ ...record, status: 'COMPLETED' })
    ).toEqual({
      recordId: '12',
      preview: '1',
    })
    expect(
      buildTransportDocumentDetailUrl({ ...record, status: 'COMPLETED' })
    ).toBe('/booking/documents/arrival-notice?recordId=12&preview=1')
  })

  it('hides delete while locked and only lets admins unlock', () => {
    expect(
      getTransportDocumentRowCapabilities(record, {
        canLock: true,
        canUnlock: false,
        canHardDelete: true,
      })
    ).toMatchObject({
      canLock: true,
      canUnlock: false,
      showLocked: false,
      canDelete: true,
    })

    expect(
      getTransportDocumentRowCapabilities(
        { ...record, lockedAt: '2026-07-31T00:00:00.000Z' },
        {
          canLock: true,
          canUnlock: false,
          canHardDelete: true,
        }
      )
    ).toMatchObject({
      canLock: false,
      canUnlock: false,
      showLocked: true,
      canDelete: false,
    })

    expect(
      getTransportDocumentRowCapabilities(
        { ...record, lockedAt: '2026-07-31T00:00:00.000Z' },
        {
          canLock: true,
          canUnlock: true,
          canHardDelete: true,
        }
      )
    ).toMatchObject({
      canLock: false,
      canUnlock: true,
      showLocked: false,
      canDelete: false,
    })
  })
})
