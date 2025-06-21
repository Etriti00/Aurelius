import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
  WorkflowAnalysis,
  AnalysisContext,
  WorkflowSuggestion,
  ExecutedAction,
  ExecutionResult,
  ParameterDefinition,
  WorkflowError,
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
    private eventEmitter: EventEmitter2,
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
    triggerData: Record<string, any>,
  ): Promise<WorkflowExecution> {
    const executionId = this.generateExecutionId();
    
    try {
      // Create execution record
      const execution = await this.createExecution(
        executionId,
        userId,
        triggerId,
        triggerData,
      );

      // Start execution
      this.activeExecutions.set(executionId, execution);
      
      // Run TASA++ loop
      const result = await this.runTASALoop(execution, userId);
      
      // Update execution with results
      const finalExecution = await this.completeExecution(executionId, result);
      
      this.activeExecutions.delete(executionId);
      
      return finalExecution;
    } catch (error: any) {
      this.logger.error(`Workflow execution failed: ${error.message}`);
      
      // Update execution status
      await this.failExecution(executionId, error);
      
      throw new BusinessException(
        'Workflow execution failed',
        'WORKFLOW_EXECUTION_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Run TASA++ loop
   */
  private async runTASALoop(
    execution: WorkflowExecution,
    userId: string,
  ): Promise<{
    analysis: WorkflowAnalysis;
    suggestions: WorkflowSuggestion[];
    actions: ExecutedAction[];
    results: ExecutionResult[];
  }> {
    // Update status: Analyzing
    await this.updateExecutionStatus(execution.id, ExecutionStatus.ANALYZING);
    
    // Step 1: Analysis
    const analysis = await this.analysisService.analyzeWorkflow(
      userId,
      execution.trigger.id,
      execution.trigger.metadata || {},
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
      suggestions,
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
        const parameters = await this.prepareActionParameters(
          action,
          analysis.context,
          suggestion,
        );
        
        // Execute action
        const executedAction = await this.actionService.executeAction(
          userId,
          action,
          parameters,
        );
        
        executedActions.push(executedAction);
        
        // Add result
        if (executedAction.status === 'success') {
          results.push({
            type: 'success',
            message: `${action.name} completed successfully`,
            data: executedAction.output,
          });
        } else {
          results.push({
            type: 'error',
            message: `${action.name} failed: ${executedAction.error}`,
            data: { error: executedAction.error },
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
    suggestions: WorkflowSuggestion[],
  ): Promise<WorkflowSuggestion[]> {
    // Log the approval check for audit trail
    this.logger.debug(`Checking suggestions for auto-approval: execution ${executionId}`);
    
    // Check user preferences for auto-approval
    const preferences = await this.getUserWorkflowPreferences(userId);
    
    if (preferences.autoApprove) {
      // Auto-approve high-confidence suggestions
      return suggestions.filter(s => 
        s.confidence >= preferences.autoApproveThreshold &&
        s.priority >= preferences.minPriority
      );
    }
    
    // In a real implementation, this would wait for user confirmation
    // For now, approve top suggestions
    return suggestions
      .filter(s => s.confidence >= 0.7)
      .slice(0, preferences.maxAutoActions || 3);
  }

  /**
   * Prepare action parameters
   */
  private async prepareActionParameters(
    action: any,
    context: any,
    suggestion: WorkflowSuggestion,
  ): Promise<Record<string, any>> {
    const parameters: Record<string, any> = {};
    
    // Fill in required parameters
    for (const [key, definition] of Object.entries(action.parameters.required)) {
      const paramDef = definition as ParameterDefinition;
      // Use default if available
      if (paramDef.default !== undefined) {
        parameters[key] = paramDef.default;
        continue;
      }
      
      // Extract from context or suggestion
      parameters[key] = this.extractParameterValue(key, paramDef, context, suggestion);
    }
    
    // Add optional parameters if available
    if (action.parameters.optional) {
      for (const [key, definition] of Object.entries(action.parameters.optional)) {
        const paramDef = definition as ParameterDefinition;
        const value = this.extractParameterValue(key, paramDef, context, suggestion);
        if (value !== undefined) {
          parameters[key] = value;
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
    suggestion: WorkflowSuggestion,
  ): any {
    // Check suggestion data first
    if (suggestion.actions[0]?.parameters?.required[key]) {
      return suggestion.actions[0].parameters.required[key].default;
    }
    
    // Check context trigger data
    if (context.triggerData[key] !== undefined) {
      return context.triggerData[key];
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
        return undefined;
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
    triggerData: Record<string, any>,
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
  private async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
  ): Promise<void> {
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
    result: any,
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
        analysisData: result.analysis,
        selectedSuggestions: execution.selectedSuggestions,
        executedActions: result.actions,
        result: result.results,
      },
    });

    // Record metrics
    await this.recordExecutionMetrics(execution);

    return execution;
  }

  /**
   * Fail workflow execution
   */
  private async failExecution(
    executionId: string,
    error: any,
  ): Promise<void> {
    const workflowError: WorkflowError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      details: error.details,
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
  private async getUserWorkflowPreferences(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const preferences = user?.preferences as any || {};

    return {
      autoApprove: preferences?.workflowAutoApprove ?? true,
      autoApproveThreshold: preferences?.workflowConfidenceThreshold ?? 0.8,
      minPriority: preferences?.workflowMinPriority ?? 6,
      maxAutoActions: preferences?.workflowMaxAutoActions ?? 3,
    };
  }

  /**
   * Record execution metrics
   */
  private async recordExecutionMetrics(execution: WorkflowExecution): Promise<void> {
    const duration = execution.completedAt!.getTime() - execution.startedAt.getTime();
    const successCount = execution.executedActions.filter(a => a.status === 'success').length;
    const timeSaved = this.calculateTimeSaved(execution);
    
    this.logger.debug(`Recording metrics for workflow ${execution.workflowId}: duration=${duration}ms, timeSaved=${timeSaved}min`);
    
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
        'EXECUTION_NOT_FOUND',
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

  private validateExecutionStatus(status: string): ExecutionStatus {
    if (Object.values(ExecutionStatus).includes(status as ExecutionStatus)) {
      return status as ExecutionStatus;
    }
    this.logger.warn(`Invalid execution status: ${status}, defaulting to PENDING`);
    return ExecutionStatus.PENDING;
  }

  private validateWorkflowTrigger(data: any): WorkflowTrigger {
    if (!data || typeof data !== 'object') {
      return {
        id: 'unknown',
        type: TriggerType.MANUAL,
        conditions: [],
        enabled: true,
        metadata: {},
      };
    }
    return data as WorkflowTrigger;
  }

  private validateWorkflowAnalysis(data: any): WorkflowAnalysis {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid analysis data provided');
    }
    
    if (!data.id || !data.workflowId || !data.triggerId) {
      throw new Error('Analysis must have id, workflowId, and triggerId');
    }
    
    if (!data.context || !data.context.userId) {
      throw new Error('Analysis must have valid context with userId');
    }
    
    return {
      id: data.id,
      workflowId: data.workflowId,
      triggerId: data.triggerId,
      context: {
        userId: data.context.userId,
        triggerData: data.context.triggerData || {},
        userContext: {
          currentTasks: data.context.userContext?.currentTasks || 0,
          upcomingEvents: data.context.userContext?.upcomingEvents || 0,
          recentActivity: data.context.userContext?.recentActivity || [],
          preferences: data.context.userContext?.preferences || {}
        },
        environmentContext: {
          timeOfDay: data.context.environmentContext?.timeOfDay || new Date().toTimeString(),
          dayOfWeek: data.context.environmentContext?.dayOfWeek || new Date().toLocaleDateString('en-US', { weekday: 'long' }),
          location: data.context.environmentContext?.location,
          device: data.context.environmentContext?.device
        }
      },
      insights: data.insights || [],
      suggestions: data.suggestions || [],
      confidence: data.confidence || 0,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    };
  }

  private validateStringArray(data: any): string[] {
    if (Array.isArray(data)) {
      return data.filter(item => typeof item === 'string');
    }
    return [];
  }

  private validateExecutedActions(data: any): ExecutedAction[] {
    if (Array.isArray(data)) {
      return data.filter(item => {
        return item && typeof item === 'object' && 
               typeof item.actionId === 'string';
      }).map(item => ({
        actionId: item.actionId,
        executedAt: item.executedAt ? new Date(item.executedAt) : new Date(),
        duration: typeof item.duration === 'number' ? item.duration : 0,
        status: item.status || 'completed',
        input: item.input || {},
        output: item.output || {},
      }));
    }
    return [];
  }

  private validateExecutionResults(data: any): ExecutionResult[] {
    if (Array.isArray(data)) {
      return data.filter(item => {
        return item && typeof item === 'object' && 
               typeof item.type === 'string';
      }).map(item => ({
        type: item.type,
        message: item.message || '',
        data: item.data || {},
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
      }));
    }
    return [];
  }

  private validateWorkflowError(data: any): WorkflowError | undefined {
    if (!data || typeof data !== 'object') {
      return undefined;
    }
    return {
      code: data.code || 'UNKNOWN_ERROR',
      message: data.message || 'An error occurred',
      details: data.details || data.context || {},
      recoverable: typeof data.recoverable === 'boolean' ? data.recoverable : false,
    };
  }
}