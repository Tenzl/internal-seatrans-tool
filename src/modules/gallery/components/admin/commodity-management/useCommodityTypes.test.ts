// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  commodityService,
  type CommodityAdminServiceSlug,
} from '@/modules/gallery/services/commodityService'
import { toast } from '@/shared/utils/toast'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCommodityTypes } from './useCommodityTypes'

const commodityServiceMock = vi.hoisted(() => ({
  resolveServiceTypeId: vi.fn(),
  listCommodityTypes: vi.fn(),
  createCommodityType: vi.fn(),
  updateCommodityType: vi.fn(),
  deleteCommodityType: vi.fn(),
  list: vi.fn(),
  listGroups: vi.fn(),
}))

vi.mock('@/modules/gallery/services/commodityService', () => ({
  commodityService: commodityServiceMock,
}))

vi.mock('@/shared/utils/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const shippingType = {
  id: 1,
  serviceTypeId: 1,
  name: 'Bulk',
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
}

function testWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

describe('useCommodityTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    commodityServiceMock.resolveServiceTypeId.mockImplementation(
      async (slug: string) => (slug === 'shipping-agency' ? 1 : 2)
    )
    commodityServiceMock.listCommodityTypes.mockImplementation(
      async (serviceTypeId: number) =>
        serviceTypeId === 1
          ? [shippingType]
          : [
              {
                id: 2,
                serviceTypeId: 2,
                name: 'Ocean',
                createdAt: '2026-08-19T00:00:00.000Z',
                updatedAt: '2026-08-19T00:00:00.000Z',
              },
            ]
    )
    commodityServiceMock.createCommodityType.mockResolvedValue(shippingType)
    commodityServiceMock.updateCommodityType.mockResolvedValue(shippingType)
    commodityServiceMock.deleteCommodityType.mockResolvedValue(undefined)
  })

  it('reloads Types by resolved Service ID when Service changes', async () => {
    const { wrapper } = testWrapper()
    const initialProps: { serviceSlug: CommodityAdminServiceSlug } = {
      serviceSlug: 'shipping-agency',
    }
    const { result, rerender } = renderHook(
      ({ serviceSlug }: { serviceSlug: CommodityAdminServiceSlug }) =>
        useCommodityTypes(serviceSlug),
      {
        initialProps,
        wrapper,
      }
    )

    await waitFor(() => expect(result.current.types).toEqual([shippingType]))
    expect(commodityService.listCommodityTypes).toHaveBeenCalledWith(
      1,
      expect.any(AbortSignal)
    )

    rerender({ serviceSlug: 'freight-forwarding' })

    await waitFor(() => expect(result.current.serviceTypeId).toBe(2))
    await waitFor(() =>
      expect(commodityService.listCommodityTypes).toHaveBeenCalledWith(
        2,
        expect.any(AbortSignal)
      )
    )
    expect(commodityService.list).not.toHaveBeenCalled()
    expect(commodityService.listGroups).not.toHaveBeenCalled()
  })

  it('performs Type CRUD without invalidating or mutating Commodity data', async () => {
    const { wrapper, queryClient } = testWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCommodityTypes('shipping-agency'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.serviceTypeId).toBe(1))

    await act(async () => {
      expect(await result.current.createType({ name: ' In Bags ' })).toBe(true)
    })
    expect(commodityService.createCommodityType).toHaveBeenCalledWith({
      serviceTypeId: 1,
      name: 'In Bags',
    })

    await act(async () => {
      expect(
        await result.current.updateType(1, {
          name: ' Bulk cargo ',
        })
      ).toBe(true)
      expect(await result.current.deleteType(1)).toBe(true)
    })

    expect(commodityService.updateCommodityType).toHaveBeenCalledWith(1, {
      serviceTypeId: 1,
      name: 'Bulk cargo',
    })
    expect(commodityService.deleteCommodityType).toHaveBeenCalledWith(1, 1)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['admin', 'commodity-types', 'shipping-agency'],
    })
    expect(invalidate).toHaveBeenCalledTimes(3)
    expect(
      invalidate.mock.calls.every(
        ([filters]) =>
          JSON.stringify(filters?.queryKey) ===
          JSON.stringify(['admin', 'commodity-types', 'shipping-agency'])
      )
    ).toBe(true)
    expect(commodityService.list).not.toHaveBeenCalled()
    expect(commodityService.listGroups).not.toHaveBeenCalled()
  })

  it('reports a duplicate-name API failure and keeps Type state independent', async () => {
    commodityServiceMock.createCommodityType.mockRejectedValue(
      new Error('Type already exists')
    )
    const { wrapper } = testWrapper()
    const { result } = renderHook(() => useCommodityTypes('shipping-agency'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.types).toEqual([shippingType]))

    await act(async () => {
      expect(await result.current.createType({ name: 'Bulk' })).toBe(false)
    })

    expect(toast.error).toHaveBeenCalledWith(
      'Type already exists',
      expect.any(Error)
    )
    expect(result.current.types).toEqual([shippingType])
    expect(commodityService.list).not.toHaveBeenCalled()
    expect(commodityService.listGroups).not.toHaveBeenCalled()
  })

  it('does not show an error toast when React Query aborts an obsolete request', async () => {
    const abort = new Error('signal is aborted without reason')
    abort.name = 'AbortError'
    commodityServiceMock.resolveServiceTypeId.mockRejectedValue(abort)
    const { wrapper } = testWrapper()
    const { result } = renderHook(
      () => useCommodityTypes('freight-forwarding'),
      { wrapper }
    )

    await waitFor(() => expect(result.current.error).toBe(abort))
    expect(toast.error).not.toHaveBeenCalled()
  })
})
