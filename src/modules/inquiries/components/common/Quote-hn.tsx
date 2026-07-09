import { renderQuoteHtml as renderQuoteHtmlHcm, type QuoteData } from './Quote-hcm'

export type { QuoteData, QuoteRow } from './Quote-hcm'

/**
 * Area 1 (HN) quote — HCM port-charge layout with QN single-rate pilotage.
 * Dedicated renderer; do not route Area 1 through Quote-hcm directly.
 */
export const renderQuoteHtml = (template: string, data: QuoteData) => {
  const hnData: QuoteData = {
    ...data,
    pilotage_miles: data.pilotage_miles ?? data.pilotage_third_miles ?? 5,
    pilotage_third_miles: undefined,
  }
  return renderQuoteHtmlHcm(template, hnData)
}
