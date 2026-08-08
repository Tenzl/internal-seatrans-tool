export type EpdaQuoteForm = 'HCM' | 'QN' | 'HN'

export function buildEpdaExportFileName({
  inquiryId,
  quoteForm,
  date,
}: {
  inquiryId?: number | null
  quoteForm: EpdaQuoteForm
  date: Date
}) {
  if (inquiryId) return `EPDA_inquiry_${inquiryId}.html`
  return `EPDA_${quoteForm}_${date.toISOString().slice(0, 10)}.html`
}

/**
 * Preview must not silently pull live tariffs into the PDF.
 * Linked drafts go through the Apply/Skip diff table first; create/edit uses the
 * form's current `effectiveParams` (already loaded for the selected port/area).
 */
export function shouldRefreshPreviewParameters(_input: {
  isLocked: boolean
  hasFrozenParams: boolean
  hasSelectedArea: boolean
}) {
  return false
}
