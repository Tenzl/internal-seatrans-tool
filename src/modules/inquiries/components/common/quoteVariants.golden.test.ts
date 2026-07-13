import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { QuoteData } from './quoteCommon'
import { renderQuoteHtmlForVariant } from './quoteVariantRenderer'

const template = [
  'AA={{AA_ROWS}}', 'BB={{BB_ROWS}}', 'A={{total_a}}', 'B={{total_b}}',
  'G={{grand_total}}', 'PORT={{port_upper}}', 'LOA={{loa}}',
].join('\n')

const fixture: QuoteData = {
  to_shipowner: 'OWNER', mv: 'SEA', dwt: '12000', grt: '8000', loa: '99.93',
  cargo_qty_mt: '15000', cargo_name_upper: 'WOOD CHIPS', cargo_type: 'IN_BULK',
  ship_type: 'BULK_SHIP', purpose_of_calling: 'NHAP_XUAT', port_upper: 'PORT',
  loading_term: 'Export - Freight rate declaration', ocean_frt_rate_usd_per_mt: 16,
  berth_hours: 96, anchorage_hours: 24, pilotage_miles: 5, pilotage_third_miles: 47,
  quarantine_cargo_trips: 2, agency_fee_mode: 'TARRIF_AGENCY',
  agency_discount_percent: 10, transport_ls: 250, boat_hire_entry: 100,
  garbage_usd_rate: 70, garbage_cbm_amount: 2, at_berth: 'X',
}

function signature(html: string) {
  const totals = Object.fromEntries(
    ['A', 'B', 'G'].map((key) => [key, html.match(new RegExp(`^${key}=([^\\n]+)`, 'm'))?.[1]]),
  )
  const rowOrder = Array.from(html.matchAll(/<span class="bold">([^<]+)<\/span>/g), (match) => match[1])
  return {
    sha256: createHash('sha256').update(html).digest('hex'),
    totals,
    rowOrder,
  }
}

describe('EPDA quote variant golden output', () => {
  it.each(['HCM', 'HN', 'QN'] as const)('%s preserves formula totals and row numbering', (variant) => {
    expect(signature(renderQuoteHtmlForVariant(variant, template, fixture))).toMatchSnapshot()
  })
})
