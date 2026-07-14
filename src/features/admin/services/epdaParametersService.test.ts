import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import { apiClient } from '@/shared/utils/apiClient'
import { epdaParametersService } from './epdaParametersService'

vi.mock('@/shared/utils/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('epdaParametersService.getEffective', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
  })

  it('keeps the Chân Mây port override instead of falling back to area defaults', async () => {
    const parameters = defaultParameterValues('QN')
    parameters.hours.berthHours = 137
    parameters.garbage.atBerthUsd = 4321

    vi.mocked(apiClient.get).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: parameters,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    const controller = new AbortController()
    const result = await epdaParametersService.getEffective(undefined, 38, controller.signal)

    expect(apiClient.get).toHaveBeenCalledWith(
      '/admin/epda-parameters/effective?portId=38',
      { signal: controller.signal },
    )
    expect(result.hours.berthHours).toBe(137)
    expect(result.garbage.atBerthUsd).toBe(4321)
  })

  it('rejects legacy area aliases before making an API request', async () => {
    await expect(
      epdaParametersService.getEffective('MIDDLE' as never),
    ).rejects.toThrow('Invalid EPDA area: MIDDLE')

    expect(apiClient.get).not.toHaveBeenCalled()
  })
})
