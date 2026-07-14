import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getPortById, getPortsByArea } = vi.hoisted(() => ({
  getPortById: vi.fn(),
  getPortsByArea: vi.fn(),
}))

vi.mock('@/modules/logistics/services/portService', () => ({
  portService: { getPortById, getPortsByArea },
}))

import { findPortSelectionFromInquiry } from './shippingAgencyPortCatalog'

describe('findPortSelectionFromInquiry', () => {
  beforeEach(() => {
    getPortById.mockReset()
    getPortsByArea.mockReset()
  })

  it('prefers canonical portId when a stored display name is stale', async () => {
    getPortById.mockResolvedValue({
      id: 38,
      name: 'Chan May',
      portOfCall: 'CHAN MAY',
      provinceId: 7,
      provinceArea: 2,
    })
    getPortsByArea.mockResolvedValue([
      { id: 38, name: 'Chan May', portOfCall: 'CHAN MAY', provinceId: 7 },
    ])

    const selection = await findPortSelectionFromInquiry('LEGACY PORT NAME', 38)

    expect(getPortById).toHaveBeenCalledWith(38)
    expect(getPortsByArea).toHaveBeenCalledWith('2')
    expect(selection).toMatchObject({ area: '2', portId: 38, portOfCall: 'CHAN MAY' })
  })
})
