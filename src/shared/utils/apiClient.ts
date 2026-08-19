import { API_CONFIG } from '@/shared/config/api.config'

/**
 * API client for the backend HttpOnly-cookie session.
 * Automatically clears cached profile state after a 401 response.
 */

export interface ApiClientConfig extends RequestInit {
  skipAuth?: boolean
  /** Override default timeout (ms). Set to 0 to disable timeout for this request. */
  timeout?: number
}

type TypedResponse<T> = Response & {
  readonly __responseType?: T
}

export type ApiErrorOptions = {
  status?: number
  cause?: unknown
  /** True when the failure is a transport/network failure (no HTTP response). */
  isNetworkError?: boolean
}

/**
 * Typed HTTP / transport error so React Query can decide retries from `status`.
 * Network failures omit `status`; HTTP failures always set it.
 */
export class ApiError extends Error {
  readonly status?: number
  readonly isNetworkError: boolean

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(
      message,
      options.cause !== undefined ? { cause: options.cause } : undefined
    )
    this.name = 'ApiError'
    this.status = options.status
    this.isNetworkError = options.isNetworkError === true
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Best-effort HTTP status from ApiError, Axios-like shapes, or `{ status }`. */
export function getErrorStatus(error: unknown): number | undefined {
  if (isApiError(error)) return error.status
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response &&
    typeof (error.response as { status: unknown }).status === 'number'
  ) {
    return (error.response as { status: number }).status
  }
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  ) {
    return (error as { status: number }).status
  }
  return undefined
}

export function isAbortError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.trim().toLowerCase() : ''
  return (
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError') ||
    message === 'signal is aborted without reason' ||
    message === 'the operation was aborted'
  )
}

/**
 * React Query retry predicate: only network failures, 408, 429, and 5xx.
 * Never retries 401/403/404/other 4xx, or aborts.
 */
export function shouldRetryApiError(error: unknown): boolean {
  if (isAbortError(error)) return false
  if (isApiError(error) && error.isNetworkError) return true

  const status = getErrorStatus(error)
  if (status == null) return true
  if (status === 408 || status === 429) return true
  if (status >= 500) return true
  return false
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

    const normalizedEndpoint = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`
    return `${API_CONFIG.API_URL}${normalizedEndpoint}`
  }

  private withTimeout(
    signal?: AbortSignal | null,
    customTimeout?: number
  ): { signal?: AbortSignal; cleanup: () => void } {
    const timeout = customTimeout ?? API_CONFIG.TIMEOUT
    if (!timeout)
      return { signal: signal ?? undefined, cleanup: () => undefined }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    const abortFromCaller = () => controller.abort(signal?.reason)

    if (signal) {
      if (signal.aborted) abortFromCaller()
      else signal.addEventListener('abort', abortFromCaller, { once: true })
    }

    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timeoutId)
        signal?.removeEventListener('abort', abortFromCaller)
      },
    }
  }

  async fetch(
    endpoint: string,
    config: ApiClientConfig = {}
  ): Promise<Response> {
    const { skipAuth, timeout, headers, signal, ...restConfig } = config

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    }

    const url = this.buildUrl(endpoint)
    const timedRequest = this.withTimeout(signal, timeout)

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
        signal: timedRequest.signal,
      })

      // The cookie session expired or is no longer valid.
      if (response.status === 401 && !skipAuth) {
        this.clearAuth()
        throw new ApiError('Session expired. Please login again.', {
          status: 401,
        })
      }

      return response
    } catch (error) {
      if (error instanceof ApiError) throw error

      // Network errors or other fetch errors
      if (
        error instanceof TypeError &&
        error.message.includes('Failed to fetch')
      ) {
        throw new ApiError('Network error. Please check your connection.', {
          cause: error,
          isNetworkError: true,
        })
      }
      throw error
    } finally {
      // Completed requests must not retain a timeout or abort listener.
      timedRequest.cleanup()
    }
  }

  async get<T = unknown>(
    endpoint: string,
    config?: ApiClientConfig
  ): Promise<TypedResponse<T>> {
    return this.fetch(endpoint, { ...config, method: 'GET' }) as Promise<
      TypedResponse<T>
    >
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: ApiClientConfig
  ): Promise<TypedResponse<T>> {
    return this.fetch(endpoint, {
      ...config,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: body instanceof FormData ? {} : config?.headers,
    }) as Promise<TypedResponse<T>>
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: ApiClientConfig
  ): Promise<TypedResponse<T>> {
    return this.fetch(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(body),
    }) as Promise<TypedResponse<T>>
  }

  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: ApiClientConfig
  ): Promise<TypedResponse<T>> {
    return this.fetch(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(body),
    }) as Promise<TypedResponse<T>>
  }

  async delete<T = unknown>(
    endpoint: string,
    config?: ApiClientConfig
  ): Promise<TypedResponse<T>> {
    return this.fetch(endpoint, { ...config, method: 'DELETE' }) as Promise<
      TypedResponse<T>
    >
  }
}

export const apiClient = ApiClient.getInstance()
