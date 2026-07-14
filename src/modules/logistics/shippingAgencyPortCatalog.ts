import { portService, type Port, type PortArea } from '@/modules/logistics/services/portService'
import type { AreaOption } from '@/features/admin/components/invoice/epdaFormParameters'
import { isPortAreaCode } from '@/shared/domain/portArea'

const AREAS: PortArea[] = ['1', '2', '3']

const normalizePortKey = (value: string) => value.trim().toUpperCase()

/** Find area + port list for a stored inquiry port (canonical `portOfCall` when in catalog). */
export async function findPortSelectionFromInquiry(
  portOfCall: string | null | undefined,
  portId?: number | null,
): Promise<{ area: AreaOption | ''; ports: Port[]; portId: number | null; portOfCall: string }> {
  const stored = portOfCall?.trim() ?? ''

  if (portId != null && Number.isInteger(portId) && portId > 0) {
    try {
      const canonicalPort = await portService.getPortById(portId)
      const area = String(canonicalPort.provinceArea ?? '')
      if (isPortAreaCode(area)) {
        const ports = await portService.getPortsByArea(area)
        const selected = ports.find((port) => port.id === portId) ?? canonicalPort
        return {
          area,
          ports,
          portId,
          portOfCall: (selected.portOfCall || selected.name).trim(),
        }
      }
    } catch {
      // Older records may point to a removed port. Name matching below remains
      // a read-only recovery path; new saves still require a canonical id.
    }
  }

  if (!stored) {
    return { area: '', ports: [], portId: null, portOfCall: '' }
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
      return {
        area: String(area) as AreaOption,
        ports,
        portId: matched.id,
        portOfCall: matched.portOfCall.trim(),
      }
    }
  }

  return { area: '', ports: [], portId: null, portOfCall: stored }
}
