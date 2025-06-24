// Notification type definitions
// Professional implementation without shortcuts

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata?: NotificationMetadata;
  scheduledFor?: Date;
}

export enum NotificationType {
  TASK_REMINDER = 'TASK_REMINDER',
  TASK_OVERDUE = 'TASK_OVERDUE',
  AI_SUGGESTION = 'AI_SUGGESTION',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  SUBSCRIPTION_ALERT = 'SUBSCRIPTION_ALERT',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  COLLABORATION_REQUEST = 'COLLABORATION_REQUEST',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  SLACK = 'SLACK',
}

export interface NotificationMetadata {
  entityId?: string;
  entityType?: string;
  actionUrl?: string;
  iconUrl?: string;
  customData?: Record<string, string | number | boolean>;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    [key in NotificationChannel]?: ChannelPreference;
  };
  types: {
    [key in NotificationType]?: TypePreference;
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
  };
}

export interface ChannelPreference {
  enabled: boolean;
  address?: string; // email, phone number, etc.
  verified: boolean;
}

export interface TypePreference {
  enabled: boolean;
  channels: NotificationChannel[];
  priority?: NotificationPriority;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  bodyTemplate: string;
  variables: string[];
  locale: string;
}

export interface NotificationDeliveryResult {
  notificationId: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  deliveredAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}
