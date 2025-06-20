export interface ScheduledJob {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: JobType;
  schedule: JobSchedule;
  action: JobAction;
  enabled: boolean;
  metadata?: Record<string, any>;
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

export interface JobAction {
  type: ActionType;
  target: string;
  method: string;
  parameters?: Record<string, any>;
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

export interface JobExecution {
  id: string;
  jobId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  result?: any;
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