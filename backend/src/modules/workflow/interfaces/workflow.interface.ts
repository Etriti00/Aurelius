export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  conditions: TriggerCondition[];
  enabled: boolean;
  metadata?: Record<string, any>;
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

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
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

export interface AnalysisContext {
  userId: string;
  triggerData: Record<string, any>;
  userContext: {
    currentTasks: number;
    upcomingEvents: number;
    recentActivity: any[];
    preferences: Record<string, any>;
  };
  environmentContext: {
    timeOfDay: string;
    dayOfWeek: string;
    location?: string;
    device?: string;
  };
}

export interface AnalysisInsight {
  type: InsightType;
  title: string;
  description: string;
  data: Record<string, any>;
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

export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  description: string;
  default?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export interface ActionRequirement {
  type: 'permission' | 'integration' | 'data' | 'confirmation';
  details: Record<string, any>;
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

export interface ExecutedAction {
  actionId: string;
  executedAt: Date;
  duration: number;
  status: 'success' | 'failed' | 'skipped';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
}

export interface ExecutionResult {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  data?: Record<string, any>;
}

export interface WorkflowError {
  code: string;
  message: string;
  details?: Record<string, any>;
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
