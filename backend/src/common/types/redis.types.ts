/**
 * Redis type definitions for Aurelius
 * Following CLAUDE.md caching strategy with proper type safety
 */

export interface CacheValue<T = unknown> {
  data: T
  metadata: CacheMetadata
}

export interface CacheMetadata {
  timestamp: number
  ttl?: number
  version?: string
  compressed?: boolean
}

export interface CacheOptions {
  ttl?: number
  compress?: boolean
  version?: string
}

export interface RedisConfig {
  host: string
  port: number
  password?: string
  db?: number
  keyPrefix?: string
}

export type CacheKey = string | { namespace: string; key: string }

export interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
}

// Specific cache types for Aurelius features
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  description?: string
  attendees?: string[]
  location?: string
  isAllDay?: boolean
  recurrence?: string
  reminders?: Reminder[]
  metadata?: Record<string, unknown>
}

export interface Reminder {
  method: 'email' | 'popup' | 'sms'
  minutes: number
}

export interface EmailThread {
  id: string
  subject: string
  participants: string[]
  lastMessageDate: Date
  messageCount: number
  isRead: boolean
  labels?: string[]
  importance?: 'high' | 'normal' | 'low'
}

export interface TaskData {
  id: string
  title: string
  description?: string
  dueDate?: Date
  priority: 'urgent' | 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled'
  assigneeId?: string
  tags?: string[]
  projectId?: string
  subtasks?: TaskData[]
}

export interface IntegrationToken {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string[]
  tokenType?: string
}
