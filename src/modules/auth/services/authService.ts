import { API_CONFIG } from '@/shared/config/api.config'
import type { User } from '@/shared/types/dashboard'
import { apiClient } from '@/shared/utils/apiClient'

interface LoginRequest {
  identifier: string
  password: string
  remember: boolean
}

interface AuthSessionResponse {
  user: User
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
}

type LoginResponse = ApiResponse<AuthSessionResponse>

const USER_KEY = 'auth_user'
const LEGACY_TOKEN_KEY = 'auth_token'
const LEGACY_TEMPLATE_COOKIE = 'thisisjustarandomstring'

const canUseStorage = (): boolean => typeof window !== 'undefined'

function clearBrowserSession(): void {
  if (!canUseStorage()) return
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(USER_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
  sessionStorage.removeItem(LEGACY_TOKEN_KEY)
  if (typeof document !== 'undefined') {
    document.cookie = `${LEGACY_TEMPLATE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  }
}

function persistAuthUser(user: User, remember: boolean): void {
  if (!canUseStorage()) return
  // Keep exactly one profile copy so session storage cannot shadow local storage.
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(USER_KEY)
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(USER_KEY, JSON.stringify(user))
}

function readAuthUser(): User | null {
  if (!canUseStorage()) return null
  const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    clearBrowserSession()
    return null
  }
}

function refreshStoredUser(user: User): void {
  if (!canUseStorage()) return
  // Preserve the login choice. A fresh server session defaults to tab-scoped
  // storage so opening another tab cannot silently enable remember-me.
  const remember = localStorage.getItem(USER_KEY) !== null
  persistAuthUser(user, remember)
}

export const authService = {
  async login(
    identifier: string,
    password: string,
    remember = true
  ): Promise<LoginResponse> {
    try {
      const response = await apiClient.post(
        API_CONFIG.AUTH.LOGIN,
        { identifier, password, remember } satisfies LoginRequest,
        { skipAuth: true }
      )
      const result = (await response.json()) as LoginResponse

      if (!response.ok || !result.success || !result.data) {
        return {
          success: false,
          message: result.message || 'Login failed',
          data: null,
        }
      }

      // The JWT stays in the backend HttpOnly cookie; only profile data is cached.
      persistAuthUser(result.data.user, remember)
      return result
    } catch (error) {
      clearBrowserSession()
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        data: null,
      }
    }
  },

  async logout(): Promise<void> {
    clearBrowserSession()
    try {
      await apiClient.post(API_CONFIG.AUTH.LOGOUT, undefined, {
        skipAuth: true,
      })
    } catch {
      // Local state must still be cleared when the session endpoint is offline.
    }
  },

  getUser(): User | null {
    return readAuthUser()
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      // Bootstrap 401 is normal and must not trigger apiClient's redirect loop.
      const response = await apiClient.get(API_CONFIG.AUTH.ME, {
        skipAuth: true,
      })
      const result = (await response.json()) as ApiResponse<User>

      if (!response.ok || !result.success || !result.data) {
        clearBrowserSession()
        return {
          success: false,
          message: result.message || 'Unable to fetch current user',
          data: null,
        }
      }

      refreshStoredUser(result.data)
      return result
    } catch (error) {
      clearBrowserSession()
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        data: null,
      }
    }
  },
}
