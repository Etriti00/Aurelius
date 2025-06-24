export interface IntegrationConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  oauth?: OAuthTokens;
}

export interface IntegrationCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
}

export interface IntegrationStatus {
  isConnected: boolean;
  lastSync?: Date;
  error?: string;
  syncStatus: 'idle' | 'syncing' | 'error';
}

export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsSynced: number;
  errors: string[];
  nextSyncAt?: Date;
  syncType: 'full' | 'incremental';
  startedAt: Date;
  completedAt?: Date;
}

export interface BaseIntegrationService {
  authenticate(code: string): Promise<IntegrationCredentials>;
  refreshCredentials(refreshToken: string): Promise<IntegrationCredentials>;
  syncData(credentials: IntegrationCredentials): Promise<SyncResult>;
  validateCredentials(credentials: IntegrationCredentials): Promise<boolean>;
  revokeAccess(credentials: IntegrationCredentials): Promise<void>;
}

export interface Integration {
  id: string;
  userId: string;
  provider: string;
  type: IntegrationType;
  status: IntegrationStatusEnum;
  config: IntegrationConfig;
  capabilities: IntegrationCapability[];
  metadata?: Record<string, any>;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum IntegrationType {
  EMAIL = 'email',
  CALENDAR = 'calendar',
  STORAGE = 'storage',
  TASK_MANAGEMENT = 'task_management',
  COMMUNICATION = 'communication',
  CRM = 'crm',
  ANALYTICS = 'analytics',
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  SLACK = 'slack',
  JIRA = 'jira',
}

export enum IntegrationStatusEnum {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string[];
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email?: boolean;
  provider?: OAuthProvider;
}

export interface OAuthStateData {
  userId: string;
  provider: OAuthProvider;
}

export enum IntegrationCapability {
  READ = 'read',
  WRITE = 'write',
  SYNC = 'sync',
  WEBHOOK = 'webhook',
  REAL_TIME = 'real_time',
  EMAIL_SYNC = 'email_sync',
  CALENDAR_SYNC = 'calendar_sync',
  FILE_SYNC = 'file_sync',
  TASK_SYNC = 'task_sync',
  MESSAGE_SYNC = 'message_sync',
  CHANNEL_SYNC = 'channel_sync',
  USER_SYNC = 'user_sync',
  ISSUE_SYNC = 'issue_sync',
  PROJECT_SYNC = 'project_sync',
  COMMENT_SYNC = 'comment_sync',
  ATTACHMENT_SYNC = 'attachment_sync',
  NOTIFICATION_SEND = 'notification_send',
}

export enum OAuthProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  SLACK = 'slack',
  GITHUB = 'github',
}

export interface IntegrationMetadata {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  category: string;
  capabilities: IntegrationCapability[];
  requiredScopes: string[];
  webhookSupport: boolean;
  status: 'active' | 'beta' | 'deprecated';
  configSchema?: Record<string, any>;
}
