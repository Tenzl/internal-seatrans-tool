import { describe, expect, it } from 'vitest'
import type { User } from '@/shared/types/dashboard'
import { getRoleGroup, isInternalStaff } from './auth'

const user = (role: string, roleGroup?: User['roleGroup']): User => ({
  id: 1,
  email: 'staff@example.com',
  fullName: 'Staff',
  role,
  roleGroup,
})

describe('dashboard role groups', () => {
  it('trusts the backend INTERNAL group for custom operations roles', () => {
    const operations = user('OPERATIONS', 'INTERNAL')

    expect(getRoleGroup(operations)).toBe('INTERNAL')
    expect(isInternalStaff(operations)).toBe(true)
  })

  it('does not promote an explicitly EXTERNAL account from a misleading role name', () => {
    const external = user('CUSTOMER_ADMIN', 'EXTERNAL')

    expect(getRoleGroup(external)).toBe('EXTERNAL')
    expect(isInternalStaff(external)).toBe(false)
  })
})
