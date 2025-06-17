/**
 * WebSocket type definitions for Aurelius
 * Real-time communication as per CLAUDE.md
 */

export interface WebSocketMessage<T = unknown> {
  event: string
  data: T
  timestamp: string
  id?: string
  userId?: string
  roomId?: string
}

export interface WebSocketClient {
  id: string
  userId: string
  connectionTime: Date
  lastActivity: Date
  rooms: string[]
  metadata?: {
    userAgent?: string
    ip?: string
    location?: string
  }
}

export interface WebSocketRoom {
  name: string
  clients: string[]
  createdAt: Date
  metadata?: Record<string, unknown>
}

export interface WebSocketEventHandler<T = unknown> {
  event: string
  handler: (client: WebSocketClient, data: T) => Promise<void>
  validator?: (data: unknown) => data is T
}

// Specific WebSocket events for Aurelius
export enum WebSocketEvents {
  // Task events
  TASK_CREATED = 'task:created',
  TASK_UPDATED = 'task:updated',
  TASK_DELETED = 'task:deleted',
  TASK_COMPLETED = 'task:completed',

  // Email events
  EMAIL_RECEIVED = 'email:received',
  EMAIL_SENT = 'email:sent',
  EMAIL_READ = 'email:read',

  // Calendar events
  CALENDAR_EVENT_CREATED = 'calendar:event:created',
  CALENDAR_EVENT_UPDATED = 'calendar:event:updated',
  CALENDAR_EVENT_REMINDER = 'calendar:event:reminder',

  // AI suggestion events
  SUGGESTION_NEW = 'suggestion:new',
  SUGGESTION_ACCEPTED = 'suggestion:accepted',
  SUGGESTION_REJECTED = 'suggestion:rejected',

  // Action events
  ACTION_STARTED = 'action:started',
  ACTION_COMPLETED = 'action:completed',
  ACTION_FAILED = 'action:failed',

  // Connection events
  CONNECTION_READY = 'connection:ready',
  CONNECTION_ERROR = 'connection:error',
  CONNECTION_CLOSED = 'connection:closed',
}

export interface TaskWebSocketPayload {
  taskId: string
  title: string
  status: string
  changes?: Record<string, unknown>
}

export interface EmailWebSocketPayload {
  emailId: string
  threadId: string
  subject: string
  from: string
  preview?: string
}

export interface CalendarWebSocketPayload {
  eventId: string
  title: string
  start: string
  end: string
  attendees?: string[]
}

export interface SuggestionWebSocketPayload {
  suggestionId: string
  type: 'task' | 'email' | 'calendar' | 'general'
  title: string
  description: string
  confidence: number
  actions?: Array<{
    type: string
    label: string
    data: Record<string, unknown>
  }>
}

export interface ActionWebSocketPayload {
  actionId: string
  type: string
  status: 'started' | 'completed' | 'failed'
  progress?: number
  result?: unknown
  error?: string
}
