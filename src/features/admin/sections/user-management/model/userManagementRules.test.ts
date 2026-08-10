import { describe, expect, it } from 'vitest'
import {
  buildCreateUserInput,
  buildUpdateUserProfileInput,
  parseRequiredRoleId,
} from './userManagementRules'

describe('userManagementRules', () => {
  it('normalizes an internal user form into an API input', () => {
    expect(
      buildCreateUserInput({
        email: '  captain@seatrans.test ',
        username: ' captain ',
        fullName: ' Captain Tran ',
        companyEmail: ' ops@seatrans.test ',
        password: 'password123',
        roleId: '7',
      })
    ).toEqual({
      ok: true,
      data: {
        email: 'captain@seatrans.test',
        username: 'captain',
        fullName: 'Captain Tran',
        companyEmail: 'ops@seatrans.test',
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
      companyEmail: '',
      password: 'password123',
      roleId: '2',
    })

    expect(result).toMatchObject({
      ok: true,
      data: {
        username: undefined,
        fullName: undefined,
        companyEmail: undefined,
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
      companyEmail: '',
      password,
      roleId: '1',
    })

    expect(result).toEqual({ ok: false, error: expectedError })
  })

  it('builds a profile update payload', () => {
    expect(
      buildUpdateUserProfileInput({
        email: '  ops@seatrans.test ',
        username: ' ops ',
        fullName: ' Ops Lead ',
        companyEmail: ' desk@seatrans.test ',
      })
    ).toEqual({
      ok: true,
      data: {
        email: 'ops@seatrans.test',
        username: 'ops',
        fullName: 'Ops Lead',
        companyEmail: 'desk@seatrans.test',
      },
    })
  })

  it('rejects blank email and short username on profile update', () => {
    expect(
      buildUpdateUserProfileInput({
        email: ' ',
        username: '',
        fullName: 'A',
        companyEmail: '',
      })
    ).toEqual({ ok: false, error: 'Email is required' })

    expect(
      buildUpdateUserProfileInput({
        email: 'a@b.co',
        username: 'ab',
        fullName: 'A',
        companyEmail: '',
      })
    ).toEqual({
      ok: false,
      error: 'Username must be at least 3 characters',
    })
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
