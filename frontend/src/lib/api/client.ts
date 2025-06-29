import { getSession } from 'next-auth/react'
import { ApiError, StandardApiResponse } from './types'
import { addCSRFHeaders, requiresCSRFToken, csrfTokenManager } from '@/lib/utils/csrf'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const headers = await this.getAuthHeaders(method)
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      })

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'AUTH_REFRESH_NEEDED' || error.message === 'CSRF_RETRY_NEEDED') {
          // Retry with refreshed headers (auth or CSRF)
          const newHeaders = await this.getAuthHeaders(method)
          const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
            method,
            headers: newHeaders,
            body: data ? JSON.stringify(data) : undefined,
          })
          return await this.handleResponse<T>(retryResponse, false, false)
        }
      }
      throw error
    }
  }

  private async getAuthHeaders(method: string = 'GET'): Promise<HeadersInit> {
    const session = await getSession()
    let headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`
    }

    // Add CSRF token for state-changing requests
    if (requiresCSRFToken(method)) {
      try {
        headers = await addCSRFHeaders(method, headers);
      } catch (error) {
        console.error('Failed to add CSRF headers:', error);
        throw new Error(`CSRF protection required: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return headers
  }

  private async refreshToken(): Promise<string | null> {
    const session = await getSession()
    if (!session?.refreshToken) {
      return null
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: session.refreshToken,
        }),
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      if (data.success && data.data.accessToken) {
        // Note: In a real implementation, you'd update the session with the new tokens
        // This would require additional NextAuth.js configuration
        return data.data.accessToken
      }

      return null
    } catch (error) {
      console.error('Token refresh error:', error)
      return null
    }
  }

  private async handleResponse<T>(response: Response, retryOnAuth = true, retryOnCSRF = true): Promise<T> {
    if (!response.ok) {
      // Handle 401 unauthorized - try to refresh token
      if (response.status === 401 && retryOnAuth) {
        const newToken = await this.refreshToken()
        if (newToken) {
          // Retry the request with new token
          // Note: This is a simplified approach. In production, you'd want to
          // retry the original request with the new token
          throw new Error('AUTH_REFRESH_NEEDED')
        }
      }

      // Handle 403 CSRF errors - invalidate token and retry
      if (response.status === 403 && retryOnCSRF) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.message?.toLowerCase().includes('csrf') || 
            errorData.error?.toLowerCase().includes('csrf')) {
          csrfTokenManager.invalidateToken();
          throw new Error('CSRF_RETRY_NEEDED')
        }
      }

      const errorData = await response.json().catch(() => ({
        message: 'Network error occurred',
        statusCode: response.status,
      }))
      
      const error: ApiError = {
        message: errorData.message || 'An error occurred',
        statusCode: response.status,
        error: errorData.error,
        timestamp: errorData.timestamp,
      }

      // Handle CSRF errors
      csrfTokenManager.handleCSRFError(error);
      
      throw error
    }

    const rawData = await response.json()
    
    // Handle standardized API response format
    if (rawData && typeof rawData === 'object' && 'success' in rawData) {
      const standardResponse = rawData as StandardApiResponse<T>
      if (standardResponse.success) {
        return standardResponse.data
      } else {
        const error: ApiError = {
          message: standardResponse.message || 'Request failed',
          statusCode: response.status,
          timestamp: standardResponse.timestamp,
        }
        throw error
      }
    }
    
    // Handle legacy response format (for backwards compatibility)
    return rawData as T
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const headers = await this.getAuthHeaders('GET')
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      })

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTH_REFRESH_NEEDED') {
        // Retry with refreshed headers
        const newHeaders = await this.getAuthHeaders('GET')
        const retryResponse = await fetch(url.toString(), {
          method: 'GET',
          headers: newHeaders,
        })
        return await this.handleResponse<T>(retryResponse, false, false)
      }
      throw error
    }
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.makeRequest<T>('POST', endpoint, data)
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.makeRequest<T>('PUT', endpoint, data)
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.makeRequest<T>('PATCH', endpoint, data)
  }

  async delete<T, D = Record<string, unknown>>(endpoint: string, data?: D): Promise<T> {
    return this.makeRequest<T>('DELETE', endpoint, data)
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Helper function to create SWR fetcher with error handling
export const createSWRFetcher = <T>(endpoint: string) => async (): Promise<T> => {
  try {
    return await apiClient.get<T>(endpoint)
  } catch (error) {
    console.error('SWR Fetch Error:', error)
    throw error
  }
}

// Helper to create SWR fetcher with params
export const createSWRFetcherWithParams = <T>(endpoint: string) => 
  async (_url: string, params?: Record<string, unknown>): Promise<T> => {
    try {
      return await apiClient.get<T>(endpoint, params)
    } catch (error) {
      console.error('SWR Fetch Error:', error)
      throw error
    }
  }

export default apiClient