/**
 * API type definitions for Aurelius
 * RESTful standards as per CLAUDE.md
 */

export interface ApiResponse<T = unknown> {
  data: T,
  status: number
  headers: Record<string, string>
  ok: boolean
}

export interface ApiError {
  message: string,
  code: string
  status: number
  details?: Record<string, unknown>
  timestamp?: string
  path?: string
}

export interface ApiRequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
  retries?: number
  retryDelay?: number
  signal?: AbortSignal
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

export interface ApiPaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  cursor?: string
}

export interface ApiMeta {
  requestId: string,
  timestamp: string
  version: string
  deprecation?: {
    message: string,
    sunset: string
  }
}

export interface RateLimitInfo {
  limit: number,
  remaining: number
  reset: Date
  retryAfter?: number
}

export interface ApiValidationError {
  message: string,
  code: 'VALIDATION_ERROR'
  status: number
  timestamp?: string
  path?: string
  validationErrors: {,
    field: string
    message: string
    value?: unknown
  }[]
}

// Standard API response wrapper
export interface StandardApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ApiMeta
  pagination?: {
    page: number,
    limit: number
    total: number,
    totalPages: number
  }
}

// Request context for logging and tracing
export interface ApiRequestContext {
  requestId: string
  userId?: string
  method: HttpMethod,
  path: string
  ip?: string
  userAgent?: string
  startTime: Date
}
