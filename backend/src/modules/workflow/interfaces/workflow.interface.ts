// Define specific metadata types for different trigger types
export interface TriggerMetadata {
  workflowId?: string;
  source?: string;
  priority?: number;
  tags?: string[];
  checkInterval?: number;
  eventTypes?: string[];
  statusChanges?: string[];
  insightTypes?: string[];
  schedule?: {
    cron?: string;
    timezone?: string;
    nextRun?: string;
  };
  webhook?: {
    url?: string;
    secret?: string;
    headers?: Record<string, string>;
  };
  email?: {
    fromPattern?: string;
    subjectPattern?: string;
    bodyPattern?: string;
  };
  calendar?: {
    eventPattern?: string;
    timeBeforeEvent?: number;
  };
}

export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  conditions: TriggerCondition[];
  enabled: boolean;
  metadata?: TriggerMetadata;
}

export enum TriggerType {
  TIME_BASED = 'time_based',
  EVENT_BASED = 'event_based',
  CONTEXT_BASED = 'context_based',
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
  EMAIL_RECEIVED = 'email_received',
  CALENDAR_EVENT = 'calendar_event',
  TASK_STATUS = 'task_status',
  AI_INSIGHT = 'ai_insight',
}

// Define specific condition value types
export type ConditionValue = string | number | boolean | Date | string[] | number[];

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: ConditionValue;
  logicalOperator?: 'AND' | 'OR';
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in',
  MATCHES_PATTERN = 'matches_pattern',
}

export interface WorkflowAnalysis {
  id: string;
  workflowId: string;
  triggerId: string;
  context: AnalysisContext;
  insights: AnalysisInsight[];
  suggestions: WorkflowSuggestion[];
  confidence: number;
  timestamp: Date;
}

// Define specific context data types
export interface TriggerData {
  type: string;
  timestamp: Date;
  source: string;
  payload: Record<string, string | number | boolean | Date>;
  // Optional properties for different trigger types
  email?: string;
  calendar?: string;
  task?: string;
  [key: string]:
    | string
    | number
    | boolean
    | Date
    | Record<string, string | number | boolean | Date>
    | undefined;
}

export interface UserActivity {
  type: 'task_completed' | 'email_sent' | 'event_attended' | 'file_created';
  timestamp: Date;
  details: string;
  impact: 'low' | 'medium' | 'high';
}

export interface UserPreferences {
  workingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  communicationStyle: 'formal' | 'casual' | 'direct';
  priorities: string[];
  automationLevel: 'conservative' | 'moderate' | 'aggressive';
  notifications: Record<string, boolean>;
}

export interface AnalysisContext {
  userId: string;
  triggerData: TriggerData;
  userContext: {
    currentTasks: number;
    upcomingEvents: number;
    recentActivity: UserActivity[];
    preferences: UserPreferences;
  };
  environmentContext: {
    timeOfDay: string;
    dayOfWeek: string;
    location?: string;
    device?: string;
  };
}

// Define specific insight data types
export interface InsightData {
  pattern?: {
    frequency: number;
    confidence: number;
    examples: string[];
  };
  anomaly?: {
    deviation: number;
    baseline: number;
    cause?: string;
  };
  opportunity?: {
    timeSavingMinutes: number;
    effortReduction: number;
    riskReduction?: number;
  };
  risk?: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    probability: number;
    impact: string;
  };
  recommendation?: {
    action: string;
    reasoning: string;
    confidence: number;
  };
  // Additional properties for workflow suggestions
  similarTasks?: string[];
  frequency?: number;
  type?: string;
  [key: string]: unknown;
}

export interface AnalysisInsight {
  type: InsightType;
  title: string;
  description: string;
  data: InsightData;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export enum InsightType {
  PATTERN_DETECTED = 'pattern_detected',
  ANOMALY_DETECTED = 'anomaly_detected',
  OPTIMIZATION_OPPORTUNITY = 'optimization_opportunity',
  RISK_IDENTIFIED = 'risk_identified',
  RECOMMENDATION = 'recommendation',
}

export interface WorkflowSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  actions: WorkflowAction[];
  priority: number;
  estimatedImpact: {
    timeSaved?: number;
    effortReduced?: number;
    riskMitigated?: number;
  };
  reasoning: string;
  confidence: number;
}

export enum SuggestionType {
  AUTOMATE_TASK = 'automate_task',
  DELEGATE_TASK = 'delegate_task',
  SCHEDULE_TASK = 'schedule_task',
  MERGE_TASKS = 'merge_tasks',
  PRIORITIZE_TASK = 'prioritize_task',
  CREATE_REMINDER = 'create_reminder',
  SUGGEST_TEMPLATE = 'suggest_template',
  OPTIMIZE_WORKFLOW = 'optimize_workflow',
}

export interface WorkflowAction {
  id: string;
  type: ActionType;
  name: string;
  description: string;
  parameters: ActionParameters;
  requires: ActionRequirement[];
  effects: ActionEffect[];
  reversible: boolean;
}

export enum ActionType {
  CREATE_TASK = 'create_task',
  UPDATE_TASK = 'update_task',
  SEND_EMAIL = 'send_email',
  SCHEDULE_EVENT = 'schedule_event',
  CREATE_REMINDER = 'create_reminder',
  EXECUTE_INTEGRATION = 'execute_integration',
  TRIGGER_WORKFLOW = 'trigger_workflow',
  GENERATE_CONTENT = 'generate_content',
  ANALYZE_DATA = 'analyze_data',
  NOTIFY_USER = 'notify_user',
}

export interface ActionParameters {
  required: Record<string, ParameterDefinition>;
  optional?: Record<string, ParameterDefinition>;
}

// Define specific parameter types and validation
export type ParameterDefaultValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | Record<string, string | number | boolean>;
export type ValidationEnum = string[] | number[];

export interface ParameterValidation {
  pattern?: string;
  min?: number;
  max?: number;
  enum?: ValidationEnum;
}

export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  description: string;
  default?: ParameterDefaultValue;
  validation?: ParameterValidation;
}

// Define specific requirement details
export interface RequirementDetails {
  permission?: {
    scope: string;
    resource: string;
    action: string;
  };
  integration?: {
    provider: string;
    scopes: string[];
    required: boolean;
  };
  data?: {
    fields: string[];
    source: string;
    format?: string;
  };
  confirmation?: {
    message: string;
    type: 'simple' | 'detailed' | 'custom';
    timeout?: number;
  };
  // Additional flexible properties for different requirement types
  scope?: string;
  reason?: string;
  service?: string;
  required?: string;
  [key: string]: unknown;
}

export interface ActionRequirement {
  type: 'permission' | 'integration' | 'data' | 'confirmation';
  details: RequirementDetails;
}

export interface ActionEffect {
  type: 'creates' | 'updates' | 'deletes' | 'notifies';
  target: string;
  description: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  trigger: WorkflowTrigger;
  analysis: WorkflowAnalysis;
  selectedSuggestions: string[];
  executedActions: ExecutedAction[];
  results: ExecutionResult[];
  error?: WorkflowError;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  SUGGESTING = 'suggesting',
  AWAITING_CONFIRMATION = 'awaiting_confirmation',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Define specific action input/output types
export interface ActionInput {
  parameters: Record<string, string | number | boolean | Date | string[] | number[]>;
  context: {
    userId: string;
    timestamp: Date;
    source: string;
  };
}

export interface ActionOutput {
  result: Record<string, string | number | boolean | Date>;
  metadata: {
    executionTime: number;
    resourcesUsed: string[];
    sideEffects?: string[];
  };
}

export interface ExecutedAction {
  actionId: string;
  executedAt: Date;
  duration: number;
  status: 'success' | 'failed' | 'skipped';
  input: ActionInput;
  output?: ActionOutput;
  error?: string;
}

// Define specific execution result data
export interface ExecutionResultData {
  success?: {
    itemsProcessed: number;
    timeTaken: number;
    resourcesCreated?: string[];
  };
  warning?: {
    warnings: string[];
    partialSuccess: boolean;
    affectedItems?: string[];
  };
  error?: {
    errorCode: string;
    stackTrace?: string;
    recoverySteps?: string[];
  };
  info?: {
    summary: string;
    details: Record<string, string | number>;
    nextSteps?: string[];
  };
}

export interface ExecutionResult {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  data?: ExecutionResultData;
}

// Define specific workflow error details
export interface WorkflowErrorDetails {
  stackTrace?: string;
  actionId?: string;
  step?: string;
  userInput?: Record<string, string | number | boolean>;
  systemState?: Record<string, string | number>;
  retryCount?: number;
  lastRetryAt?: Date;
  recoveryOptions?: string[];
}

export interface WorkflowError {
  code: string;
  message: string;
  details?: WorkflowErrorDetails;
  recoverable: boolean;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggers: WorkflowTrigger[];
  commonActions: WorkflowAction[];
  requiredIntegrations: string[];
  estimatedTimeSaving: number;
  popularity: number;
  tags: string[];
}

export interface WorkflowMetrics {
  workflowId: string;
  executionCount: number;
  successRate: number;
  averageExecutionTime: number;
  timeSaved: number;
  actionsExecuted: number;
  lastExecuted?: Date;
  userSatisfaction?: number;
}
