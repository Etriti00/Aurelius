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
  status?: TaskStatus
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
  provider?: 'gmail' | 'outlook'
  threadId: string
  messageCount: number
  lastMessageAt: string
  isRead?: boolean
  isStarred?: boolean
  labels?: string[]
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
  from?: string
  to?: string[]
  subject: string
  body: string
  htmlBody?: string
  sentAt: string
  date?: string
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
  confidence: number
  reasoning?: string
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
  processingTime: number
  model: string
  timestamp: string
}

export interface EmailAnalysisResult {
  summary: string
  actionItems: Array<{
    task: string
    priority: 'low' | 'medium' | 'high'
    dueDate?: string
  }>
  sentiment: 'positive' | 'neutral' | 'negative'
  urgency: 'low' | 'medium' | 'high'
  topics: string[]
  suggestedResponse?: string
}

export interface DraftedEmail {
  subject: string
  body: string
  tone: string
  confidence: number
  suggestions?: string[]
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

// New standardized API response format from backend
export interface StandardApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp: string
}

export interface ApiError {
  message: string
  statusCode: number
  error?: string
  timestamp?: string
}

// AI Gateway related types
export interface ProcessRequestDto {
  prompt: string
  context?: Record<string, unknown>
  systemPrompt?: string
  action?: string
  metadata?: Record<string, unknown>
}

export interface GenerateSuggestionsDto {
  context?: Record<string, unknown>
}

export interface AnalyzeEmailDto {
  emailContent: string
}

export interface DraftEmailDto {
  context?: Record<string, unknown>
  recipient: string
  purpose: string
  tone?: 'professional' | 'friendly' | 'casual' | 'formal'
}

export interface AIUsageStats {
  actionsUsed: number
  actionsLimit: number
  periodStart: string
  periodEnd: string
  costThisPeriod: number
  tokenUsage: {
    input: number
    output: number
    total: number
  }
}

export interface AIHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    anthropic: boolean
    redis: boolean
    database: boolean
  }
  latency: {
    average: number
    p95: number
    p99: number
  }
}

// WebSocket event types
export interface WebSocketEvent {
  type: string
  payload: Record<string, unknown> | string | number | boolean | null
  timestamp: string
  userId?: string
  metadata?: Record<string, unknown>
}

// Enhanced WebSocket event types for new backend
export type WebSocketEventType = 
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'task:completed'
  | 'email:received'
  | 'email:read'
  | 'email:archived'
  | 'calendar:event:created'
  | 'calendar:event:updated'
  | 'calendar:event:reminder'
  | 'ai:suggestion:new'
  | 'ai:insight:generated'
  | 'ai:processing:started'
  | 'ai:processing:completed'
  | 'ai:processing:failed'
  | 'integration:connected'
  | 'integration:disconnected'
  | 'integration:sync:started'
  | 'integration:sync:completed'
  | 'integration:sync:failed'
  | 'billing:subscription:updated'
  | 'billing:usage:warning'
  | 'notification'
  | 'system:maintenance'
  | 'system:error'

export interface NotificationData {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  metadata?: Record<string, unknown>
  createdAt: string
}
// Voice API related types
export interface ProcessVoiceDto {
  language?: string
  metadata?: Record<string, unknown>
}

export interface TextToSpeechDto {
  text: string
  voiceId?: string
  voiceSettings?: {
    stability?: number
    similarityBoost?: number
    style?: number
    useSpeakerBoost?: boolean
  }
}

export interface VoiceProcessingResult {
  transcription: string
  command: string
  response: string
  confidence: number
  processingTime: number
  language: string
  actionTaken?: string
  metadata?: Record<string, unknown>
}

export interface TextToSpeechResult {
  audioUrl: string
  duration: number
  voiceId: string
  metadata?: Record<string, unknown>
}

export interface Voice {
  voiceId: string
  name: string
  category: string
  description?: string
  previewUrl?: string
  settings: {
    stability: number
    similarityBoost: number
    style?: number
  }
  labels: {
    accent?: string
    age?: string
    gender?: string
    description?: string
  }
}

export interface VoiceHistoryItem {
  id: string
  transcription: string
  command: string
  response: string
  confidence: number
  audioUrl?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface VoiceHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    speechToText: boolean
    textToSpeech: boolean
    voiceAnalysis: boolean
  }
  latency: {
    transcription: number
    synthesis: number
  }
}
