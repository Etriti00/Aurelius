// Workflow type definitions
// Professional implementation without shortcuts

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  conditions?: WorkflowCondition[];
  enabled: boolean;
  userId: string;
  metadata?: WorkflowMetadata;
}

export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  config: TriggerConfig;
  conditions?: TriggerCondition[];
}

export enum TriggerType {
  TIME_BASED = 'TIME_BASED',
  EVENT_BASED = 'EVENT_BASED',
  WEBHOOK = 'WEBHOOK',
  MANUAL = 'MANUAL',
  EMAIL_RECEIVED = 'EMAIL_RECEIVED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
}

export interface TriggerConfig {
  schedule?: string; // cron expression
  event?: string;
  webhookUrl?: string;
  filters?: Record<string, string | string[]>;
}

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | string[];
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
}

export interface WorkflowAction {
  id: string;
  type: ActionType;
  config: ActionConfig;
  order: number;
  retryPolicy?: RetryPolicy;
}

export enum ActionType {
  CREATE_TASK = 'CREATE_TASK',
  UPDATE_TASK = 'UPDATE_TASK',
  SEND_EMAIL = 'SEND_EMAIL',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  WEBHOOK = 'WEBHOOK',
  AI_PROCESS = 'AI_PROCESS',
  INTEGRATION_ACTION = 'INTEGRATION_ACTION',
}

export interface ActionConfig {
  taskData?: Record<string, unknown>;
  emailTemplate?: string;
  notificationData?: Record<string, unknown>;
  webhookUrl?: string;
  aiPrompt?: string;
  integrationAction?: string;
  parameters?: Record<string, unknown>;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
}

export interface WorkflowCondition {
  id: string;
  type: 'AND' | 'OR';
  conditions: TriggerCondition[];
}

export interface WorkflowMetadata {
  category?: string;
  tags?: string[];
  version?: number;
  author?: string;
  lastModified?: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  triggerData: Record<string, unknown>;
  executionSteps: ExecutionStep[];
  error?: string;
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface ExecutionStep {
  actionId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  result?: Record<string, unknown>;
  error?: string;
  retryCount: number;
}
