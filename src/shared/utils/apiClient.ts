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

  private logRequest(method: string | undefined, url: string, body?: any) {
    if (!API_CONFIG.ENABLE_LOGS) return
    console.log(`[API Request] ${method?.toUpperCase() || 'GET'} ${url}`, body)
  }

  private logResponse(url: string, data: any) {
    if (!API_CONFIG.ENABLE_LOGS) return
    console.log(`[API Response] ${url}`, data)
  }

  async fetch(endpoint: string, config: ApiClientConfig = {}): Promise<Response> {
    const { skipAuth, timeout, headers, signal, ...restConfig } = config

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    }

    const url = this.buildUrl(endpoint)

    this.logRequest(restConfig.method, url, restConfig.body)

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
        console.warn('Received 401 Unauthorized - logging out user')
        this.clearAuth()
        throw new Error('Session expired. Please login again.')
      }

      this.logResponse(url, response.clone())

      return response
    } catch (error) {
      // Network errors or other fetch errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your connection.')
      }
      throw error
    }
  }

  async get<T = unknown>(endpoint: string, config?: ApiClientConfig): Promise<Response> {
    return this.fetch(endpoint, { ...config, method: 'GET' })
  }

  async post<T = unknown>(endpoint: string, body?: any, config?: ApiClientConfig): Promise<Response> {
    return this.fetch(endpoint, {
      ...config,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: body instanceof FormData ? {} : config?.headers,
    })
  }

  async put<T = unknown>(endpoint: string, body?: any, config?: ApiClientConfig): Promise<Response> {
    return this.fetch(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async patch<T = unknown>(endpoint: string, body?: any, config?: ApiClientConfig): Promise<Response> {
    return this.fetch(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  async delete<T = unknown>(endpoint: string, config?: ApiClientConfig): Promise<Response> {
    return this.fetch(endpoint, { ...config, method: 'DELETE' })
  }
}

export const apiClient = ApiClient.getInstance()
