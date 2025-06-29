import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Define workflow preferences interface
interface WorkflowPreferences {
  autoApprove: boolean;
  autoApproveThreshold: number;
  minPriority: number;
  maxAutoActions: number;
}
import { TriggerService } from './trigger.service';
import { AnalysisService } from './analysis.service';
import { SuggestionService } from './suggestion.service';
import { ActionService } from './action.service';
import { CacheService } from '../../cache/services/cache.service';
import {
  WorkflowExecution,
  ExecutionStatus,
  WorkflowTrigger,
  TriggerType,
  TriggerCondition,
  ConditionOperator,
  WorkflowAnalysis,
  AnalysisContext,
  WorkflowSuggestion,
  WorkflowAction,
  ExecutedAction,
  ExecutionResult,
  ParameterDefinition,
  WorkflowError,
  TriggerData,
  ActionInput,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private readonly activeExecutions = new Map<string, WorkflowExecution>();

  constructor(
    private prisma: PrismaService,
    private triggerService: TriggerService,
    private analysisService: AnalysisService,
    private suggestionService: SuggestionService,
    private actionService: ActionService,
    private cacheService: CacheService,
    private eventEmitter: EventEmitter2
  ) {
    // Initialize cache for workflow engine
    this.cacheService.get('workflow-engine:initialized').then(() => {
      this.logger.debug('Workflow engine cache initialized');
    });
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    userId: string,
    triggerId: string,
    triggerData: Prisma.JsonObject
  ): Promise<WorkflowExecution> {
    const executionId = this.generateExecutionId();

    try {
      // Create execution record
      const execution = await this.createExecution(executionId, userId, triggerId, triggerData);

      // Start execution
      this.activeExecutions.set(executionId, execution);

      // Run TASA++ loop
      const result = await this.runTASALoop(execution, userId);

      // Update execution with results
      const finalExecution = await this.completeExecution(executionId, result);

      this.activeExecutions.delete(executionId);

      return finalExecution;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Workflow execution failed: ${errorMessage}`);

      // Update execution status
      const workflowError = error instanceof Error ? error : new Error(String(error));
      await this.failExecution(executionId, workflowError);

      throw new BusinessException(
        'Workflow execution failed',
        'WORKFLOW_EXECUTION_FAILED',
        undefined,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Run TASA++ loop
   */
  private async runTASALoop(
    execution: WorkflowExecution,
    userId: string
  ): Promise<{
    analysis: WorkflowAnalysis;
    suggestions: WorkflowSuggestion[];
    actions: ExecutedAction[];
    results: ExecutionResult[];
  }> {
    // Update status: Analyzing
    await this.updateExecutionStatus(execution.id, ExecutionStatus.ANALYZING);

    // Step 1: Analysis
    const triggerData: TriggerData = {
      type: execution.trigger.type.toString(),
      timestamp: new Date(),
      source: 'workflow_engine',
      payload:
        (execution.trigger.metadata as Record<string, string | number | boolean | Date>) || {},
    };

    const analysis = await this.analysisService.analyzeWorkflow(
      userId,
      execution.trigger.id,
      triggerData
    );

    // Update execution with analysis
    execution.analysis = analysis;

    // Emit analysis complete event
    this.eventEmitter.emit('workflow.analysis.complete', {
      executionId: execution.id,
      insights: analysis.insights.length,
    });

    // Update status: Suggesting
    await this.updateExecutionStatus(execution.id, ExecutionStatus.SUGGESTING);

    // Step 2: Generate Suggestions
    const suggestions = await this.suggestionService.generateSuggestions(analysis);

    // Update analysis with suggestions
    analysis.suggestions = suggestions;

    // Emit suggestions ready event
    this.eventEmitter.emit('workflow.suggestions.ready', {
      executionId: execution.id,
      suggestions: suggestions.length,
    });

    // Step 3: Get user confirmation (auto-approve for now based on confidence)
    const approvedSuggestions = await this.getApprovedSuggestions(
      userId,
      execution.id,
      suggestions
    );

    execution.selectedSuggestions = approvedSuggestions.map(s => s.id);

    // Update status: Executing
    await this.updateExecutionStatus(execution.id, ExecutionStatus.EXECUTING);

    // Step 4: Execute Actions
    const executedActions: ExecutedAction[] = [];
    const results: ExecutionResult[] = [];

    for (const suggestion of approvedSuggestions) {
      for (const action of suggestion.actions) {
        // Prepare action parameters
        const parameters = await this.prepareActionParameters(action, analysis.context, suggestion);

        // Execute action
        const actionInput: ActionInput = {
          parameters: parameters as Record<
            string,
            string | number | boolean | Date | string[] | number[]
          >,
          context: {
            userId,
            timestamp: new Date(),
            source: 'workflow_engine',
          },
        };
        const executedAction = await this.actionService.executeAction(userId, action, actionInput);

        executedActions.push(executedAction);

        // Add result
        if (executedAction.status === 'success') {
          results.push({
            type: 'success',
            message: `${action.name} completed successfully`,
            data: {
              success: {
                itemsProcessed: 1,
                timeTaken: executedAction.duration || 0,
                resourcesCreated: [],
              },
            },
          });
        } else {
          results.push({
            type: 'error',
            message: `${action.name} failed: ${executedAction.error}`,
            data: {
              error: {
                errorCode: 'ACTION_EXECUTION_FAILED',
                stackTrace: executedAction.error,
                recoverySteps: [],
              },
            },
          });
        }
      }
    }

    // Emit execution complete event
    this.eventEmitter.emit('workflow.execution.complete', {
      executionId: execution.id,
      actionsExecuted: executedActions.length,
      successCount: executedActions.filter(a => a.status === 'success').length,
    });

    return {
      analysis,
      suggestions,
      actions: executedActions,
      results,
    };
  }

  /**
   * Get approved suggestions (auto-approve based on confidence)
   */
  private async getApprovedSuggestions(
    userId: string,
    executionId: string,
    suggestions: WorkflowSuggestion[]
  ): Promise<WorkflowSuggestion[]> {
    // Log the approval check for audit trail
    this.logger.debug(`Checking suggestions for auto-approval: execution ${executionId}`);

    // Check user preferences for auto-approval
    const preferences = await this.getUserWorkflowPreferences(userId);

    if (preferences.autoApprove) {
      // Auto-approve high-confidence suggestions
      return suggestions.filter(
        s =>
          s.confidence >= preferences.autoApproveThreshold && s.priority >= preferences.minPriority
      );
    }

    // In a real implementation, this would wait for user confirmation
    // For now, approve top suggestions
    return suggestions.filter(s => s.confidence >= 0.7).slice(0, preferences.maxAutoActions || 3);
  }

  /**
   * Prepare action parameters
   */
  private async prepareActionParameters(
    action: WorkflowAction,
    context: AnalysisContext,
    suggestion: WorkflowSuggestion
  ): Promise<Prisma.JsonObject> {
    const parameters: Prisma.JsonObject = {};

    // Fill in required parameters
    for (const [key, definition] of Object.entries(action.parameters.required)) {
      const paramDef = definition as ParameterDefinition;
      // Use default if available
      if (paramDef.default !== undefined) {
        parameters[key] =
          paramDef.default instanceof Date ? paramDef.default.toISOString() : paramDef.default;
        continue;
      }

      // Extract from context or suggestion
      const value = this.extractParameterValue(key, paramDef, context, suggestion);
      parameters[key] = value instanceof Date ? value.toISOString() : value;
    }

    // Add optional parameters if available
    if (action.parameters.optional) {
      for (const [key, definition] of Object.entries(action.parameters.optional)) {
        const paramDef = definition as ParameterDefinition;
        const value = this.extractParameterValue(key, paramDef, context, suggestion);
        if (value !== undefined) {
          parameters[key] = value instanceof Date ? value.toISOString() : value;
        }
      }
    }

    return parameters;
  }

  /**
   * Extract parameter value from context
   */
  private extractParameterValue(
    key: string,
    definition: ParameterDefinition,
    context: AnalysisContext,
    suggestion: WorkflowSuggestion
  ): string | number | boolean | Date | string[] | Prisma.JsonObject {
    // Check suggestion data first
    const defaultValue = suggestion.actions[0]?.parameters?.required[key]?.default;
    if (defaultValue !== undefined) {
      // Convert number[] to string[] if needed
      if (Array.isArray(defaultValue) && defaultValue.every(item => typeof item === 'number')) {
        return defaultValue.map(String);
      }
      return defaultValue as string | number | boolean | Date | string[] | Prisma.JsonObject;
    }

    // Check context trigger data payload
    if (context.triggerData.payload[key] !== undefined) {
      return context.triggerData.payload[key];
    }

    // Generate based on type
    switch (definition.type) {
      case 'string':
        return this.generateStringValue(key, context);
      case 'date':
        return this.generateDateValue(key, context);
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return '';
    }
  }

  /**
   * Generate string value based on key
   */
  private generateStringValue(key: string, context: AnalysisContext): string {
    // Use context data if available for personalization
    const userContext = context.userContext;
    const isBusy = userContext.currentTasks > 3;
    const defaults: Record<string, string> = {
      title: `Automated task from workflow for ${isBusy ? 'busy' : 'normal'} schedule`,
      description: `Created by workflow automation based on current context`,
      subject: `Workflow notification`,
      message: `This is an automated message from your workflow`,
    };

    return defaults[key] || `Generated ${key}`;
  }

  /**
   * Generate date value based on key
   */
  private generateDateValue(key: string, context: AnalysisContext): Date {
    const now = new Date();
    const timeOfDay = context.environmentContext.timeOfDay || '';
    const timeAdjustment = timeOfDay.includes('evening') ? 1 : 0;

    switch (key) {
      case 'startTime':
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      case 'endTime':
        return new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
      case 'dueDate':
        return new Date(now.getTime() + (24 + timeAdjustment) * 60 * 60 * 1000); // Tomorrow, adjusted for evening context
      case 'remindAt':
        return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      default:
        return now;
    }
  }

  /**
   * Create workflow execution
   */
  private async createExecution(
    executionId: string,
    userId: string,
    triggerId: string,
    triggerData: Prisma.JsonObject
  ): Promise<WorkflowExecution> {
    // Get trigger details
    const triggers = await this.triggerService.getUserTriggers(userId);
    const trigger = triggers.find(t => t.id === triggerId);

    if (!trigger) {
      throw new Error(`Trigger ${triggerId} not found`);
    }

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: `workflow-${triggerId}`,
      status: ExecutionStatus.PENDING,
      startedAt: new Date(),
      trigger: {
        ...trigger,
        metadata: { ...trigger.metadata, ...triggerData },
      },
      analysis: {} as WorkflowAnalysis,
      selectedSuggestions: [],
      executedActions: [],
      results: [],
    };

    // Store in database
    await this.prisma.workflowExecution.create({
      data: {
        id: executionId,
        userId,
        workflowId: execution.workflowId,
        status: execution.status,
        startedAt: execution.startedAt,
        triggerData: triggerData,
        analysisData: {},
        selectedSuggestions: [],
        executedActions: [],
        result: [],
      },
    });

    return execution;
  }

  /**
   * Update execution status
   */
  private async updateExecutionStatus(executionId: string, status: ExecutionStatus): Promise<void> {
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status },
    });

    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = status;
    }

    this.eventEmitter.emit('workflow.status.changed', {
      executionId,
      status,
    });
  }

  /**
   * Complete workflow execution
   */
  private async completeExecution(
    executionId: string,
    result: {
      analysis: WorkflowAnalysis;
      suggestions: WorkflowSuggestion[];
      actions: ExecutedAction[];
      results: ExecutionResult[];
    }
  ): Promise<WorkflowExecution> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    execution.status = ExecutionStatus.COMPLETED;
    execution.completedAt = new Date();
    execution.analysis = result.analysis;
    execution.executedActions = result.actions;
    execution.results = result.results;

    // Update database
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.COMPLETED,
        completedAt: execution.completedAt,
        analysisData: JSON.parse(JSON.stringify(result.analysis)),
        selectedSuggestions: execution.selectedSuggestions,
        executedActions: JSON.parse(JSON.stringify(result.actions)),
        result: JSON.parse(JSON.stringify(result.results)),
      },
    });

    // Record metrics
    await this.recordExecutionMetrics(execution);

    return execution;
  }

  /**
   * Fail workflow execution
   */
  private async failExecution(executionId: string, error: Error | WorkflowError): Promise<void> {
    const workflowError: WorkflowError = {
      code: 'code' in error ? error.code : 'UNKNOWN_ERROR',
      message: error.message,
      details: 'details' in error ? error.details : undefined,
      recoverable: false,
    };

    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.FAILED,
        completedAt: new Date(),
        error: JSON.parse(JSON.stringify(workflowError)),
      },
    });

    this.activeExecutions.delete(executionId);
  }

  /**
   * Get user workflow preferences
   */
  private async getUserWorkflowPreferences(userId: string): Promise<WorkflowPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const preferences = (user?.preferences as Prisma.JsonObject) || {};

    return {
      autoApprove: (preferences.workflowAutoApprove as boolean) ?? true,
      autoApproveThreshold: (preferences.workflowConfidenceThreshold as number) ?? 0.8,
      minPriority: (preferences.workflowMinPriority as number) ?? 6,
      maxAutoActions: (preferences.workflowMaxAutoActions as number) ?? 3,
    };
  }

  /**
   * Record execution metrics
   */
  private async recordExecutionMetrics(execution: WorkflowExecution): Promise<void> {
    if (!execution.completedAt) {
      this.logger.warn('Cannot record metrics for incomplete execution');
      return;
    }

    const duration = execution.completedAt.getTime() - execution.startedAt.getTime();
    const successCount = execution.executedActions.filter(a => a.status === 'success').length;
    const timeSaved = this.calculateTimeSaved(execution);

    this.logger.debug(
      `Recording metrics for workflow ${execution.workflowId}: duration=${duration}ms, timeSaved=${timeSaved}min`
    );

    await this.prisma.workflowMetrics.upsert({
      where: { workflowId: execution.workflowId },
      create: {
        workflowId: execution.workflowId,
        executionCount: 1,
        successRate: successCount / Math.max(1, execution.executedActions.length),
        avgDuration: duration,
        lastExecuted: new Date(),
      },
      update: {
        executionCount: { increment: 1 },
        avgDuration: duration, // Would need proper averaging in production
        successRate: successCount / Math.max(1, execution.executedActions.length),
        lastExecuted: new Date(),
      },
    });
  }

  /**
   * Calculate time saved by automation
   */
  private calculateTimeSaved(execution: WorkflowExecution): number {
    let totalSaved = 0;

    for (const suggestionId of execution.selectedSuggestions) {
      const suggestion = execution.analysis.suggestions.find(s => s.id === suggestionId);
      if (suggestion?.estimatedImpact?.timeSaved) {
        totalSaved += suggestion.estimatedImpact.timeSaved;
      }
    }

    return totalSaved;
  }

  /**
   * Generate execution ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<WorkflowExecution | null> {
    // Check active executions first
    const active = this.activeExecutions.get(executionId);
    if (active) {
      return active;
    }

    // Check database
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      return null;
    }

    return {
      id: execution.id,
      workflowId: execution.workflowId,
      status: this.validateExecutionStatus(execution.status),
      startedAt: execution.startedAt,
      completedAt: execution.completedAt || undefined,
      trigger: this.validateWorkflowTrigger(execution.triggerData),
      analysis: this.validateWorkflowAnalysis(execution.analysisData),
      selectedSuggestions: this.validateStringArray(execution.selectedSuggestions),
      executedActions: this.validateExecutedActions(execution.executedActions),
      results: this.validateExecutionResults(execution.result),
      error: this.validateWorkflowError(execution.error),
    };
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new BusinessException(
        'Execution not found or already completed',
        'EXECUTION_NOT_FOUND'
      );
    }

    execution.status = ExecutionStatus.CANCELLED;
    execution.completedAt = new Date();

    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.CANCELLED,
        completedAt: execution.completedAt,
      },
    });

    this.activeExecutions.delete(executionId);

    this.eventEmitter.emit('workflow.execution.cancelled', {
      executionId,
    });
  }

  private convertToTriggerConditions(conditions: Prisma.JsonValue): TriggerCondition[] {
    if (!Array.isArray(conditions)) {
      return [];
    }

    const result: TriggerCondition[] = [];
    for (const condition of conditions) {
      if (condition && typeof condition === 'object' && 'field' in condition) {
        const conditionObj = condition as Record<string, Prisma.JsonValue>;
        if (
          typeof conditionObj.field === 'string' &&
          typeof conditionObj.operator === 'string' &&
          conditionObj.value !== undefined
        ) {
          const validOperator = Object.values(ConditionOperator).includes(
            conditionObj.operator as ConditionOperator
          )
            ? (conditionObj.operator as ConditionOperator)
            : ConditionOperator.EQUALS;

          result.push({
            field: conditionObj.field,
            operator: validOperator,
            value: conditionObj.value as string | number | boolean | Date | string[] | number[],
            logicalOperator:
              conditionObj.logicalOperator === 'AND' || conditionObj.logicalOperator === 'OR'
                ? conditionObj.logicalOperator
                : undefined,
          });
        }
      }
    }
    return result;
  }

  private validateExecutionStatus(status: string): ExecutionStatus {
    if (Object.values(ExecutionStatus).includes(status as ExecutionStatus)) {
      return status as ExecutionStatus;
    }
    this.logger.warn(`Invalid execution status: ${status}, defaulting to PENDING`);
    return ExecutionStatus.PENDING;
  }

  private validateWorkflowTrigger(data: Prisma.JsonValue): WorkflowTrigger {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {
        id: 'unknown',
        type: TriggerType.MANUAL,
        conditions: [],
        enabled: true,
        metadata: {},
      };
    }

    const triggerData = data as Record<string, Prisma.JsonValue>;
    return {
      id: typeof triggerData.id === 'string' ? triggerData.id : 'unknown',
      type:
        typeof triggerData.type === 'string' &&
        Object.values(TriggerType).includes(triggerData.type as TriggerType)
          ? (triggerData.type as TriggerType)
          : TriggerType.MANUAL,
      conditions: this.convertToTriggerConditions(triggerData.conditions),
      enabled: typeof triggerData.enabled === 'boolean' ? triggerData.enabled : true,
      metadata:
        triggerData.metadata &&
        typeof triggerData.metadata === 'object' &&
        !Array.isArray(triggerData.metadata)
          ? (triggerData.metadata as Record<string, Prisma.JsonValue>)
          : {},
    };
  }

  private validateWorkflowAnalysis(data: Prisma.JsonValue): WorkflowAnalysis {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Invalid analysis data provided');
    }

    const analysisData = data as Record<string, Prisma.JsonValue>;

    if (!analysisData.id || !analysisData.workflowId || !analysisData.triggerId) {
      throw new Error('Analysis must have id, workflowId, and triggerId');
    }

    const contextData = analysisData.context;
    if (!contextData || typeof contextData !== 'object' || Array.isArray(contextData)) {
      throw new Error('Analysis must have valid context');
    }

    const context = contextData as Record<string, Prisma.JsonValue>;
    if (!context.userId) {
      throw new Error('Analysis must have valid context with userId');
    }

    const userContext =
      context.userContext &&
      typeof context.userContext === 'object' &&
      !Array.isArray(context.userContext)
        ? (context.userContext as Record<string, Prisma.JsonValue>)
        : {};

    const environmentContext =
      context.environmentContext &&
      typeof context.environmentContext === 'object' &&
      !Array.isArray(context.environmentContext)
        ? (context.environmentContext as Record<string, Prisma.JsonValue>)
        : {};

    return {
      id: String(analysisData.id),
      workflowId: String(analysisData.workflowId),
      triggerId: String(analysisData.triggerId),
      context: {
        userId: String(context.userId),
        triggerData: {
          type: 'manual',
          timestamp: new Date(),
          source: 'workflow',
          payload:
            context.triggerData &&
            typeof context.triggerData === 'object' &&
            !Array.isArray(context.triggerData)
              ? (context.triggerData as Record<string, string | number | boolean | Date>)
              : {},
        },
        userContext: {
          currentTasks: typeof userContext.currentTasks === 'number' ? userContext.currentTasks : 0,
          upcomingEvents:
            typeof userContext.upcomingEvents === 'number' ? userContext.upcomingEvents : 0,
          recentActivity: [], // Will be empty for now since we can't properly convert string[] to UserActivity[]
          preferences: {
            workingHours: { start: '09:00', end: '17:00', timezone: 'UTC' },
            communicationStyle: 'formal',
            priorities: ['work', 'personal'],
            automationLevel: 'moderate',
            notifications: {
              email: true,
              push: true,
              sms: false,
              inApp: true,
            },
          },
        },
        environmentContext: {
          timeOfDay:
            typeof environmentContext.timeOfDay === 'string'
              ? environmentContext.timeOfDay
              : new Date().toTimeString(),
          dayOfWeek:
            typeof environmentContext.dayOfWeek === 'string'
              ? environmentContext.dayOfWeek
              : new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          location:
            typeof environmentContext.location === 'string'
              ? environmentContext.location
              : undefined,
          device:
            typeof environmentContext.device === 'string' ? environmentContext.device : undefined,
        },
      },
      insights: [], // Will be empty for now since we can't properly convert string[] to AnalysisInsight[]
      suggestions: [], // Will be empty for now since we can't properly convert JsonArray to WorkflowSuggestion[]
      confidence: typeof analysisData.confidence === 'number' ? analysisData.confidence : 0,
      timestamp:
        typeof analysisData.timestamp === 'string' ? new Date(analysisData.timestamp) : new Date(),
    };
  }

  private validateStringArray(data: Prisma.JsonValue): string[] {
    if (Array.isArray(data)) {
      return data.filter(item => typeof item === 'string') as string[];
    }
    return [];
  }

  private validateExecutedActions(data: Prisma.JsonValue): ExecutedAction[] {
    if (Array.isArray(data)) {
      return data
        .filter(item => {
          return item && typeof item === 'object' && !Array.isArray(item);
        })
        .map(item => {
          const actionObj = item as Record<string, Prisma.JsonValue>;
          return {
            actionId: typeof actionObj.actionId === 'string' ? actionObj.actionId : '',
            executedAt: this.parseDate(actionObj.executedAt) || new Date(),
            duration: typeof actionObj.duration === 'number' ? actionObj.duration : 0,
            status:
              typeof actionObj.status === 'string'
                ? (actionObj.status as 'success' | 'failed' | 'skipped')
                : 'success',
            input: this.parseActionInput(actionObj.input),
            output: this.parseActionOutput(actionObj.output),
            error: typeof actionObj.error === 'string' ? actionObj.error : undefined,
          };
        });
    }
    return [];
  }

  private parseDate(value: Prisma.JsonValue): Date | undefined {
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }

  private parseActionInput(value: Prisma.JsonValue): {
    parameters: Record<string, string | number | boolean | Date | string[] | number[]>;
    context: { userId: string; timestamp: Date; source: string };
  } {
    const defaultInput = {
      parameters: {},
      context: {
        userId: '',
        timestamp: new Date(),
        source: 'workflow',
      },
    };

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return defaultInput;
    }

    const inputObj = value as Record<string, Prisma.JsonValue>;
    const result = { ...defaultInput };

    if (
      inputObj.parameters &&
      typeof inputObj.parameters === 'object' &&
      !Array.isArray(inputObj.parameters)
    ) {
      const params = inputObj.parameters as Record<string, Prisma.JsonValue>;
      const validParameters: Record<
        string,
        string | number | boolean | Date | string[] | number[]
      > = {};
      for (const [key, val] of Object.entries(params)) {
        if (
          typeof val === 'string' ||
          typeof val === 'number' ||
          typeof val === 'boolean' ||
          Array.isArray(val)
        ) {
          validParameters[key] = val as string | number | boolean | string[] | number[];
        }
      }
      result.parameters = validParameters;
    }

    if (
      inputObj.context &&
      typeof inputObj.context === 'object' &&
      !Array.isArray(inputObj.context)
    ) {
      const ctx = inputObj.context as Record<string, Prisma.JsonValue>;
      if (typeof ctx.userId === 'string') result.context.userId = ctx.userId;
      if (typeof ctx.source === 'string') result.context.source = ctx.source;
      const timestamp = this.parseDate(ctx.timestamp);
      if (timestamp) result.context.timestamp = timestamp;
    }

    return result;
  }

  private parseActionOutput(value: Prisma.JsonValue):
    | {
        result: Record<string, string | number | boolean | Date>;
        metadata: { executionTime: number; resourcesUsed: string[]; sideEffects?: string[] };
      }
    | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    const outputObj = value as Record<string, Prisma.JsonValue>;
    const result: Record<string, string | number | boolean | Date> = {};
    const metadata = {
      executionTime: 0,
      resourcesUsed: [] as string[],
      sideEffects: undefined as string[] | undefined,
    };

    if (
      outputObj.result &&
      typeof outputObj.result === 'object' &&
      !Array.isArray(outputObj.result)
    ) {
      const resultObj = outputObj.result as Record<string, Prisma.JsonValue>;
      for (const [key, val] of Object.entries(resultObj)) {
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          result[key] = val;
        } else if (typeof val === 'string' && !isNaN(Date.parse(val))) {
          result[key] = new Date(val);
        }
      }
    }

    if (
      outputObj.metadata &&
      typeof outputObj.metadata === 'object' &&
      !Array.isArray(outputObj.metadata)
    ) {
      const metaObj = outputObj.metadata as Record<string, Prisma.JsonValue>;
      if (typeof metaObj.executionTime === 'number') metadata.executionTime = metaObj.executionTime;
      if (Array.isArray(metaObj.resourcesUsed)) {
        metadata.resourcesUsed = metaObj.resourcesUsed.filter(
          r => typeof r === 'string'
        ) as string[];
      }
      if (Array.isArray(metaObj.sideEffects)) {
        metadata.sideEffects = metaObj.sideEffects.filter(s => typeof s === 'string') as string[];
      }
    }

    return { result, metadata };
  }

  private validateExecutionResults(data: Prisma.JsonValue): ExecutionResult[] {
    if (Array.isArray(data)) {
      return data
        .filter(item => {
          return item && typeof item === 'object' && !Array.isArray(item);
        })
        .map(item => {
          const itemObj = item as Record<string, Prisma.JsonValue>;
          return {
            type:
              typeof itemObj.type === 'string'
                ? (itemObj.type as 'success' | 'warning' | 'error' | 'info')
                : 'info',
            message: typeof itemObj.message === 'string' ? itemObj.message : '',
            data: this.extractResultData(itemObj.data),
          };
        });
    }
    return [];
  }

  private extractResultData(
    data: Prisma.JsonValue
  ): Record<string, string | number | boolean> | undefined {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return undefined;
    }

    const result: Record<string, string | number | boolean> = {};
    const dataObj = data as Record<string, Prisma.JsonValue>;

    for (const [key, value] of Object.entries(dataObj)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private validateWorkflowError(data: Prisma.JsonValue): WorkflowError | undefined {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return undefined;
    }

    const errorData = data as Record<string, Prisma.JsonValue>;

    return {
      code: typeof errorData.code === 'string' ? errorData.code : 'UNKNOWN_ERROR',
      message: typeof errorData.message === 'string' ? errorData.message : 'An error occurred',
      details: this.extractErrorDetails(errorData),
      recoverable: typeof errorData.recoverable === 'boolean' ? errorData.recoverable : false,
    };
  }

  private extractErrorDetails(
    errorData: Record<string, Prisma.JsonValue>
  ): Record<string, string | number | boolean> {
    const details: Record<string, string | number | boolean> = {};

    const detailsData = errorData.details || errorData.context;
    if (detailsData && typeof detailsData === 'object' && !Array.isArray(detailsData)) {
      const detailsObj = detailsData as Record<string, Prisma.JsonValue>;
      for (const [key, value] of Object.entries(detailsObj)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          details[key] = value;
        }
      }
    }

    return details;
  }
}
