/** Admin inquiry row returned by the shipping-agency EPDA endpoints. */
export type InquiryParty = {
  id: number
  fullName: string | null
  email: string | null
}

export type ShippingAgencyAdminInquiry = {
  id: number
  userId?: number
  fullName?: string | null
  email?: string | null
  phone?: string | null
  company?: string | null
  notes?: string | null
  status?: string
  submittedAt?: string
  createdSource?: string | null
  employeeInCharge?: InquiryParty | null
  clientSubmittedBy?: InquiryParty | null
  toName?: string | null
  mv?: string | null
  eta?: string | null
  dwt?: string | number | null
  grt?: string | number | null
  loa?: string | number | null
  commodityTypeId?: number | null
  cargoType?: string | null
  cargoName?: string | null
  cargoNameOther?: string | null
  cargoQuantity?: string | number | null
  portId?: number | null
  portOfCall?: string | null
  dischargeLoadingLocation?: string | null
  frtTaxType?: string | null
  purposeOfCalling?: string | null
  boatHireAmount?: string | number | null
  tallyFeeAmount?: string | number | null
  tugAssistanceAmount?: string | number | null
  tugAssistanceTrips?: string | number | null
  shorecraneHireUsdPerMt?: string | number | null
  transportLs?: string | null
  transportQuarantine?: string | null
  quoteForm?: string | null
  berthHours?: string | number | null
  anchorageHours?: string | number | null
  pilotage3rdMiles?: string | number | null
  epdaDocumentDate?: string | null
  shipType?: string | null
  shipownerNationality?: string | null
  oceanFrtRateUsdPerMt?: string | number | null
  garbageUsdRate?: string | number | null
  quarantineCargoMode?: string | null
  agencyFeeMode?: string | null
  agencyDiscountPercent?: string | number | null
  agencyLumpsumAmount?: string | number | null
  /** Custom fee lines under in-lumpsum mode: `{ name, amount }[]`. */
  agencyOtherExpenses?: Array<{ name: string; amount: number | string }> | null
  epdaSnapshot?: Record<string, unknown> | null
  /**
   * Soft-snapshot of tariff params for unlocked drafts (Apply/Skip baseline).
   * Shape matches EpdaParameterValues JSON.
   */
  epdaWorkingParams?: Record<string, unknown> | null
  /** ISO timestamp; when set, edits are locked and the quote uses snapshot params. */
  epdaLockedAt?: string | null
  customerSubmittedSnapshot?: Record<string, string> | null
}

export type EpdaApiPayload = Record<string, unknown>

export type InquiryFieldChangeLogEntry = {
  id: number
  inquiryId: number
  /** EPDA_ISSUE is historical only (issue-to-customer removed). */
  action:
    | 'EPDA_CREATE'
    | 'EPDA_SAVE_DRAFT'
    | 'EPDA_ISSUE'
    | 'EPDA_LOCK'
    | 'EPDA_UNLOCK'
  fieldName: string
  previousValue: string | null
  newValue: string | null
  createdAt: string
  changedBy: {
    id: number
    fullName: string | null
    email: string | null
  }
}
