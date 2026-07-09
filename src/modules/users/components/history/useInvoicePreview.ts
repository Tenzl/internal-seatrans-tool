import { useState, useCallback } from 'react'
import {
  renderQuoteHtml as renderQuoteHtmlHcm,
  type QuoteData as HcmQuoteData,
  type QuoteRow as HcmQuoteRow,
} from '@/modules/inquiries/components/common/Quote-hcm'
import {
  renderQuoteHtml as renderQuoteHtmlHn,
} from '@/modules/inquiries/components/common/Quote-hn'
import {
  renderQuoteHtml as renderQuoteHtmlQn,
  type QuoteData as QnQuoteData,
  type QuoteRow as QnQuoteRow,
} from '@/modules/inquiries/components/common/Quote-qn'
import { formatInvoiceDate, formatCheckMark, formatCargoDescription } from '@/shared/utils/invoiceFormatters'
import { resolveEffectiveParams } from '@/features/admin/components/invoice/resolveEffectiveParams'
import { quoteFormFromStored, usesQnPilotage } from '@/features/admin/components/invoice/epda/quoteFormFromArea'
import { extractParamsSnapshot } from '@/modules/inquiries/components/common/quoteParameters'

// Use a unified type compatible with all quote renderers
type QuoteRow = HcmQuoteRow & QnQuoteRow
type QuoteData = HcmQuoteData & QnQuoteData

export function useInvoicePreview() {
  const [quoteTemplate, setQuoteTemplate] = useState<string | null>(null)
  const [quoteHtml, setQuoteHtml] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')

  const normalizeDetails = (raw?: string) => {
    if (!raw) return {} as Record<string, unknown>
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return Object.entries(parsed).reduce<Record<string, unknown>>((acc, [k, v]) => {
        acc[normalizeKey(k)] = v
        return acc
      }, {})
    } catch (err) {
      console.warn('Could not parse inquiry details', err)
      return {} as Record<string, unknown>
    }
  }

  const pickValue = (map: Record<string, unknown>, keys: string[], fallback?: string) => {
    for (const key of keys) {
      const value = map[normalizeKey(key)]
      if (value !== undefined && value !== null && value !== '') {
        return String(value)
      }
    }
    return fallback
  }

  const buildRows = (value?: unknown) => {
    if (!Array.isArray(value)) return [] as QuoteRow[]

    return value.map((row: any) => {
      if (row && typeof row === 'object') {
        const item = row.item ?? row.name
        const amount = row.amount ?? row.price
        return {
          ...row,
          item,
          amount,
        } as QuoteRow
      }
      return row as QuoteRow
    })
  }

  const mergeSnapshotPilotage = (data: QuoteData, snap: Record<string, unknown> | null | undefined): QuoteData => {
    if (!snap) return data
    if (snap.pilotage_miles != null && snap.pilotage_miles !== '') {
      return { ...data, pilotage_miles: snap.pilotage_miles as number | string, pilotage_third_miles: undefined }
    }
    if (snap.pilotage_third_miles != null && snap.pilotage_third_miles !== '') {
      return { ...data, pilotage_third_miles: snap.pilotage_third_miles as number | string }
    }
    return data
  }

  const buildQuoteData = (inquiry: any): QuoteData => {
    const map = normalizeDetails(inquiry.details)
    const quoteForm = quoteFormFromStored(inquiry.quoteForm)

    const data: QuoteData = {
      to_shipowner: inquiry.toName || inquiry.fullName,
      date: pickValue(map, ['quote_date', 'date'], formatInvoiceDate(inquiry.submittedAt)),
      ref: pickValue(map, ['ref', 'reference', 'quotation_ref'], `INQ-${inquiry.id}`),
      mv: inquiry.mv,
      dwt: inquiry.dwt?.toString(),
      grt: inquiry.grt?.toString(),
      loa: inquiry.loa?.toString(),
      eta: inquiry.eta ? formatInvoiceDate(inquiry.eta) : 'TBN',
      cargo_qty_mt: inquiry.cargoQuantity?.toString(),
      cargo_name_upper: formatCargoDescription(inquiry.cargoName, inquiry.cargoType),
      cargo_type: inquiry.cargoType?.toUpperCase(),
      port_upper: (inquiry.portOfCall || inquiry.loadingPort || inquiry.dischargingPort)?.toUpperCase(),
      loading_term: inquiry.frtTaxType || inquiry.deliveryTerm,
      purpose_of_calling: inquiry.purposeOfCalling,
      transport_ls: inquiry.transportLs,
      at_anchorage: inquiry.dischargeLoadingLocation?.toLowerCase().includes('anchorage') ? 'x' : formatCheckMark(pickValue(map, ['at_anchorage', 'anchorage'])),
      at_berth: inquiry.dischargeLoadingLocation?.toLowerCase().includes('berth') ? 'x' : formatCheckMark(pickValue(map, ['at_berth', 'berth'])),
      total_a: pickValue(map, ['total_a', 'aa_total']),
      total_b: pickValue(map, ['total_b', 'bb_total']),
      grand_total: pickValue(map, ['grand_total', 'total']),
      bank_name: pickValue(map, ['bank_name']),
      bank_address: pickValue(map, ['bank_address']),
      beneficiary: pickValue(map, ['beneficiary']),
      usd_account: pickValue(map, ['usd_account', 'account_number']),
      swift: pickValue(map, ['swift', 'swift_code']),
      AA_ROWS: buildRows(map['aa_rows']),
      BB_ROWS: buildRows(map['bb_rows']),
      berth_hours: inquiry.berthHours ?? 96,
      anchorage_hours: inquiry.anchorageHours ?? 24,
      pilotage_miles: usesQnPilotage(quoteForm) ? inquiry.pilotage3rdMiles ?? 5 : undefined,
      pilotage_third_miles: usesQnPilotage(quoteForm) ? undefined : inquiry.pilotage3rdMiles ?? 17,
    }

    return data
  }

  const ensureQuoteTemplate = async () => {
    if (quoteTemplate) return quoteTemplate

    const res = await fetch('/templates/quote.html')
    if (!res.ok) throw new Error('Template not found')
    const text = await res.text()
    setQuoteTemplate(text)
    return text
  }

  const generateInvoicePreview = useCallback(async (inquiry: any) => {
    setIsLoading(true)
    setError(null)

    try {
      const template = await ensureQuoteTemplate()

      const quoteForm = quoteFormFromStored(inquiry.quoteForm)
      const renderer =
        quoteForm === 'QN'
          ? renderQuoteHtmlQn
          : quoteForm === 'HN'
            ? renderQuoteHtmlHn
            : renderQuoteHtmlHcm

      const snap = inquiry.epdaSnapshot as Record<string, unknown> | null | undefined
      const quoteData = mergeSnapshotPilotage(buildQuoteData(inquiry), snap)

      const params =
        extractParamsSnapshot(inquiry.epdaSnapshot) ??
        (await resolveEffectiveParams(
          quoteForm === 'QN' ? 'QN' : 'HCM',
          inquiry.portOfCall || inquiry.loadingPort || inquiry.dischargingPort,
        ))

      const html = renderer(template, { ...quoteData, params })
      setQuoteHtml(html)

      return html
    } catch (err) {
      console.error('Failed to generate invoice preview:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load invoice template'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [quoteTemplate])

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
