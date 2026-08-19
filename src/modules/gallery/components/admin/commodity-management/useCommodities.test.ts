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
import { useCommodities } from './useCommodities'

const commodityServiceMock = vi.hoisted(() => ({
  resolveServiceTypeId: vi.fn(),
  listAdminCommodities: vi.fn(),
  createCommodity: vi.fn(),
  updateCommodity: vi.fn(),
  deleteCommodity: vi.fn(),
  listCommodityTypes: vi.fn(),
  listGroups: vi.fn(),
}))

vi.mock('@/modules/gallery/services/commodityService', () => ({
  commodityService: commodityServiceMock,
}))

vi.mock('@/shared/utils/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const riceCommodity = {
  id: 19,
  serviceTypeId: 1,
  name: 'PKE',
  displayName: 'Rice',
  description: null,
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

describe('useCommodities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const serviceIds: Record<string, number> = {
      'shipping-agency': 1,
      'freight-forwarding': 2,
      chartering: 3,
      logistics: 4,
    }
    commodityServiceMock.resolveServiceTypeId.mockImplementation(
      async (slug: string) => serviceIds[slug]
    )
    commodityServiceMock.listAdminCommodities.mockImplementation(
      async (serviceTypeId: number) =>
        serviceTypeId === 1
          ? [riceCommodity]
          : [
              {
                id: 19 + serviceTypeId,
                serviceTypeId,
                name: `SERVICE_${serviceTypeId}`,
                displayName: `Service ${serviceTypeId} commodity`,
                description: null,
              },
            ]
    )
    commodityServiceMock.createCommodity.mockResolvedValue(riceCommodity)
    commodityServiceMock.updateCommodity.mockResolvedValue(riceCommodity)
    commodityServiceMock.deleteCommodity.mockResolvedValue(undefined)
  })

  it('reloads Commodities when dynamic Service IDs 3 and 4 are selected', async () => {
    const { wrapper } = testWrapper()
    const initialProps: { serviceSlug: CommodityAdminServiceSlug } = {
      serviceSlug: 'shipping-agency',
    }
    const { result, rerender } = renderHook(
      ({ serviceSlug }: { serviceSlug: CommodityAdminServiceSlug }) =>
        useCommodities(serviceSlug),
      { initialProps, wrapper }
    )

    await waitFor(() =>
      expect(result.current.commodities).toEqual([riceCommodity])
    )
    expect(commodityService.listAdminCommodities).toHaveBeenCalledWith(
      1,
      expect.any(AbortSignal)
    )

    rerender({ serviceSlug: 'chartering' })

    await waitFor(() => expect(result.current.serviceTypeId).toBe(3))
    await waitFor(() =>
      expect(commodityService.listAdminCommodities).toHaveBeenCalledWith(
        3,
        expect.any(AbortSignal)
      )
    )

    rerender({ serviceSlug: 'logistics' })

    await waitFor(() => expect(result.current.serviceTypeId).toBe(4))
    await waitFor(() =>
      expect(commodityService.listAdminCommodities).toHaveBeenCalledWith(
        4,
        expect.any(AbortSignal)
      )
    )
    expect(commodityService.listCommodityTypes).not.toHaveBeenCalled()
    expect(commodityService.listGroups).not.toHaveBeenCalled()
  })

  it('sends quota-free independent CRUD and invalidates only Commodity data', async () => {
    const { wrapper, queryClient } = testWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCommodities('shipping-agency'), {
      wrapper,
    })
    await waitFor(() => expect(result.current.serviceTypeId).toBe(1))

    await act(async () => {
      expect(
        await result.current.createCommodity({
          displayName: ' Rice ',
          description: ' Food ',
        })
      ).toBe(true)
      expect(
        await result.current.updateCommodity(19, {
          displayName: 'Rice cargo',
          description: '',
        })
      ).toBe(true)
      expect(await result.current.deleteCommodity(19)).toBe(true)
    })

    expect(commodityService.createCommodity).toHaveBeenCalledWith({
      serviceTypeId: 1,
      displayName: 'Rice',
      description: 'Food',
    })
    expect(commodityService.updateCommodity).toHaveBeenCalledWith(19, {
      serviceTypeId: 1,
      displayName: 'Rice cargo',
      description: undefined,
    })
    expect(commodityService.deleteCommodity).toHaveBeenCalledWith(19)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['admin', 'commodities', 'shipping-agency'],
    })
    expect(commodityService.listCommodityTypes).not.toHaveBeenCalled()
    expect(commodityService.listGroups).not.toHaveBeenCalled()
  })

  it('surfaces API failures without mutating the Commodity list', async () => {
    commodityServiceMock.deleteCommodity.mockRejectedValue(
      new Error('Commodity is currently in use')
    )
    const { wrapper } = testWrapper()
    const { result } = renderHook(() => useCommodities('shipping-agency'), {
      wrapper,
    })
    await waitFor(() =>
      expect(result.current.commodities).toEqual([riceCommodity])
    )

    await act(async () => {
      expect(await result.current.deleteCommodity(19)).toBe(false)
    })

    expect(toast.error).toHaveBeenCalledWith(
      'Commodity is currently in use',
      expect.any(Error)
    )
    expect(result.current.commodities).toEqual([riceCommodity])
  })

  it('does not show an error toast when React Query aborts an obsolete request', async () => {
    const abort = new Error('signal is aborted without reason')
    abort.name = 'AbortError'
    commodityServiceMock.resolveServiceTypeId.mockRejectedValue(abort)
    const { wrapper } = testWrapper()
    const { result } = renderHook(() => useCommodities('freight-forwarding'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.error).toBe(abort))
    expect(toast.error).not.toHaveBeenCalled()
  })
})
