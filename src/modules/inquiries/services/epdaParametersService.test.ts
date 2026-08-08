import { defaultParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import { apiClient } from '@/shared/utils/apiClient'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  epdaParametersService,
  planPortOverrideWrite,
  type EpdaParameterSet,
} from './epdaParametersService'

vi.mock('@/shared/utils/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/utils/apiClient')>()
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  }
})

describe('epdaParametersService.getEffective', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.put).mockReset()
    vi.mocked(apiClient.delete).mockReset()
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
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const controller = new AbortController()
    const result = await epdaParametersService.getEffective(
      undefined,
      38,
      controller.signal
    )

    expect(apiClient.get).toHaveBeenCalledWith(
      '/admin/epda-parameters/effective?portId=38',
      { signal: controller.signal }
    )
    expect(result.hours.berthHours).toBe(137)
    expect(result.garbage.atBerthUsd).toBe(4321)
  })

  it('rejects legacy area aliases before making an API request', async () => {
    await expect(
      epdaParametersService.getEffective('MIDDLE' as never)
    ).rejects.toThrow('Invalid EPDA area: MIDDLE')

    expect(apiClient.get).not.toHaveBeenCalled()
  })
})

describe('epdaParametersService optimistic writes', () => {
  beforeEach(() => {
    vi.mocked(apiClient.put).mockReset()
    vi.mocked(apiClient.delete).mockReset()
  })

  it('sends the expected version when replacing a port override', async () => {
    vi.mocked(apiClient.put).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 9,
            scope: 'PORT',
            area: '2',
            portId: 38,
            values: { coeff: { clearanceFee: 75 } },
            version: 4,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await epdaParametersService.upsertPort(
      38,
      { coeff: { clearanceFee: 75 } },
      3
    )

    expect(apiClient.put).toHaveBeenCalledWith(
      '/admin/epda-parameters/port/38',
      {
        values: { coeff: { clearanceFee: 75 } },
        expectedVersion: 3,
      }
    )
  })

  it('sends the expected version when deleting a port override', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(
      new Response(null, { status: 204 })
    )

    await epdaParametersService.deletePort(38, 7)

    expect(apiClient.delete).toHaveBeenCalledWith(
      '/admin/epda-parameters/port/38?expectedVersion=7'
    )
  })

  it('sends the expected version for area and group updates', async () => {
    vi.mocked(apiClient.put).mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 1,
            scope: 'AREA',
            area: '2',
            portId: null,
            values: {},
            version: 6,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    })

    await epdaParametersService.upsertArea('2', {}, 5)
    await epdaParametersService.setGroupMembers(8, [38], 11)

    expect(apiClient.put).toHaveBeenNthCalledWith(
      1,
      '/admin/epda-parameters/area/2',
      { values: {}, expectedVersion: 5 }
    )
    expect(apiClient.put).toHaveBeenNthCalledWith(
      2,
      '/admin/epda-parameters/groups/8/members',
      { portIds: [38], expectedVersion: 11 }
    )
  })

  it('surfaces a reload message on a stale write', async () => {
    vi.mocked(apiClient.put).mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'EPDA_PARAMETER_VERSION_CONFLICT',
          currentVersion: 5,
        }),
        { status: 409, headers: { 'content-type': 'application/json' } }
      )
    )

    await expect(
      epdaParametersService.upsertPort(38, { coeff: { clearanceFee: 75 } }, 4)
    ).rejects.toThrow('Reload the latest values')
  })

  it('drops stale non-finite scalars and sends valid decimal changes', async () => {
    vi.mocked(apiClient.put).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 9,
            scope: 'PORT',
            area: '2',
            portId: 38,
            values: {},
            version: 4,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await epdaParametersService.upsertPort(
      38,
      {
        hours: { berthHours: Number.NaN },
        coeff: {
          tonnagePerGrt: Number.NaN,
          pilotageSingleRate: '0.005' as unknown as number,
        },
      },
      3
    )

    expect(apiClient.put).toHaveBeenCalledWith(
      '/admin/epda-parameters/port/38',
      {
        values: { coeff: { pilotageSingleRate: 0.005 } },
        expectedVersion: 3,
      }
    )
  })
})

describe('planPortOverrideWrite', () => {
  const existing = {
    id: 9,
    scope: 'PORT',
    area: '2',
    portId: 38,
    values: { coeff: { clearanceFee: 75 } },
    version: 7,
  } as EpdaParameterSet

  it('deletes an existing override when the diff becomes empty', () => {
    expect(planPortOverrideWrite({}, existing)).toEqual({
      action: 'delete',
      expectedVersion: 7,
    })
  })

  it('does not call the API when an absent override has an empty diff', () => {
    expect(planPortOverrideWrite({}, undefined)).toEqual({ action: 'none' })
  })

  it('creates a new override with expectedVersion null', () => {
    const values = { coeff: { clearanceFee: 75 } }
    expect(planPortOverrideWrite(values, undefined)).toEqual({
      action: 'upsert',
      values,
      expectedVersion: null,
    })
  })
})
