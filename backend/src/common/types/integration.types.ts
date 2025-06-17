/**
 * Integration type definitions for Aurelius
 * Supporting 107 integrations as per CLAUDE.md
 */

import { HttpMethod } from './api.types'

interface SyncOptions {
  fullSync?: boolean
  entityTypes?: string[]
  since?: Date
  limit?: number
}

interface WebhookPayload {
  id: string
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

export interface IntegrationWebhookPayload {
  event: string
  timestamp: string
  data: Record<string, unknown>
  signature?: string
  headers?: Record<string, string>
  rawBody?: string
}

export interface IntegrationApiCall {
  endpoint: string
  method: HttpMethod
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
  maxRetries?: number
}

export interface IntegrationTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string[]
  tokenType?: string
  metadata?: Record<string, unknown>
}

export interface IntegrationSyncOptions {
  lastSyncTime?: Date
  fullSync?: boolean
  entities?: string[]
  limit?: number
  cursor?: string
}

export interface IntegrationSyncResult {
  success: boolean
  itemsProcessed: number
  itemsSkipped: number
  errors: string[]
  lastSyncTime?: Date
  nextSyncToken?: string
  metadata?: Record<string, unknown>
}

export interface IntegrationError extends Error {
  code: string
  status?: number
  provider: string
  retryable?: boolean
  details?: Record<string, unknown>
}

// OAuth types
export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  authorizationUrl: string
  tokenUrl: string
  scopes: string[]
  state?: string
  codeChallenge?: string
  codeChallengeMethod?: 'S256' | 'plain'
}

export interface OAuthTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  id_token?: string
}

// Integration-specific data types
export interface IntegrationTask {
  id: string
  title: string
  description?: string
  status: string
  dueDate?: Date
  assignee?: string
  priority?: string
  tags?: string[]
  externalId: string
  integrationId: string
}

export interface IntegrationEmail {
  id: string
  threadId?: string
  subject: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  body: string
  date: Date
  attachments?: IntegrationAttachment[]
  labels?: string[]
  externalId: string
  integrationId: string
}

export interface IntegrationAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
  url?: string
  data?: string
}

export interface IntegrationCalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  description?: string
  location?: string
  attendees?: IntegrationAttendee[]
  recurrence?: string
  reminders?: IntegrationReminder[]
  externalId: string
  integrationId: string
}

export interface IntegrationAttendee {
  email: string
  name?: string
  status: 'accepted' | 'declined' | 'tentative' | 'pending'
  optional?: boolean
}

export interface IntegrationReminder {
  method: 'email' | 'popup' | 'sms'
  minutes: number
}

// Rate limiting
export interface IntegrationRateLimit {
  provider: string
  limit: number
  remaining: number
  reset: Date
  window: 'second' | 'minute' | 'hour' | 'day'
}

// Circuit breaker states
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerStatus {
  state: CircuitBreakerState
  failures: number
  lastFailureTime?: Date
  nextRetryTime?: Date
}
