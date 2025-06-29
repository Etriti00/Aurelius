// Define specific interfaces for job metadata based on job types
export interface JobMetadata {
  templateId?: string;
  createdBy?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  tags?: string[];
  executeImmediately?: boolean;
  userPreferences?: Record<string, string | number | boolean>;
  retryConfiguration?: {
    maxAttempts?: number;
    backoffDelay?: number;
  };
  dependencies?: string[]; // Job IDs this job depends on
  notifications?: Record<string, string | number | boolean>;
  [key: string]:
    | string
    | number
    | boolean
    | string[]
    | Record<string, string | number | boolean>
    | undefined;
}

export interface ScheduledJob {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: JobType;
  schedule: JobSchedule;
  action: JobAction;
  enabled: boolean;
  metadata?: JobMetadata;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum JobType {
  ONE_TIME = 'one_time',
  RECURRING = 'recurring',
  CRON = 'cron',
  INTERVAL = 'interval',
  DELAYED = 'delayed',
}

export interface JobSchedule {
  type: JobType;
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  // For one-time jobs
  runAt?: Date;
  // For recurring jobs
  frequency?: RecurrenceFrequency;
  interval?: number; // minutes
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  daysOfMonth?: number[]; // 1-31
  monthsOfYear?: number[]; // 1-12
  time?: string; // HH:mm format
  // For cron jobs
  cronExpression?: string;
  // For interval jobs
  intervalMinutes?: number;
  // For delayed jobs
  delayMinutes?: number;
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

// Define specific parameter types for different job actions
export interface JobActionParameters {
  // Task-related parameters
  title?: string;
  description?: string;
  dueDate?: string | Date;
  priority?: string;
  labels?: string[];
  taskId?: string;
  taskIds?: string[];
  status?: string;
  assignedTo?: string;

  // Email parameters
  to?: string;
  from?: string;
  subject?: string;
  content?: string;
  text?: string;
  html?: string;

  // Notification parameters
  type?: string;
  message?: string;
  channels?: string[];

  // Report parameters
  reportType?: string;
  timeRange?: string;
  format?: string;
  emailTo?: string | boolean;

  // Cleanup parameters
  olderThanDays?: number;
  cleanNotifications?: boolean;
  cleanActivityLogs?: boolean;
  cleanCompletedTasks?: boolean;

  // Integration parameters
  integrationId?: string;
  syncType?: string;
  options?: Record<string, string | number | boolean>;

  // Webhook parameters
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  data?: Record<string, string | number | boolean>;
  timeout?: number;

  // Workflow parameters
  triggerId?: string;
  triggerType?: string;
  triggerData?: Record<string, string | number | boolean>;

  // Custom function parameters
  functionName?: string;
  [key: string]:
    | string
    | number
    | boolean
    | string[]
    | Date
    | Record<string, string | number | boolean>
    | undefined;
}

export interface JobAction {
  type: ActionType;
  target: string;
  method: string;
  parameters?: JobActionParameters;
  retryPolicy?: RetryPolicy;
}

export enum ActionType {
  TASK_CREATE = 'task_create',
  TASK_UPDATE = 'task_update',
  EMAIL_SEND = 'email_send',
  NOTIFICATION_SEND = 'notification_send',
  REPORT_GENERATE = 'report_generate',
  DATA_CLEANUP = 'data_cleanup',
  SYNC_INTEGRATION = 'sync_integration',
  WEBHOOK_CALL = 'webhook_call',
  WORKFLOW_TRIGGER = 'workflow_trigger',
  CUSTOM_FUNCTION = 'custom_function',
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier?: number;
  maxRetryDelayMs?: number;
}

// Define specific result types for job execution results
export interface JobExecutionResult {
  success?: boolean;
  actionType?: string;
  timestamp?: Date;

  // Task execution results
  taskId?: string;
  title?: string;
  status?: string;
  updatedTasks?: Array<{ taskId: string; updated: boolean }>;

  // Email execution results
  messageId?: string;
  sentAt?: Date;
  recipient?: string;

  // Notification execution results
  notificationId?: string;
  channels?: string;

  // Report execution results
  jobId?: string;
  reportType?: string;

  // Cleanup execution results
  cleanedAt?: Date;
  olderThanDays?: number;
  deleted?: Record<string, number>;

  // Integration sync results
  integrationId?: string;
  syncType?: string;

  // Webhook execution results
  statusText?: string;
  headers?: Record<string, string | string[]>;

  // Workflow execution results
  triggerId?: string;

  // Custom function results
  functionName?: string;
  executed?: boolean;
  result?: string;
  metadata?: JobMetadata;

  [key: string]:
    | string
    | number
    | boolean
    | Date
    | Record<string, string | number | boolean | string[]>
    | Array<{ taskId: string; updated: boolean }>
    | JobMetadata
    | undefined;
}

export interface JobExecution {
  id: string;
  jobId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  result?: JobExecutionResult;
  error?: JobError;
  retryCount: number;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export interface JobError {
  code: string;
  message: string;
  stack?: string;
  retryable: boolean;
}

export interface SchedulerMetrics {
  totalJobs: number;
  activeJobs: number;
  pausedJobs: number;
  executionsToday: number;
  successRate: number;
  averageExecutionTime: number;
  failureRate: number;
  upcomingJobs: UpcomingJob[];
}

export interface UpcomingJob {
  jobId: string;
  jobName: string;
  nextRun: Date;
  type: JobType;
}

export interface JobFilter {
  userId?: string;
  type?: JobType;
  enabled?: boolean;
  actionType?: ActionType;
  startDate?: Date;
  endDate?: Date;
}

export interface JobStatistics {
  jobId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecution?: Date;
  nextExecution?: Date;
}

export interface BulkJobOperation {
  operation: 'enable' | 'disable' | 'delete';
  jobIds: string[];
}

export interface JobTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  schedule: Partial<JobSchedule>;
  action: Partial<JobAction>;
  popularity: number;
  tags: string[];
}
