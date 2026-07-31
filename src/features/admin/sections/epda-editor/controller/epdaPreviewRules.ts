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

export function shouldRefreshPreviewParameters({
  isLocked,
  hasFrozenParams,
  hasSelectedArea,
}: {
  isLocked: boolean
  hasFrozenParams: boolean
  hasSelectedArea: boolean
}) {
  return !isLocked && !hasFrozenParams && hasSelectedArea
}
