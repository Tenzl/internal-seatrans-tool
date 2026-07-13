import { useCallback, useState } from 'react'
import { resolveEffectiveParams } from '@/features/admin/components/invoice/resolveEffectiveParams'
import {
  quoteFormFromStored,
  usesQnPilotage,
} from '@/features/admin/components/invoice/epda/quoteFormFromArea'
import type {
  QuoteData,
  QuoteRow,
} from '@/modules/inquiries/components/common/quoteCommon'
import { extractParamsSnapshot } from '@/modules/inquiries/components/common/quoteParameters'
import { renderQuoteHtmlForVariant } from '@/modules/inquiries/components/common/quoteVariantRenderer'
import {
  formatCargoDescription,
  formatCheckMark,
  formatInvoiceDate,
} from '@/shared/utils/invoiceFormatters'

type NumericText = string | number | null

interface InvoicePreviewInquiry extends Record<string, unknown> {
  id?: string | number
  details?: string | null
  quoteForm?: string | null
  epdaSnapshot?: Record<string, unknown> | null
  submittedAt?: string | null
  toName?: string | null
  fullName?: string | null
  mv?: string | null
  dwt?: NumericText
  grt?: NumericText
  loa?: NumericText
  eta?: string | null
  cargoQuantity?: NumericText
  cargoName?: string | null
  cargoType?: string | null
  portOfCall?: string | null
  loadingPort?: string | null
  dischargingPort?: string | null
  deliveryTerm?: string | null
  frtTaxType?: string | null
  purposeOfCalling?: string | null
  transportLs?: string | number | null
  dischargeLoadingLocation?: string | null
  berthHours?: NumericText
  anchorageHours?: NumericText
  pilotage3rdMiles?: NumericText
  portId?: number | null
}

const normalizeKey = (key: string) =>
  key.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')

function normalizeDetails(raw?: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.entries(parsed).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[normalizeKey(key)] = value
      return acc
    }, {})
  } catch {
    return {}
  }
}

function pickValue(
  map: Record<string, unknown>,
  keys: string[],
  fallback?: string,
): string | undefined {
  for (const key of keys) {
    const value = map[normalizeKey(key)]
    if (value !== undefined && value !== null && value !== '') return String(value)
  }
  return fallback
}

function buildRows(value: unknown): QuoteRow[] {
  if (!Array.isArray(value)) return []

  return value.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row as QuoteRow

    const record = row as Record<string, unknown>
    const rawItem = record.item ?? record.name
    const rawAmount = record.amount ?? record.price
    return {
      ...record,
      item: rawItem == null ? undefined : String(rawItem),
      amount:
        typeof rawAmount === 'string' || typeof rawAmount === 'number'
          ? rawAmount
          : undefined,
    } as QuoteRow
  })
}

function mergeSnapshotPilotage(
  data: QuoteData,
  snapshot: Record<string, unknown> | null | undefined,
): QuoteData {
  if (!snapshot) return data
  if (snapshot.pilotage_miles != null && snapshot.pilotage_miles !== '') {
    return {
      ...data,
      pilotage_miles: snapshot.pilotage_miles as number | string,
      pilotage_third_miles: undefined,
    }
  }
  if (snapshot.pilotage_third_miles != null && snapshot.pilotage_third_miles !== '') {
    return {
      ...data,
      pilotage_third_miles: snapshot.pilotage_third_miles as number | string,
    }
  }
  return data
}

function buildQuoteData(inquiry: InvoicePreviewInquiry): QuoteData {
  const map = normalizeDetails(inquiry.details)
  const quoteForm = quoteFormFromStored(inquiry.quoteForm)
  const port = inquiry.portOfCall || inquiry.loadingPort || inquiry.dischargingPort

  return {
    to_shipowner: inquiry.toName || inquiry.fullName || undefined,
    date: pickValue(map, ['quote_date', 'date'], formatInvoiceDate(inquiry.submittedAt)),
    ref: pickValue(map, ['ref', 'reference', 'quotation_ref'], `INQ-${inquiry.id}`),
    mv: inquiry.mv ?? undefined,
    dwt: inquiry.dwt?.toString(),
    grt: inquiry.grt?.toString(),
    loa: inquiry.loa?.toString(),
    eta: inquiry.eta ? formatInvoiceDate(inquiry.eta) : 'TBN',
    cargo_qty_mt: inquiry.cargoQuantity?.toString(),
    cargo_name_upper: formatCargoDescription(
      inquiry.cargoName ?? undefined,
      inquiry.cargoType ?? undefined,
    ),
    cargo_type: inquiry.cargoType?.toUpperCase(),
    port_upper: port?.toUpperCase(),
    loading_term: inquiry.frtTaxType || inquiry.deliveryTerm || undefined,
    purpose_of_calling: inquiry.purposeOfCalling ?? undefined,
    transport_ls: inquiry.transportLs ?? undefined,
    at_anchorage: inquiry.dischargeLoadingLocation?.toLowerCase().includes('anchorage')
      ? 'x'
      : formatCheckMark(pickValue(map, ['at_anchorage', 'anchorage'])),
    at_berth: inquiry.dischargeLoadingLocation?.toLowerCase().includes('berth')
      ? 'x'
      : formatCheckMark(pickValue(map, ['at_berth', 'berth'])),
    total_a: pickValue(map, ['total_a', 'aa_total']),
    total_b: pickValue(map, ['total_b', 'bb_total']),
    grand_total: pickValue(map, ['grand_total', 'total']),
    bank_name: pickValue(map, ['bank_name']),
    bank_address: pickValue(map, ['bank_address']),
    beneficiary: pickValue(map, ['beneficiary']),
    usd_account: pickValue(map, ['usd_account', 'account_number']),
    swift: pickValue(map, ['swift', 'swift_code']),
    AA_ROWS: buildRows(map.aa_rows),
    BB_ROWS: buildRows(map.bb_rows),
    berth_hours: inquiry.berthHours ?? 96,
    anchorage_hours: inquiry.anchorageHours ?? 24,
    pilotage_miles: usesQnPilotage(quoteForm)
      ? inquiry.pilotage3rdMiles ?? 5
      : undefined,
    pilotage_third_miles: usesQnPilotage(quoteForm)
      ? undefined
      : inquiry.pilotage3rdMiles ?? 17,
  }
}

export function useInvoicePreview() {
  const [quoteTemplate, setQuoteTemplate] = useState<string | null>(null)
  const [quoteHtml, setQuoteHtml] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ensureQuoteTemplate = useCallback(async () => {
    if (quoteTemplate) return quoteTemplate

    const response = await fetch('/templates/quote.html')
    if (!response.ok) throw new Error('Template not found')
    const text = await response.text()
    setQuoteTemplate(text)
    return text
  }, [quoteTemplate])

  const generateInvoicePreview = useCallback(
    async (inquiry: InvoicePreviewInquiry) => {
      setIsLoading(true)
      setError(null)

      try {
        const template = await ensureQuoteTemplate()
        const quoteForm = quoteFormFromStored(inquiry.quoteForm)
        const quoteData = mergeSnapshotPilotage(
          buildQuoteData(inquiry),
          inquiry.epdaSnapshot,
        )
        const params =
          extractParamsSnapshot(inquiry.epdaSnapshot) ??
          (await resolveEffectiveParams(
            quoteForm,
            inquiry.portOfCall || inquiry.loadingPort || inquiry.dischargingPort,
            inquiry.portId,
          ))

        const html = renderQuoteHtmlForVariant(quoteForm, template, {
          ...quoteData,
          params,
        })
        setQuoteHtml(html)
        return html
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Failed to load invoice template'
        setError(message)
        throw caught
      } finally {
        setIsLoading(false)
      }
    },
    [ensureQuoteTemplate],
  )

  const clearPreview = useCallback(() => {
    setQuoteHtml(null)
    setError(null)
  }, [])

  return {
    quoteHtml,
    isLoading,
    error,
    generateInvoicePreview,
    clearPreview,
  }
}
