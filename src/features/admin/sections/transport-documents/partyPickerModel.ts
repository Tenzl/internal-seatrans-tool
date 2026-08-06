import type {
  PartnerOption,
  PartnerOptionPage,
} from '../partner-management/partnerManagementService'

const clean = (value: string | null | undefined) =>
  value?.replace(/\s+/g, ' ').trim() ?? ''

/** Partner name only — Booking Confirmation Client. */
export function formatPartyNameValue(option: PartnerOption): string {
  return clean(option.name)
}

export function formatPartyDocumentValue(option: PartnerOption): string {
  const address = clean(option.address)
  const location = [clean(option.city), clean(option.country)]
    .filter(
      (part) =>
        part.length > 0 && !address.toLowerCase().includes(part.toLowerCase())
    )
    .join(', ')
  const contact = [
    option.phone ? `TEL: ${clean(option.phone)}` : '',
    option.fax ? `FAX: ${clean(option.fax)}` : '',
  ]
    .filter(Boolean)
    .join('  ')

  return [clean(option.name), address, location, contact]
    .filter(Boolean)
    .join('\n')
}

export type PartyValueMode = 'full' | 'name'

export function formatPartyFieldValue(
  option: PartnerOption,
  mode: PartyValueMode = 'full'
): string {
  return mode === 'name'
    ? formatPartyNameValue(option)
    : formatPartyDocumentValue(option)
}

export function mergePartyOptionPages(
  pages: PartnerOptionPage[] | undefined
): PartnerOption[] {
  const byId = new Map<number, PartnerOption>()
  pages?.forEach((page) => {
    page.content.forEach((option) => byId.set(option.id, option))
  })
  return [...byId.values()]
}

export function getNextPartyOptionPage(
  page: PartnerOptionPage
): number | undefined {
  return page.hasNext ? page.page + 1 : undefined
}
