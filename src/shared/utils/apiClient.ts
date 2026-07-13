import { API_CONFIG } from '@/shared/config/api.config'

/**
 * API Client with automatic token handling and base URL from config.
 * Automatically logs out user when receiving 401 Unauthorized.
 */

export interface ApiClientConfig extends RequestInit {
  skipAuth?: boolean
  /** Override default timeout (ms). Set to 0 to disable timeout for this request. */
  timeout?: number
}

type TypedResponse<T> = Response & {
  readonly __responseType?: T
}

class ApiClient {
  private static instance: ApiClient

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient()
    }
    return ApiClient.instance
  }

  private clearAuth(): void {
    if (typeof window === 'undefined') return

    // Clear both persistent and session storage to cover remember-me/session flows
    // (legacy keys kept for compatibility with older builds).
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_user')

    // Avoid redirect loops when already on sign-in page
    if (window.location.pathname !== '/sign-in') {
      window.location.href = '/sign-in?reason=session_expired'
    }
  }

  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) return endpoint

    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    return `${API_CONFIG.API_URL}${normalizedEndpoint}`
  }

  private withTimeout(signal?: AbortSignal | null, customTimeout?: number): AbortSignal | undefined {
    const timeout = customTimeout ?? API_CONFIG.TIMEOUT
    if (!timeout) return signal ?? undefined
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    if (signal) {
      signal.addEventListener('abort', () => controller.abort())
    }

    // Clear timeout on abort to avoid leaks
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId))

    return controller.signal
  }

  async fetch(endpoint: string, config: ApiClientConfig = {}): Promise<Response> {
    const { skipAuth, timeout, headers, signal, ...restConfig } = config

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    }

    const url = this.buildUrl(endpoint)

    try {
      const isFormData = restConfig.body instanceof FormData

      if (isFormData) {
        // Let the browser set multipart boundaries
        delete requestHeaders['Content-Type']
      }

      const response = await fetch(url, {
        ...restConfig,
        headers: requestHeaders,
        credentials: 'include',
        signal: this.withTimeout(signal, timeout),
      })

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401 && !skipAuth) {
        this.clearAuth()
        throw new Error('Session expired. Please login again.')
      }

      return response
    } catch (error) {
      // Network errors or other fetch errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your connection.', { cause: error })
      }
      throw error
    }
  }

  async get<T = unknown>(endpoint: string, config?: ApiClientConfig): Promise<TypedResponse<T>> {
    return this.fetch(endpoint, { ...config, method: 'GET' }) as Promise<TypedResponse<T>>
  }

  async post<T = unknown>(endpoint: string, body?: unknown, config?: ApiClientConfig): Promise<TypedResponse<T>> {
    return this.fetch(endpoint, {
      ...config,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: body instanceof FormData ? {} : config?.headers,
    }) as Promise<TypedResponse<T>>
  }

  async put<T = unknown>(endpoint: string, body?: unknown, config?: ApiClientConfig): Promise<TypedResponse<T>> {
    return this.fetch(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(body),
    }) as Promise<TypedResponse<T>>
  }

  async patch<T = unknown>(endpoint: string, body?: unknown, config?: ApiClientConfig): Promise<TypedResponse<T>> {
    return this.fetch(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(body),
    }) as Promise<TypedResponse<T>>
  }

  async delete<T = unknown>(endpoint: string, config?: ApiClientConfig): Promise<TypedResponse<T>> {
    return this.fetch(endpoint, { ...config, method: 'DELETE' }) as Promise<TypedResponse<T>>
  }
}

export const apiClient = ApiClient.getInstance()
