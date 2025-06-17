// Task-related types
export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  dueDate?: string
  labels: string[]
  estimatedHours?: number
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  userId: string
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface TaskStats {
  total: number
  byStatus: Record<TaskStatus, number>
  byPriority: Record<Priority, number>
  overdue: number
  dueToday: number
  dueThisWeek: number
}

export interface CreateTaskDto {
  title: string
  description?: string
  priority?: Priority
  dueDate?: string
  labels?: string[]
  estimatedHours?: number
  metadata?: Record<string, unknown>
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: Priority
  dueDate?: string
  labels?: string[]
  estimatedHours?: number
  metadata?: Record<string, unknown>
}

// Email-related types
export interface EmailThread {
  id: string
  subject: string
  participants: string[]
  provider: 'gmail' | 'outlook'
  threadId: string
  messageCount: number
  lastMessageAt: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  userId: string
  messages?: EmailMessage[]
  aiInsights?: AIInsight[]
}

export interface EmailMessage {
  id: string
  threadId: string
  messageId: string
  sender: string
  recipients: string[]
  subject: string
  body: string
  htmlBody?: string
  sentAt: string
  isRead: boolean
  attachments?: string[]
  metadata?: Record<string, unknown>
  aiInsights?: AIInsight[]
}

export interface EmailStats {
  totalThreads: number
  unreadCount: number
  todayCount: number
  byProvider: Record<string, number>
  priorityDistribution: Record<string, number>
}

// Calendar-related types
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  location?: string
  attendees: string[]
  isAllDay: boolean
  recurring: boolean
  recurringPattern?: string
  provider: 'google' | 'outlook'
  eventId: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  userId: string
  aiInsights?: AIInsight[]
}

export interface CalendarAnalytics {
  totalEvents: number
  upcomingEvents: number
  todayEvents: number
  thisWeekEvents: number
  meetingHours: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  topAttendees: Array<{ email: string; count: number }>
  busyHours: Array<{ hour: number; count: number }>
}

// AI-related types
export interface AIInsight {
  id: string
  taskId?: string
  emailMessageId?: string
  emailThreadId?: string
  calendarEventId?: string
  type: string
  content: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface AISuggestion {
  id: string
  type: 'task' | 'email' | 'calendar' | 'insight'
  title: string
  description: string
  action: string
  priority: 'low' | 'medium' | 'high'
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface AICommand {
  command: string
  context?: Record<string, unknown>
}

export interface AIResponse {
  content: string
  tokens: {
    input: number
    output: number
    total: number
  }
  cost: number
  cached: boolean
  cacheKey?: string
}

// User-related types
export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  provider?: string
  stripeCustomerId?: string
  preferences: Record<string, unknown>
  createdAt: string
  updatedAt: string
  subscription?: Subscription
  integrations?: Integration[]
}

export interface Subscription {
  id: string
  userId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  stripeSubscriptionId?: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  aiActionsUsed: number
  createdAt: string
  updatedAt: string
}

export enum SubscriptionTier {
  PRO = 'PRO',
  MAX = 'MAX',
  TEAMS = 'TEAMS'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  PAST_DUE = 'PAST_DUE',
  TRIALING = 'TRIALING',
  INCOMPLETE = 'INCOMPLETE'
}

export interface Integration {
  id: string
  userId: string
  provider: string
  displayName?: string
  scope: string[]
  enabled: boolean
  lastSync?: string
  createdAt: string
  updatedAt: string
}

export interface UsageMetrics {
  aiActionsUsed: number
  aiActionsLimit: number
  integrationsUsed: number
  integrationsLimit: number
  periodStart: string
  periodEnd: string
  isAtLimit: boolean
  warningThreshold: number
}

// Dashboard overview types
export interface DashboardOverview {
  tasksStats: TaskStats
  emailStats: EmailStats
  calendarStats: CalendarAnalytics
  usageMetrics: UsageMetrics
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface ApiError {
  message: string
  statusCode: number
  error?: string
}

// WebSocket event types
export interface WebSocketEvent {
  type: string
  payload: Record<string, unknown> | string | number | boolean | null
  timestamp: string
}

export interface NotificationData {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  metadata?: Record<string, unknown>
  createdAt: string
}