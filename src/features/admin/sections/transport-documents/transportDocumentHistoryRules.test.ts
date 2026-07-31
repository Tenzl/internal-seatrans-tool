import { describe, expect, it } from 'vitest'
import type { TransportDocumentRecord } from './transportDocument.types'
import {
  buildHistoryDocumentFileName,
  buildTransportDocumentDetailUrl,
  getHistoryDocumentSections,
  getTransportDocumentDetailParams,
  getTransportDocumentRowCapabilities,
} from './transportDocumentHistoryRules'

const cargoRows = [
  {
    containerSealNumber: 'CONT-1',
    quantity: '2',
    descriptionOfGoods: 'Parts',
    grossWeight: '100',
    measurement: '1',
  },
]

const record: TransportDocumentRecord = {
  id: 12,
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
    etdEta: '',
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
    volume: '',
    customerAttention: '',
    cargoRows,
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

describe('transport document history actions', () => {
  it('builds a safe PDF file name from the immutable record', () => {
    expect(buildHistoryDocumentFileName(record)).toBe('AN-AN-24-001.pdf')
  })

  it('maps the saved payload to labelled detail sections', () => {
    const sections = getHistoryDocumentSections(record)

    expect(sections[0]).toMatchObject({
      title: 'Document',
      fields: [
        { label: 'Agent', value: 'SeaTrans' },
        { label: 'Date', value: '2026-07-30' },
        { label: 'AN No.', value: 'AN 24/001' },
      ],
    })
    expect(sections.at(-1)).toMatchObject({
      title: 'Cargo rows',
      cargoRows,
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

  it('exposes lock / archive / delete capabilities by role', () => {
    expect(
      getTransportDocumentRowCapabilities(record, {
        canLock: true,
        canArchive: true,
        canHardDelete: false,
      })
    ).toMatchObject({
      canLock: true,
      showLocked: false,
      canArchive: true,
      canDelete: false,
    })

    expect(
      getTransportDocumentRowCapabilities(
        { ...record, lockedAt: '2026-07-31T00:00:00.000Z' },
        { canLock: true, canArchive: false, canHardDelete: true }
      )
    ).toMatchObject({
      canLock: false,
      showLocked: true,
      canArchive: false,
      canDelete: true,
    })
  })
})
