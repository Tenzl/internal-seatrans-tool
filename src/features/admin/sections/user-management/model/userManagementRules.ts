import type { CreateInternalUserInput } from '../api/adminUsersService'

export type CreateUserFormValues = {
  email: string
  username: string
  fullName: string
  companyEmail: string
  password: string
  roleId: string
}

export type EditUserFormValues = {
  email: string
  username: string
  fullName: string
  companyEmail: string
}

export type UpdateUserProfileInput = {
  email: string
  username: string | null
  fullName: string
  companyEmail: string | null
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
      companyEmail: values.companyEmail.trim() || undefined,
      password: values.password,
      roleId: role.data,
    },
  }
}

export function buildUpdateUserProfileInput(
  values: EditUserFormValues
): ValidationResult<UpdateUserProfileInput> {
  const email = values.email.trim()
  if (!email) {
    return { ok: false, error: 'Email is required' }
  }

  const username = values.username.trim()
  if (username && username.length < 3) {
    return { ok: false, error: 'Username must be at least 3 characters' }
  }

  return {
    ok: true,
    data: {
      email,
      username: username || null,
      fullName: values.fullName.trim(),
      companyEmail: values.companyEmail.trim() || null,
    },
  }
}
