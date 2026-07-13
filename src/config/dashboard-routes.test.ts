import { describe, expect, it } from 'vitest'
import {
  CANONICAL_CREATE_EPDA_PATH,
  LEGACY_CREATE_EPDA_PATH,
  canonicalizeDashboardPath,
} from './dashboard-routes'
import { canAccessPath } from './section-catalog'

describe('dashboard route policy', () => {
  const operator = { role: 'ROLE_OPERATOR', sections: ['epda-create'] }

  it('allows granted mapped routes and denies unmapped authenticated routes', () => {
    expect(canAccessPath(CANONICAL_CREATE_EPDA_PATH, operator)).toBe(true)
    expect(canAccessPath('/tasks', operator)).toBe(false)
    expect(canAccessPath(LEGACY_CREATE_EPDA_PATH, operator)).toBe(false)
  })

  it('keeps admin access while denying anonymous access by default', () => {
    expect(canAccessPath('/tasks', { role: 'ROLE_ADMIN' })).toBe(true)
    expect(canAccessPath(CANONICAL_CREATE_EPDA_PATH, null)).toBe(false)
  })

  it('canonicalizes the legacy Create EPDA URL', () => {
    expect(canonicalizeDashboardPath(LEGACY_CREATE_EPDA_PATH)).toBe(
      CANONICAL_CREATE_EPDA_PATH,
    )
    expect(canonicalizeDashboardPath(CANONICAL_CREATE_EPDA_PATH)).toBe(
      CANONICAL_CREATE_EPDA_PATH,
    )
  })
})
