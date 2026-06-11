import { portService } from '@/modules/logistics/services/portService'
import { epdaParametersService } from '@/features/admin/services/epdaParametersService'
import {
  defaultParameterValues,
  type EpdaParameterValues,
  type QuoteVariant,
} from '@/modules/inquiries/components/common/quoteParameters'

/**
 * Resolve the effective EPDA parameter set for a saved inquiry, given its quote
 * variant and port name. The variant maps to candidate areas (QN → MIDDLE,
 * HCM → NORTHERN/SOUTHERN); the port name is matched within those areas to find
 * the owning area + port id, then the backend merges area set + port override.
 *
 * Falls back to the built-in defaults if the port can't be matched or the API is
 * unavailable, so rendering never breaks.
 */
export async function resolveEffectiveParams(
  variant: QuoteVariant,
  portName?: string | null,
): Promise<EpdaParameterValues> {
  const areas = variant === 'QN' ? ['MIDDLE'] : ['NORTHERN', 'SOUTHERN']
  try {
    const target = (portName ?? '').trim().toLowerCase()
    if (target) {
      for (const area of areas) {
        const ports = await portService.getPortsByArea(area)
        const match = ports.find((p) => p.name.trim().toLowerCase() === target)
        if (match) return await epdaParametersService.getEffective(area, match.id)
      }
    }
    return await epdaParametersService.getEffective(areas[0])
  } catch {
    return defaultParameterValues(variant)
  }
}
