/**
 * WebSocket interfaces for type safety and event handling
 */

export interface WebSocketEventData {
  userId?: string;
  timestamp: string;
  event: string;
  data: Record<string, unknown>;
  metadata?: {
    source?: string;
    priority?: 'low' | 'medium' | 'high';
    retryCount?: number;
  };
}

export interface WebSocketClientInfo {
  socketId: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  connectedAt: string;
  lastActivity: string;
  rooms: string[];
  rateLimitInfo: {
    requestCount: number;
    windowStart: string;
    violations: number;
  };
}

export interface WebSocketRoomInfo {
  name: string;
  userCount: number;
  createdAt: string;
  lastActivity: string;
  maxUsers?: number;
  isPrivate?: boolean;
  metadata?: Record<string, unknown>;
}

export interface WebSocketMetrics {
  totalConnections: number;
  activeConnections: number;
  authenticatedUsers: number;
  anonymousConnections: number;
  totalMessages: number;
  messagesPerSecond: number;
  rateLimitViolations: number;
  errors: number;
  lastReset: string;
  uptime: number;
}

export interface WebSocketHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: WebSocketMetrics;
  connections: {
    total: number;
    authenticated: number;
    anonymous: number;
    uniqueIPs: number;
    bannedIPs: number;
    totalRooms: number;
  };
  issues?: string[];
  recommendations?: string[];
  timestamp: string;
}

export interface WebSocketEventConfig {
  event: string;
  rateLimit?: {
    maxPerSecond: number;
    maxPerMinute: number;
    burstLimit: number;
  };
  authentication?: {
    required: boolean;
    roles?: string[];
  };
  validation?: {
    schema?: Record<string, unknown>;
    maxSize?: number;
  };
  persistence?: {
    enabled: boolean;
    ttl?: number;
  };
}

export interface BroadcastOptions {
  rooms?: string[];
  excludeRooms?: string[];
  userId?: string;
  excludeUserId?: string;
  priority?: 'low' | 'medium' | 'high';
  persistent?: boolean;
  retryOnFailure?: boolean;
}

export interface EventProcessingResult {
  success: boolean;
  processedAt: string;
  recipientCount: number;
  failedRecipients?: string[];
  error?: string;
  retryScheduled?: boolean;
}

// Event type definitions for real-time updates
export type WebSocketEventType =
  // Task events
  | 'task:created'
  | 'task:updated'
  | 'task:completed'
  | 'task:deleted'

  // Email events
  | 'email:received'
  | 'email:read'
  | 'email:archived'

  // Calendar events
  | 'calendar:event:created'
  | 'calendar:event:updated'
  | 'calendar:event:reminder'

  // AI events
  | 'ai:suggestion:new'
  | 'ai:insight:generated'
  | 'ai:processing:started'
  | 'ai:processing:completed'
  | 'ai:processing:failed'

  // Integration events
  | 'integration:connected'
  | 'integration:disconnected'
  | 'integration:sync:started'
  | 'integration:sync:completed'
  | 'integration:sync:failed'

  // Billing events
  | 'billing:subscription:updated'
  | 'billing:usage:warning'

  // System events
  | 'system:maintenance'
  | 'system:error'
  | 'system:notification'

  // Connection events
  | 'connection:established'
  | 'connection:lost'
  | 'connection:restored'

  // Room events
  | 'room:joined'
  | 'room:left'
  | 'room:message'
  | 'room:user:joined'
  | 'room:user:left';

export interface TypedWebSocketEvent<T = Record<string, unknown>> {
  type: WebSocketEventType;
  data: T;
  timestamp: string;
  userId?: string;
  metadata?: {
    source: string;
    priority: 'low' | 'medium' | 'high';
    persistent: boolean;
    retryable: boolean;
  };
}

// Specific event data types
export interface TaskEventData {
  id: string;
  title: string;
  status: string;
  assignedTo?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface EmailEventData {
  id: string;
  subject: string;
  from: string;
  to: string[];
  timestamp: string;
  isRead: boolean;
  threadId?: string;
  labels?: string[];
}

export interface CalendarEventData {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees?: string[];
  location?: string;
  description?: string;
  reminderMinutes?: number;
}

export interface AIEventData {
  id: string;
  type: 'suggestion' | 'insight' | 'analysis';
  content: string;
  confidence: number;
  relatedItems?: string[];
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface NotificationEventData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  persistent: boolean;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: string;
}
