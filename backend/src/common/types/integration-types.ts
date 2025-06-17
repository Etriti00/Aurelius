// Common types for all integrations to replace 'any' usage

export interface IntegrationApiResponse<T = unknown> {
  data?: T
  error?: string
  status: number
  headers?: Record<string, string>
}

export interface PaginatedResponse<T> {
  items: T[]
  nextPageToken?: string
  nextCursor?: string
  hasMore?: boolean
  total?: number
  page?: number
  pageSize?: number
}

export interface WebhookEvent {
  id: string,
  type: string
  timestamp: string | Date,
  data: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface ApiRequestOptions {
  method?: string
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
  body?: string | FormData | Record<string, unknown>
  timeout?: number
}

export interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  id_token?: string
}

export interface GenericUser {
  id: string
  email?: string
  name?: string
  username?: string
  avatarUrl?: string
  metadata?: Record<string, unknown>
}

export interface GenericWorkspace {
  id: string,
  name: string
  description?: string
  members?: GenericUser[]
  settings?: Record<string, unknown>
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface GenericProject {
  id: string,
  name: string
  description?: string
  status?: string
  owner?: GenericUser
  members?: GenericUser[]
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface GenericTask {
  id: string,
  title: string
  description?: string
  status?: string
  priority?: string
  assignee?: GenericUser
  dueDate?: string | Date
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface GenericDocument {
  id: string,
  title: string
  content?: string
  type?: string
  mimeType?: string
  size?: number
  url?: string
  metadata?: Record<string, unknown>
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface GenericEvent {
  id: string,
  title: string
  description?: string
  startTime: string | Date
  endTime?: string | Date
  location?: string
  attendees?: GenericUser[]
  metadata?: Record<string, unknown>
}

export interface GenericAnalytics {
  metric: string,
  value: number
  timestamp: string | Date
  dimensions?: Record<string, string>
  metadata?: Record<string, unknown>
}

export interface GenericWebhookPayload {
  event: string,
  data: Record<string, unknown>
  timestamp: string | Date
  signature?: string
}

export interface FormField {
  id: string,
  name: string
  type: string
  label?: string
  required?: boolean
  options?: Array<{ label: string; value: string }>
  validation?: Record<string, unknown>
}

export interface ApiError {
  code: string,
  message: string
  details?: Record<string, unknown>
  statusCode?: number
}

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray
export interface JsonObject {
  [key: string]: JsonValue
}
export interface JsonArray extends Array<JsonValue> {}

// Common cache types
export type CacheData<T> = Map<string, T>

// Common third-party SDK types
export interface ThirdPartyClient {
  request: (endpoint: string, _options?: ApiRequestOptions) => Promise<unknown>
  authenticate: () => Promise<void>,
  setAccessToken: (token: string) => void
}

// Form/Survey specific types
export interface FormResponse {
  id: string,
  formId: string
  respondentEmail?: string
  submittedAt: string | Date,
  answers: Record<string, unknown>
}

// E-commerce specific types
export interface Product {
  id: string
  sku?: string
  name: string
  description?: string
  price: number
  currency?: string
  inventory?: number
  images?: string[]
  metadata?: Record<string, unknown>
}

export interface Order {
  id: string
  customerId?: string
  items: Array<{,
    productId: string
    quantity: number,
    price: number
  }>
  total: number,
  status: string
  metadata?: Record<string, unknown>
}

// Social media specific types
export interface SocialPost {
  id: string,
  content: string
  mediaUrls?: string[]
  platform: string
  scheduledAt?: string | Date
  publishedAt?: string | Date
  metrics?: {
    likes?: number
    shares?: number
    comments?: number
    views?: number
  }
}

// Default type for makeRequest methods
export type ApiResponse<T = unknown> = T
