import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getEffective, getPortsByArea } = vi.hoisted(() => ({
  getEffective: vi.fn(),
  getPortsByArea: vi.fn(),
}))

vi.mock('@/features/admin/services/epdaParametersService', () => ({
  epdaParametersService: { getEffective },
}))

vi.mock('@/modules/logistics/services/portService', () => ({
  portService: { getPortsByArea },
}))

import { resolveEffectiveParams } from './resolveEffectiveParams'

describe('resolveEffectiveParams', () => {
  beforeEach(() => {
    getEffective.mockReset()
    getPortsByArea.mockReset()
    getEffective.mockResolvedValue({ marker: 'effective' })
  })

  it('uses the canonical port override despite an exact-name miss and preserves the HN area', async () => {
    await resolveEffectiveParams('HN', 'legacy name that does not match the catalog', 38)

    expect(getEffective).toHaveBeenCalledWith('1', 38)
    expect(getPortsByArea).not.toHaveBeenCalled()
  })

  it('keeps name lookup as a fallback for legacy inquiries without a port id', async () => {
    getPortsByArea.mockResolvedValue([{ id: 21, name: 'Quy Nhon', portOfCall: 'QUY NHON' }])

    await resolveEffectiveParams('QN', 'QUY NHON')

    expect(getPortsByArea).toHaveBeenCalledWith('2')
    expect(getEffective).toHaveBeenCalledWith('2', 21)
  })
})
