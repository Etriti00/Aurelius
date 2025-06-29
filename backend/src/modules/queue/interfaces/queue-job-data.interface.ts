// Queue Job Data Interfaces
// Professional implementation without shortcuts

import { AIModel, AISuggestionContext } from '../../../common/types/ai.types';
import { IntegrationProvider, SyncFilters } from '../../../common/types/integration.types';
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationMetadata,
} from '../../../common/types/notification.types';

/**
 * AI Analysis Job Data
 * Used for queuing AI analysis tasks
 */
export interface AIAnalysisJobData {
  userId: string;
  type: 'task' | 'email' | 'calendar' | 'document' | 'context';
  entityId?: string;
  content?: string;
  model?: AIModel;
  prompt?: string;
  metadata?: {
    source?: string;
    priority?: 'low' | 'medium' | 'high';
    context?: Record<string, unknown>;
  };
}

/**
 * AI Suggestion Job Data
 * Used for queuing AI suggestion generation tasks
 */
export interface AISuggestionJobData {
  userId: string;
  context: AISuggestionContext;
  suggestionType?: 'task' | 'workflow' | 'optimization' | 'automation';
  maxSuggestions?: number;
  metadata?: {
    triggeredBy?: string;
    includeReasons?: boolean;
    priority?: 'low' | 'medium' | 'high';
  };
}

/**
 * Integration Sync Job Data
 * Used for queuing integration synchronization tasks
 */
export interface IntegrationSyncJobData {
  integrationId: string;
  provider?: IntegrationProvider;
  syncType?: 'full' | 'incremental' | 'delta';
  direction?: 'pull' | 'push' | 'bidirectional';
  filters?: SyncFilters;
  forceFull?: boolean;
  metadata?: {
    triggeredBy?: 'user' | 'schedule' | 'webhook' | 'system';
    retryAttempt?: number;
    priority?: 'low' | 'medium' | 'high';
  };
}

/**
 * Single Notification Job Data
 * Used for queuing individual notification sends
 */
export interface NotificationJobData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata?: NotificationMetadata;
  scheduledFor?: Date;
  templateId?: string;
  templateVariables?: Record<string, string | number | boolean>;
}

/**
 * Batch Notification Job Data
 * Used for queuing batch notification sends to multiple users
 */
export interface BatchNotificationJobData {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata?: NotificationMetadata;
  scheduledFor?: Date;
  templateId?: string;
  templateVariables?: Record<string, string | number | boolean>;
  batchSize?: number;
  delayBetweenBatches?: number; // milliseconds
}

/**
 * Analytics Event Job Data
 * Used for queuing analytics event tracking
 */
export interface AnalyticsEventJobData {
  userId: string;
  event: AnalyticsEvent;
  properties?: AnalyticsEventProperties;
  timestamp?: Date;
  sessionId?: string;
  metadata?: {
    source?: string;
    version?: string;
    environment?: 'production' | 'staging' | 'development';
  };
}

/**
 * Analytics Event Types
 */
export interface AnalyticsEvent {
  name: string;
  category: 'user_action' | 'system_event' | 'integration' | 'ai_usage' | 'billing';
  action: string;
  label?: string;
  value?: number;
}

/**
 * Analytics Event Properties
 */
export interface AnalyticsEventProperties {
  // User context
  userTier?: 'PRO' | 'MAX' | 'TEAMS';
  userRegistrationDate?: Date;

  // Feature usage
  featureName?: string;
  featureVersion?: string;

  // AI usage specific
  model?: AIModel;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;

  // Integration specific
  integrationProvider?: IntegrationProvider;
  integrationVersion?: string;

  // Performance metrics
  duration?: number;
  success?: boolean;
  errorCode?: string;

  // Additional custom properties
  customProperties?: Record<string, string | number | boolean>;
}

/**
 * Usage Calculation Job Data
 * Used for queuing user usage calculations
 */
export interface UsageCalculationJobData {
  userId: string;
  period?: 'current_month' | 'last_month' | 'custom';
  startDate?: Date;
  endDate?: Date;
  includeDetails?: boolean;
  recalculate?: boolean;
}
