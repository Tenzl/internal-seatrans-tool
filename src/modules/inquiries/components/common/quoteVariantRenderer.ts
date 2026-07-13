import type { QuoteFormVariant } from '@/features/admin/components/invoice/epda/quoteFormFromArea'
import { renderQuoteHtml as renderHcm } from './Quote-hcm'
import { renderQuoteHtml as renderHn } from './Quote-hn'
import { renderQuoteHtml as renderQn } from './Quote-qn'
import type { QuoteData } from './quoteCommon'

type QuoteRenderer = (template: string, data: QuoteData) => string

const QUOTE_RENDERERS: Record<QuoteFormVariant, QuoteRenderer> = {
  HCM: renderHcm,
  HN: renderHn,
  QN: renderQn,
}

export function renderQuoteHtmlForVariant(
  variant: QuoteFormVariant,
  template: string,
  data: QuoteData,
) {
  return QUOTE_RENDERERS[variant](template, data)
}
