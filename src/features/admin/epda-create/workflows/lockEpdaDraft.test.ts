import { describe, expect, it, vi } from 'vitest'
import { lockEpdaDraft } from './lockEpdaDraft'

describe('lockEpdaDraft', () => {
  it('persists current fields before locking the immutable snapshot', async () => {
    const calls: string[] = []
    const updateEpda = vi.fn(async () => { calls.push('patch'); return { id: 7 } })
    const lockEpda = vi.fn(async () => { calls.push('lock'); return { id: 7, epdaLockedAt: 'now' } })

    await lockEpdaDraft(
      { inquiryId: 7, patch: { vesselName: 'SEA' }, snapshot: { mv: 'SEA' } },
      { updateEpda, lockEpda },
    )

    expect(calls).toEqual(['patch', 'lock'])
    expect(updateEpda).toHaveBeenCalledWith(7, { vesselName: 'SEA' })
    expect(lockEpda).toHaveBeenCalledWith(7, { mv: 'SEA' })
  })
})
