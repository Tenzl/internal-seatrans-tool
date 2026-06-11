import type { DashboardSection } from '@/shared/config/dashboard-registry'

const EPDA_INQUIRY_DETAIL_SECTION = 'shipping-agency-inquiry-detail' as const

/** Query keys only valid on the shipping-agency inquiry detail screen */
const EPDA_DETAIL_ONLY_PARAMS = ['inquiryId', 'from'] as const

export function buildDashboardUrl(
  pathname: string,
  section: DashboardSection,
  extra?: Record<string, string | number | null | undefined>,
): string {
  const params = new URLSearchParams()
  params.set('section', section)

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined || value === null || value === '') continue
      if (
        section !== EPDA_INQUIRY_DETAIL_SECTION &&
        EPDA_DETAIL_ONLY_PARAMS.includes(key as (typeof EPDA_DETAIL_ONLY_PARAMS)[number])
      ) {
        continue
      }
      params.set(key, String(value))
    }
  }

  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function isShippingAgencyInquiryDetailSection(section: string | null | undefined): boolean {
  return section === EPDA_INQUIRY_DETAIL_SECTION
}
