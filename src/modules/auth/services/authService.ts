import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import type { User } from '@/shared/types/dashboard'

interface LoginRequest {
  identifier: string
  password: string
}

interface AuthResponse {
  token: string
  type: string
  user: User
}

interface LoginResponse {
  success: boolean
  message: string
  data: AuthResponse | null
}

interface SignupRequest {
  password: string
  email: string
  fullName: string
  phone?: string
  company?: string
}

interface SignupResponse {
  success: boolean
  message: string
  data: AuthResponse | null
}

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
}

const USER_KEY = 'auth_user'

const canUseStorage = (): boolean => typeof window !== 'undefined'

const persistAuthUser = (user: User, remember = true) => {
  if (!canUseStorage()) return
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(USER_KEY, JSON.stringify(user))
}

const clearAuth = () => {
  if (!canUseStorage()) return
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(USER_KEY)

  // Back-compat (older builds)
  localStorage.removeItem('auth_token')
  sessionStorage.removeItem('auth_token')

  // Clear cookie
  if (typeof document !== 'undefined') {
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure;'
  }
}

const readUser = (): string | null => {
  if (!canUseStorage()) return null
  return sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY)
}

const getActiveStorage = (): Storage => {
  if (!canUseStorage()) {
    throw new Error('Storage is only available in the browser')
  }
  // No token storage anymore; pick session if it has user, else local.
  return sessionStorage.getItem(USER_KEY) ? sessionStorage : localStorage
}

export const authService = {
  login: async (identifier: string, password: string, remember = true): Promise<LoginResponse> => {
    try {
      // Skip auth for login endpoint
      const response = await apiClient.post(API_CONFIG.AUTH.LOGIN, 
        { identifier, password } satisfies LoginRequest,
        { skipAuth: true }
      )

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Login failed',
          data: null,
        }
      }

      // Persist only the non-sensitive user profile. The JWT session lives in an
      // HttpOnly cookie set by the backend — never store the token in JS (XSS-safe).
      if (data.success && data.data) {
        persistAuthUser(data.data.user, remember)
      }

      return {
        success: data.success,
        message: data.message,
        data: data.data,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        data: null,
      }
    }
  },

  logout: async () => {
    clearAuth()
    try {
      await apiClient.post(API_CONFIG.AUTH.LOGOUT, undefined, { skipAuth: true })
    } catch {
      // best-effort: cookie may already be cleared/expired
    }
  },

  // Session is an HttpOnly cookie (not readable from JS). Kept for legacy callers.
  getToken: (): string | null => null,

  getUser: (): User | null => {
    const user = readUser()
    if (!user) return null
    try {
      return JSON.parse(user) as User
    } catch {
      return null
    }
  },

  isAuthenticated: () => {
    return !!readUser()
  },

  register: async (email: string, fullName: string, password: string, phone?: string, company?: string): Promise<SignupResponse> => {
    try {
      // Skip auth for register endpoint
      const response = await apiClient.post(API_CONFIG.AUTH.REGISTER,
        { email, fullName, password, phone, company } as SignupRequest,
        { skipAuth: true }
      )

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Registration failed',
          data: null,
        }
      }

      // Persist only the non-sensitive user profile — the JWT session lives in an
      // HttpOnly cookie set by the backend (same as login; never store it in JS).
      if (data.success && data.data) {
        persistAuthUser(data.data.user, true)
      }

      return {
        success: data.success,
        message: data.message,
        data: data.data,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        data: null,
      }
    }
  },

  // Auth is cookie-based; keep a stable helper signature for legacy callers.
  getAuthHeader: (): Record<string, string> => ({} as Record<string, string>),

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    try {
      // apiClient will automatically handle 401 and logout
      const response = await apiClient.get(API_CONFIG.AUTH.ME)

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Unable to fetch current user',
          data: null,
        }
      }

      if (result?.data && canUseStorage()) {
        const storage = getActiveStorage()
        storage.setItem(USER_KEY, JSON.stringify(result.data))
      }

      return {
        success: result.success,
        message: result.message,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        data: null,
      }
    }
  },

  updateProfile: async (_userId: number, _data: Partial<User>): Promise<ApiResponse<User>> => ({
    success: false,
    message: 'Deprecated: use updateMyProfile instead.',
    data: null,
  }),

  updateMyProfile: async (data: Pick<User, 'fullName' | 'phone' | 'company'>): Promise<ApiResponse<User>> => {
    try {
      const response = await apiClient.patch(API_CONFIG.AUTH.ME, data)
      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Unable to update profile',
          data: null,
        }
      }

      if (result?.data && canUseStorage()) {
        const storage = getActiveStorage()
        storage.setItem(USER_KEY, JSON.stringify(result.data))
      }

      return {
        success: result.success,
        message: result.message,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        data: null,
      }
    }
  },
}
 
