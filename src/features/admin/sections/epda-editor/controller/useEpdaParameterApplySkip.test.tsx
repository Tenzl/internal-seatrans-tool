// @vitest-environment jsdom
import { defaultParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import { epdaParametersService } from '@/modules/inquiries/services/epdaParametersService'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEpdaParameterApplySkip } from './useEpdaParameterApplySkip'

const tMock = vi.hoisted(() => (key: string) => key)

vi.mock(
  '@/modules/inquiries/services/epdaParametersService',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/modules/inquiries/services/epdaParametersService')
      >()
    return {
      ...actual,
      epdaParametersService: {
        ...actual.epdaParametersService,
        getEffective: vi.fn(),
      },
    }
  }
)

vi.mock('@/shared/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: tMock }),
}))

vi.mock('@/shared/utils/toast', () => ({
  toast: { error: vi.fn() },
}))

describe('useEpdaParameterApplySkip', () => {
  beforeEach(() => {
    vi.mocked(epdaParametersService.getEffective).mockReset()
  })

  it('invalidates old-port tariffs and applies the new port effective parameters', async () => {
    const oldParams = defaultParameterValues('HCM')
    const newParams = defaultParameterValues('QN')
    newParams.hours.berthHours = 88
    vi.mocked(epdaParametersService.getEffective).mockImplementation(
      async (_area, portId) => (portId === 38 ? newParams : oldParams)
    )

    const setEffectiveParams = vi.fn()
    const setFrozenParams = vi.fn()
    const setWorkingParams = vi.fn()
    const options = {
      linkedInquiryId: 10,
      isLocked: false,
      isHydrating: false,
      selectedArea: '1' as '1' | '2',
      selectedPortId: 1,
      isLoadingPorts: false,
      workingParams: oldParams,
      workingParamsReady: true,
      effectiveParams: oldParams,
      frozenParams: null,
      hourFields: {
        berthHours: String(oldParams.hours.berthHours),
        anchorageHours: String(oldParams.hours.anchorageHours),
        pilotageThirdMiles: '',
        qnPilotageMiles: '',
        garbageUsdRate: String(oldParams.garbage.atBerthUsd),
        dischargeLoadingLocation: 'At Berth',
      },
      hourSetters: {
        setBerthHours: vi.fn(),
        setAnchorageHours: vi.fn(),
        setGarbageUsdRate: vi.fn(),
      },
      setEffectiveParams,
      setFrozenParams,
      setWorkingParams,
    }

    const { result, rerender } = renderHook(
      (props: typeof options) => useEpdaParameterApplySkip(props),
      { initialProps: options }
    )

    await waitFor(() =>
      expect(epdaParametersService.getEffective).toHaveBeenCalledTimes(1)
    )

    act(() => {
      rerender({ ...options, selectedArea: '2', selectedPortId: 38 })
    })

    await waitFor(() =>
      expect(epdaParametersService.getEffective).toHaveBeenCalledWith(
        undefined,
        38
      )
    )
    await waitFor(() =>
      expect(setWorkingParams).toHaveBeenCalledWith(newParams)
    )

    expect(setWorkingParams.mock.calls[0]?.[0]).toBeNull()
    expect(setEffectiveParams).toHaveBeenLastCalledWith(newParams)
    expect(setFrozenParams).toHaveBeenLastCalledWith(null)
    expect(result.current.paramDiffDialogOpen).toBe(false)
    expect(result.current.isParamDecisionPending).toBe(false)
  })
})
