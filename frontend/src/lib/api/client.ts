import { getSession } from 'next-auth/react'
import { Session } from 'next-auth'
import { ApiError } from './types'

// Extend Session type to include accessToken
interface ExtendedSession extends Session {
  accessToken?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await getSession()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (session?.user) {
      // In a real implementation, you'd get the access token from your auth system
      // For now, we'll assume the token is available (this will be resolved when OAuth is configured)
      const token = (session as ExtendedSession)?.accessToken || 'mock-token'
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: 'Network error occurred',
        statusCode: response.status,
      }))
      
      const error: ApiError = {
        message: errorData.message || 'An error occurred',
        statusCode: response.status,
        error: errorData.error,
      }
      
      throw error
    }

    const data = await response.json()
    return data
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

    const headers = await this.getAuthHeaders()
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    })

    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers,
    })

    return this.handleResponse<T>(response)
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