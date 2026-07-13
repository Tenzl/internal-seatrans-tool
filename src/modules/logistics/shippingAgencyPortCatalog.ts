import { portService, type Port, type PortArea } from '@/modules/logistics/services/portService'
import type { AreaOption } from '@/features/admin/components/invoice/epdaFormParameters'

const AREAS: PortArea[] = [1, 2, 3]

const normalizePortKey = (value: string) => value.trim().toUpperCase()

/** Find area + port list for a stored inquiry port (canonical `portOfCall` when in catalog). */
export async function findPortSelectionFromInquiry(
  portOfCall: string | null | undefined,
): Promise<{ area: AreaOption | ''; ports: Port[]; portOfCall: string }> {
  const stored = portOfCall?.trim() ?? ''
  if (!stored) {
    return { area: '', ports: [], portOfCall: '' }
  }

  const key = normalizePortKey(stored)

  for (const area of AREAS) {
    const ports = await portService.getPortsByArea(area)
    const matched = ports.find(
      (p) =>
        (p.portOfCall?.trim() && normalizePortKey(p.portOfCall) === key) ||
        (p.name?.trim() && normalizePortKey(p.name) === key),
    )
    if (matched?.portOfCall) {
      return { area: String(area) as AreaOption, ports, portOfCall: matched.portOfCall.trim() }
    }
  }

  return { area: '', ports: [], portOfCall: stored }
}
