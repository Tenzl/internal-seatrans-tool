import { API_CONFIG } from '@/shared/config/api.config'
import type { User } from '@/shared/types/dashboard'
import { apiClient } from '@/shared/utils/apiClient'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from './authService'

vi.mock('@/shared/utils/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const user = {
  id: 42,
  email: 'admin@seatrans.test',
  role: 'ROLE_ADMIN',
} as User

const cachedProfile = {
  id: 42,
  email: 'admin@seatrans.test',
  username: null,
  fullName: null,
  role: 'ROLE_ADMIN',
}

function jsonResponse<T>(
  data: T,
  options: { ok?: boolean; message?: string } = {}
): Response {
  const ok = options.ok ?? true
  return new Response(
    JSON.stringify({
      success: ok,
      message: options.message ?? (ok ? 'ok' : 'Unauthorized'),
      data: ok ? data : null,
    }),
    {
      status: ok ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

describe('authService browser session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
    })
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
    })
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: new MemoryStorage(),
      configurable: true,
    })
  })

  it('keeps one remembered profile copy while the JWT stays server-side', async () => {
    sessionStorage.setItem('auth_user', JSON.stringify({ id: 1 }))
    vi.mocked(apiClient.post).mockResolvedValue(jsonResponse({ user }) as never)

    const result = await authService.login('admin', 'password', true)

    expect(result.data?.user).toEqual(user)
    expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(cachedProfile))
    expect(sessionStorage.getItem('auth_user')).toBeNull()
    expect(apiClient.post).toHaveBeenCalledWith(
      API_CONFIG.AUTH.LOGIN,
      { identifier: 'admin', password: 'password', remember: true },
      { skipAuth: true }
    )
  })

  it('uses session storage when remember-me is disabled', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ id: 1 }))
    vi.mocked(apiClient.post).mockResolvedValue(jsonResponse({ user }) as never)

    await authService.login('admin', 'password', false)

    expect(sessionStorage.getItem('auth_user')).toBe(
      JSON.stringify(cachedProfile)
    )
    expect(localStorage.getItem('auth_user')).toBeNull()
  })

  it('clears cached profiles and calls the server logout endpoint', async () => {
    localStorage.setItem('auth_user', JSON.stringify(user))
    sessionStorage.setItem('auth_token', 'legacy')
    vi.mocked(apiClient.post).mockResolvedValue(new Response() as never)

    await authService.logout()

    expect(localStorage.getItem('auth_user')).toBeNull()
    expect(sessionStorage.getItem('auth_token')).toBeNull()
    expect(apiClient.post).toHaveBeenCalledWith(
      API_CONFIG.AUTH.LOGOUT,
      undefined,
      { skipAuth: true }
    )
  })

  it('fails closed and removes stale profile data on bootstrap 401', async () => {
    localStorage.setItem('auth_user', JSON.stringify(user))
    vi.mocked(apiClient.get).mockResolvedValue(
      jsonResponse(null, { ok: false }) as never
    )

    await expect(authService.getCurrentUser()).resolves.toMatchObject({
      success: false,
      data: null,
    })
    expect(localStorage.getItem('auth_user')).toBeNull()
  })

  it('keeps a fresh server session profile tab-scoped by default', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(jsonResponse(user) as never)

    await authService.getCurrentUser()

    expect(sessionStorage.getItem('auth_user')).toBe(
      JSON.stringify(cachedProfile)
    )
    expect(localStorage.getItem('auth_user')).toBeNull()
  })

  it('preserves remembered profile storage while refreshing the session', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ id: 1 }))
    vi.mocked(apiClient.get).mockResolvedValue(jsonResponse(user) as never)

    await authService.getCurrentUser()

    expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(cachedProfile))
    expect(sessionStorage.getItem('auth_user')).toBeNull()
  })

  it('does not persist section grants in browser storage', async () => {
    const withSections = {
      ...user,
      sections: ['epda-inquiry', 'content-posts'],
    } as User
    vi.mocked(apiClient.get).mockResolvedValue(
      jsonResponse(withSections) as never
    )

    const result = await authService.getCurrentUser()

    expect(result.data?.sections).toEqual(['epda-inquiry', 'content-posts'])
    expect(sessionStorage.getItem('auth_user')).toBe(
      JSON.stringify(cachedProfile)
    )
    expect(sessionStorage.getItem('auth_user')).not.toContain('sections')
  })
})
