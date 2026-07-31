import type { CreateInternalUserInput } from '../api/adminUsersService'

export type CreateUserFormValues = {
  email: string
  username: string
  fullName: string
  password: string
  roleId: string
}

type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string }

export function parseRequiredRoleId(value: string): ValidationResult<number> {
  const roleId = Number(value)
  if (!Number.isFinite(roleId) || roleId <= 0) {
    return { ok: false, error: 'Select a role' }
  }
  return { ok: true, data: roleId }
}

export function buildCreateUserInput(
  values: CreateUserFormValues
): ValidationResult<CreateInternalUserInput> {
  const email = values.email.trim()
  if (!email) {
    return { ok: false, error: 'Email is required' }
  }
  if (values.password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' }
  }

  const role = parseRequiredRoleId(values.roleId)
  if (!role.ok) {
    return role
  }

  return {
    ok: true,
    data: {
      email,
      username: values.username.trim() || undefined,
      fullName: values.fullName.trim() || undefined,
      password: values.password,
      roleId: role.data,
    },
  }
}
