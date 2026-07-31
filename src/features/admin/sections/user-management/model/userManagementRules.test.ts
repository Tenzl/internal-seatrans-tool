import { describe, expect, it } from 'vitest'
import {
  buildCreateUserInput,
  parseRequiredRoleId,
} from './userManagementRules'

describe('userManagementRules', () => {
  it('normalizes an internal user form into an API input', () => {
    expect(
      buildCreateUserInput({
        email: '  captain@seatrans.test ',
        username: ' captain ',
        fullName: ' Captain Tran ',
        password: 'password123',
        roleId: '7',
      })
    ).toEqual({
      ok: true,
      data: {
        email: 'captain@seatrans.test',
        username: 'captain',
        fullName: 'Captain Tran',
        password: 'password123',
        roleId: 7,
      },
    })
  })

  it('omits blank optional fields', () => {
    const result = buildCreateUserInput({
      email: 'admin@seatrans.test',
      username: ' ',
      fullName: '',
      password: 'password123',
      roleId: '2',
    })

    expect(result).toMatchObject({
      ok: true,
      data: {
        username: undefined,
        fullName: undefined,
      },
    })
  })

  it.each([
    ['', 'Email is required'],
    ['short', 'Password must be at least 8 characters'],
  ])('rejects invalid required values', (password, expectedError) => {
    const result = buildCreateUserInput({
      email: password ? 'admin@seatrans.test' : '',
      username: '',
      fullName: '',
      password,
      roleId: '1',
    })

    expect(result).toEqual({ ok: false, error: expectedError })
  })

  it.each(['', '0', '-1', 'Infinity', 'not-a-number'])(
    'rejects invalid role id %s',
    (roleId) => {
      expect(parseRequiredRoleId(roleId)).toEqual({
        ok: false,
        error: 'Select a role',
      })
    }
  )
})
