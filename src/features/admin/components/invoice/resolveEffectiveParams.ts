import { portService } from '@/modules/logistics/services/portService'
import { epdaParametersService } from '@/features/admin/services/epdaParametersService'
import {
  defaultParameterValues,
  type EpdaParameterValues,
  type QuoteVariant,
} from '@/modules/inquiries/components/common/quoteParameters'

/**
 * Resolve the effective EPDA parameter set for a saved inquiry, given its quote
 * variant and port name. The variant maps to candidate areas (QN → 2/MIDDLE,
 * HCM → 3/SOUTHERN then 1/NORTHERN); the port name is matched within those areas
 * to find the owning area + port id, then the backend merges area + group + port.
 *
 * Falls back to the built-in defaults if the port can't be matched or the API is
 * unavailable, so rendering never breaks.
 */
export async function resolveEffectiveParams(
  variant: QuoteVariant,
  portName?: string | null,
  portId?: number | null,
): Promise<EpdaParameterValues> {
  const areas: readonly ('1' | '2' | '3')[] =
    variant === 'QN'
      ? ['2']
      : variant === 'HN'
        ? ['1']
        : ['3', '1']
  try {
    if (portId != null && Number.isInteger(portId) && portId > 0) {
      return await epdaParametersService.getEffective(areas[0], portId)
    }

    const target = (portName ?? '').trim().toLowerCase()
    if (target) {
      for (const area of areas) {
        const ports = await portService.getPortsByArea(area)
        const match = ports.find((p) => {
          const name = p.name?.trim().toLowerCase() ?? ''
          const call = p.portOfCall?.trim().toLowerCase() ?? ''
          return name === target || call === target
        })
        if (match) {
          return await epdaParametersService.getEffective(area, match.id)
        }
      }
    }
    return await epdaParametersService.getEffective(areas[0])
  } catch {
    return defaultParameterValues(variant)
  }
}
