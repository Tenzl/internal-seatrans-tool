import { commodityService } from '@/modules/gallery/services/commodityService'
import { apiClient } from '@/shared/utils/apiClient'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { packageTypeService } from './packageTypeService'

vi.mock('@/modules/gallery/services/commodityService', () => ({
  commodityService: {
    resolveServiceTypeId: vi.fn(),
    listCommodityTypes: vi.fn(),
  },
}))

vi.mock('@/shared/utils/apiClient', () => ({
  apiClient: { get: vi.fn() },
}))

describe('packageTypeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(commodityService.resolveServiceTypeId).mockResolvedValue(2)
    vi.mocked(commodityService.listCommodityTypes).mockResolvedValue([
      {
        id: 81,
        serviceTypeId: 2,
        name: 'PALLETS',
        createdAt: '2026-08-20T00:00:00.000Z',
        updatedAt: '2026-08-20T00:00:00.000Z',
      },
      {
        id: 82,
        serviceTypeId: 2,
        name: 'CRATE(S)',
        createdAt: '2026-08-20T00:00:00.000Z',
        updatedAt: '2026-08-20T00:00:00.000Z',
      },
    ])
  })

  it('uses Freight Forwarding Type rows as BL Package Type options', async () => {
    const controller = new AbortController()

    await expect(
      packageTypeService.listActive(controller.signal)
    ).resolves.toEqual([
      {
        id: 81,
        code: 'PALLETS',
        displayName: 'PALLETS',
        isActive: true,
        sortOrder: 0,
      },
      {
        id: 82,
        code: 'CRATE(S)',
        displayName: 'CRATE(S)',
        isActive: true,
        sortOrder: 1,
      },
    ])

    expect(commodityService.resolveServiceTypeId).toHaveBeenCalledWith(
      'freight-forwarding',
      controller.signal
    )
    expect(commodityService.listCommodityTypes).toHaveBeenCalledWith(
      2,
      controller.signal
    )
    expect(apiClient.get).not.toHaveBeenCalled()
  })
})
