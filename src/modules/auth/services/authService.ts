import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import { User } from '@/shared/types/dashboard'

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

const persistAuthToken = (token: string, remember = true) => {
  if (typeof document === 'undefined') return
  const expires = remember ? `max-age=${60 * 60 * 24};` : ''
  document.cookie = `auth_token=${token}; path=/; ${expires} SameSite=Lax; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`
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

      // Save token and user to localStorage
      if (data.success && data.data) {
        persistAuthUser(data.data.user, remember)
        persistAuthToken(data.data.token, remember)
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

  getToken: () => {
    return null
  },

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

      // Save token and user to localStorage
      if (data.success && data.data) {
        persistAuthUser(data.data.user, true)
        persistAuthToken(data.data.token, true)
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

  getGoogleAuthUrl: async (): Promise<{ success: boolean; authUrl?: string; message?: string }> => {
    try {
      const response = await apiClient.get(API_CONFIG.AUTH.GOOGLE_OAUTH, { skipAuth: true })
      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Google login is unavailable',
        }
      }

      const authUrl = data.data?.authUrl as string | undefined
      if (!authUrl) {
        return {
          success: false,
          message: 'Google login is not configured',
        }
      }

      return { success: true, authUrl }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      }
    }
  },
}
 
