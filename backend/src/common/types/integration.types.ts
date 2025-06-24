// Integration type definitions
// Professional implementation without shortcuts

export interface IntegrationConfig {
  provider: IntegrationProvider;
  enabled: boolean;
  credentials: IntegrationCredentials;
  syncSettings: SyncSettings;
  metadata?: Record<string, string>;
}

export enum IntegrationProvider {
  GOOGLE_WORKSPACE = 'GOOGLE_WORKSPACE',
  MICROSOFT_365 = 'MICROSOFT_365',
  SLACK = 'SLACK',
  GITHUB = 'GITHUB',
  JIRA = 'JIRA',
  NOTION = 'NOTION',
  TRELLO = 'TRELLO',
}

export interface IntegrationCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string[];
}

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  syncDirection: 'pull' | 'push' | 'bidirectional';
  filters?: SyncFilters;
}

export interface SyncFilters {
  includePatterns?: string[];
  excludePatterns?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  types?: string[];
}

export interface SyncResult {
  integrationId: string;
  provider: IntegrationProvider;
  startedAt: Date;
  completedAt: Date;
  itemsSynced: number;
  errors: SyncError[];
  status: SyncStatus;
}

export enum SyncStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

export interface SyncError {
  itemId: string;
  error: string;
  timestamp: Date;
  retryable: boolean;
}

export interface WebhookPayload {
  provider: IntegrationProvider;
  event: string;
  data: Record<string, unknown>;
  timestamp: Date;
  signature?: string;
}

export interface IntegrationEvent {
  id: string;
  integrationId: string;
  type: IntegrationEventType;
  data: Record<string, unknown>;
  processed: boolean;
  createdAt: Date;
}

export enum IntegrationEventType {
  ITEM_CREATED = 'ITEM_CREATED',
  ITEM_UPDATED = 'ITEM_UPDATED',
  ITEM_DELETED = 'ITEM_DELETED',
  SYNC_REQUESTED = 'SYNC_REQUESTED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
}
