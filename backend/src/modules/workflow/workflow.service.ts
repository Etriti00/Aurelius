import { Injectable, Logger } from '@nestjs/common';
import { Workflow, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TriggerService } from './services/trigger.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { WorkflowTemplateService } from './services/workflow-template.service';
import { CacheService } from '../cache/services/cache.service';
import {
  WorkflowTrigger,
  WorkflowExecution,
  WorkflowTemplate,
  WorkflowMetrics,
  ExecutionStatus,
  WorkflowAnalysis,
  ExecutedAction,
  ExecutionResult,
  WorkflowError,
  WorkflowErrorDetails,
  TriggerType,
  TriggerCondition,
  ConditionOperator,
  ConditionValue,
  AnalysisContext,
  AnalysisInsight,
  InsightType,
  WorkflowSuggestion,
  SuggestionType,
  TriggerMetadata,
  ActionInput,
  ActionOutput,
} from './interfaces';
import { BusinessException } from '../../common/exceptions';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private triggerService: TriggerService,
    private workflowEngine: WorkflowEngineService,
    private templateService: WorkflowTemplateService,
    private cacheService: CacheService
  ) {
    this.logger.debug('Workflow service initialized with all dependencies');
    // Initialize cache warming for frequently accessed workflows
    this.cacheService.get('workflow:popular').then(result => {
      if (!result) {
        this.logger.debug('Cache warming initialized for workflow service');
      }
    });
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    userId: string,
    name: string,
    description: string,
    triggers: Omit<WorkflowTrigger, 'id'>[]
  ): Promise<{
    workflowId: string;
    triggers: WorkflowTrigger[];
  }> {
    try {
      // Create workflow record
      const workflow = await this.prisma.workflow.create({
        data: {
          userId,
          name,
          description,
          enabled: true,
          metadata: {},
        },
      });

      // Register triggers
      const registeredTriggers: WorkflowTrigger[] = [];
      for (const trigger of triggers) {
        const registered = await this.triggerService.registerTrigger(userId, trigger);
        registeredTriggers.push(registered);
      }

      return {
        workflowId: workflow.id,
        triggers: registeredTriggers,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create workflow: ${errorMessage}`);
      throw new BusinessException(
        'Failed to create workflow',
        'WORKFLOW_CREATE_FAILED',
        undefined,
        error instanceof Error ? { message: error.message } : undefined
      );
    }
  }

  /**
   * Create workflow from template
   */
  async createFromTemplate(
    userId: string,
    templateId: string,
    customizations?: Prisma.JsonObject
  ): Promise<{
    workflowId: string;
    triggers: WorkflowTrigger[];
  }> {
    try {
      const template = await this.templateService.getTemplate(templateId);
      if (!template) {
        throw new BusinessException('Template not found', 'TEMPLATE_NOT_FOUND');
      }

      // Create workflow from template
      const processedCustomizations: Record<string, string | number | boolean> = {};
      if (customizations) {
        for (const [key, value] of Object.entries(customizations)) {
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            processedCustomizations[key] = value;
          }
        }
      }

      const { triggers } = await this.templateService.createFromTemplate(
        userId,
        templateId,
        processedCustomizations
      );

      // Create workflow
      return this.createWorkflow(userId, template.name, template.description, triggers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create from template: ${errorMessage}`);
      throw new BusinessException(
        'Failed to create workflow from template',
        'TEMPLATE_CREATE_FAILED',
        undefined,
        error instanceof Error ? { message: error.message } : undefined
      );
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    userId: string,
    triggerId: string,
    triggerData: Prisma.JsonObject
  ): Promise<WorkflowExecution> {
    try {
      return await this.workflowEngine.executeWorkflow(userId, triggerId, triggerData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Workflow execution failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get user workflows
   */
  async getUserWorkflows(userId: string): Promise<
    Array<
      Workflow & {
        _count: { executions: number };
        triggers: WorkflowTrigger[];
        executionCount: number;
      }
    >
  > {
    const workflows = await this.prisma.workflow.findMany({
      where: { userId },
      include: {
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get triggers for each workflow
    const workflowsWithTriggers = await Promise.all(
      workflows.map(async workflow => {
        const triggers = await this.triggerService.getUserTriggers(userId);
        const workflowTriggers = triggers.filter(
          t => t.id.startsWith(`${userId}-`) && t.metadata?.workflowId === workflow.id
        );

        return {
          ...workflow,
          triggers: workflowTriggers,
          executionCount: workflow._count.executions,
        };
      })
    );

    return workflowsWithTriggers;
  }

  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(
    userId: string,
    workflowId?: string,
    limit: number = 20
  ): Promise<WorkflowExecution[]> {
    const executions = await this.prisma.workflowExecution.findMany({
      where: {
        userId,
        ...(workflowId && { workflowId }),
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return executions.map(exec => ({
      id: exec.id,
      workflowId: exec.workflowId,
      status: exec.status as ExecutionStatus,
      startedAt: exec.startedAt,
      completedAt: exec.completedAt || undefined,
      trigger: this.convertJsonToWorkflowTrigger(exec.triggerData),
      analysis: this.convertJsonToWorkflowAnalysis(exec.analysisData),
      selectedSuggestions: exec.selectedSuggestions as string[],
      executedActions: this.convertJsonToExecutedActions(exec.executedActions),
      results: this.convertJsonToExecutionResults(exec.result),
      error: this.convertJsonToWorkflowError(exec.error),
    }));
  }

  /**
   * Get execution details
   */
  async getExecutionDetails(
    userId: string,
    executionId: string
  ): Promise<WorkflowExecution | null> {
    const execution = await this.workflowEngine.getExecutionStatus(executionId);

    if (!execution) {
      return null;
    }

    // Verify user owns this execution
    const dbExec = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, userId },
    });

    if (!dbExec) {
      throw new BusinessException(
        'Execution not found or access denied',
        'EXECUTION_ACCESS_DENIED'
      );
    }

    return execution;
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    userId: string,
    workflowId: string,
    updates: {
      name?: string;
      description?: string;
      enabled?: boolean;
    }
  ): Promise<Workflow> {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      throw new BusinessException('Workflow not found', 'WORKFLOW_NOT_FOUND');
    }

    const updated = await this.prisma.workflow.update({
      where: { id: workflowId },
      data: updates,
    });

    // Enable/disable triggers
    if (updates.enabled !== undefined) {
      const triggers = await this.triggerService.getUserTriggers(userId);
      const workflowTriggers = triggers.filter(t => t.metadata?.workflowId === workflowId);

      for (const trigger of workflowTriggers) {
        if (updates.enabled) {
          await this.triggerService.activateTrigger(userId, trigger);
        } else {
          await this.triggerService.deactivateTrigger(trigger.id);
        }
      }
    }

    return updated;
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(userId: string, workflowId: string): Promise<void> {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      throw new BusinessException('Workflow not found', 'WORKFLOW_NOT_FOUND');
    }

    // Deactivate triggers
    const triggers = await this.triggerService.getUserTriggers(userId);
    const workflowTriggers = triggers.filter(t => t.metadata?.workflowId === workflowId);

    for (const trigger of workflowTriggers) {
      await this.triggerService.deactivateTrigger(trigger.id);
    }

    // Delete workflow
    await this.prisma.workflow.delete({
      where: { id: workflowId },
    });
  }

  /**
   * Get workflow metrics
   */
  async getWorkflowMetrics(userId: string, workflowId?: string): Promise<WorkflowMetrics[]> {
    const where = workflowId ? { workflowId } : {};

    const metrics = await this.prisma.workflowMetrics.findMany({
      where,
      include: {
        workflow: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
    });

    // Filter by user
    const userMetrics = metrics.filter(m => m.workflow.userId === userId);

    return userMetrics.map(m => ({
      workflowId: m.workflowId,
      executionCount: m.executionCount,
      successRate: m.successRate,
      averageExecutionTime: m.avgDuration,
      timeSaved: 0, // Calculate based on avgDuration vs manual time
      actionsExecuted: m.executionCount,
      lastExecuted: undefined,
      userSatisfaction: undefined,
    }));
  }

  /**
   * Get workflow templates
   */
  async getTemplates(category?: string): Promise<WorkflowTemplate[]> {
    return this.templateService.getTemplates(category);
  }

  /**
   * Get recommended templates
   */
  async getRecommendedTemplates(userId: string): Promise<WorkflowTemplate[]> {
    return this.templateService.getRecommendedTemplates(userId);
  }

  /**
   * Search templates
   */
  async searchTemplates(query: string): Promise<WorkflowTemplate[]> {
    return this.templateService.searchTemplates(query);
  }

  /**
   * Test workflow trigger
   */
  async testTrigger(
    userId: string,
    triggerId: string,
    testData?: Prisma.JsonObject
  ): Promise<{
    triggered: boolean;
    message: string;
  }> {
    this.logger.log(`Testing trigger ${triggerId} for user ${userId}`, testData);
    try {
      const processedTestData: Record<string, string | number | boolean | Date> = {};
      if (testData) {
        for (const [key, value] of Object.entries(testData)) {
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean' ||
            value instanceof Date
          ) {
            processedTestData[key] = value;
          }
        }
      }

      await this.triggerService.fireTrigger(triggerId, processedTestData);
      return {
        triggered: true,
        message: 'Trigger fired successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        triggered: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Get workflow suggestions
   */
  async getWorkflowSuggestions(
    userId: string
  ): Promise<Array<{ templateId: string; reason: string; potentialTimeSaving: number }>> {
    // Analyze user's patterns and suggest workflows
    const [taskCount, emailCount, meetingCount] = await Promise.all([
      this.prisma.task.count({ where: { userId } }),
      this.prisma.email.count({ where: { userId } }),
      this.prisma.calendarEvent.count({ where: { userId } }),
    ]);

    const suggestions = [];

    if (emailCount > 50) {
      suggestions.push({
        templateId: 'email-management',
        reason: 'You receive many emails that could be automatically managed',
        potentialTimeSaving: 60,
      });
    }

    if (taskCount > 20) {
      suggestions.push({
        templateId: 'task-automation',
        reason: 'Your task list could benefit from intelligent automation',
        potentialTimeSaving: 120,
      });
    }

    if (meetingCount > 10) {
      suggestions.push({
        templateId: 'meeting-prep',
        reason: 'Automated meeting preparation could save you time',
        potentialTimeSaving: 45,
      });
    }

    return suggestions.map(suggestion => ({
      templateId: suggestion.templateId,
      reason: suggestion.reason,
      potentialTimeSaving: suggestion.potentialTimeSaving,
    }));
  }

  // Helper methods for converting JSON values to interface types
  private convertJsonToWorkflowTrigger(json: Prisma.JsonValue): WorkflowTrigger {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      // Return a minimal valid trigger if conversion fails
      return {
        id: '',
        type: TriggerType.MANUAL,
        conditions: [],
        enabled: false,
      };
    }

    const obj = json as Prisma.JsonObject;

    // Validate required fields exist
    if (typeof obj.id !== 'string' || typeof obj.type !== 'string') {
      return {
        id: '',
        type: TriggerType.MANUAL,
        conditions: [],
        enabled: false,
      };
    }

    const triggerType = Object.values(TriggerType).includes(obj.type as TriggerType)
      ? (obj.type as TriggerType)
      : TriggerType.MANUAL;

    const conditions: TriggerCondition[] = [];
    if (Array.isArray(obj.conditions)) {
      for (const condition of obj.conditions) {
        if (condition && typeof condition === 'object' && 'field' in condition) {
          const conditionObj = condition as Record<string, Prisma.JsonValue>;
          if (
            typeof conditionObj.field === 'string' &&
            typeof conditionObj.operator === 'string' &&
            conditionObj.value !== undefined
          ) {
            conditions.push({
              field: conditionObj.field,
              operator: conditionObj.operator as ConditionOperator,
              value: conditionObj.value as ConditionValue,
              logicalOperator:
                conditionObj.logicalOperator === 'AND' || conditionObj.logicalOperator === 'OR'
                  ? conditionObj.logicalOperator
                  : undefined,
            });
          }
        }
      }
    }

    let metadata: TriggerMetadata | undefined;
    if (obj.metadata && typeof obj.metadata === 'object' && !Array.isArray(obj.metadata)) {
      const metaObj = obj.metadata as Record<string, Prisma.JsonValue>;
      metadata = {
        workflowId: typeof metaObj.workflowId === 'string' ? metaObj.workflowId : undefined,
        source: typeof metaObj.source === 'string' ? metaObj.source : undefined,
        priority: typeof metaObj.priority === 'number' ? metaObj.priority : undefined,
        tags: Array.isArray(metaObj.tags)
          ? (metaObj.tags.filter(t => typeof t === 'string') as string[])
          : undefined,
        checkInterval:
          typeof metaObj.checkInterval === 'number' ? metaObj.checkInterval : undefined,
        eventTypes: Array.isArray(metaObj.eventTypes)
          ? (metaObj.eventTypes.filter(e => typeof e === 'string') as string[])
          : undefined,
        statusChanges: Array.isArray(metaObj.statusChanges)
          ? (metaObj.statusChanges.filter(s => typeof s === 'string') as string[])
          : undefined,
        insightTypes: Array.isArray(metaObj.insightTypes)
          ? (metaObj.insightTypes.filter(i => typeof i === 'string') as string[])
          : undefined,
      };
    }

    return {
      id: obj.id,
      type: triggerType,
      conditions,
      enabled: typeof obj.enabled === 'boolean' ? obj.enabled : false,
      metadata,
    };
  }

  private convertJsonToWorkflowAnalysis(json: Prisma.JsonValue): WorkflowAnalysis {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      // Return a minimal valid analysis if conversion fails
      return {
        id: '',
        workflowId: '',
        triggerId: '',
        context: this.getDefaultAnalysisContext(),
        insights: [],
        suggestions: [],
        confidence: 0,
        timestamp: new Date(),
      };
    }

    const obj = json as Prisma.JsonObject;

    // Validate required fields
    if (
      typeof obj.id !== 'string' ||
      typeof obj.workflowId !== 'string' ||
      typeof obj.triggerId !== 'string'
    ) {
      return {
        id: '',
        workflowId: '',
        triggerId: '',
        context: this.getDefaultAnalysisContext(),
        insights: [],
        suggestions: [],
        confidence: 0,
        timestamp: new Date(),
      };
    }

    const context: AnalysisContext = this.getDefaultAnalysisContext();
    if (obj.context && typeof obj.context === 'object' && !Array.isArray(obj.context)) {
      const contextObj = obj.context as Record<string, Prisma.JsonValue>;
      if (typeof contextObj.userId === 'string') {
        context.userId = contextObj.userId;
      }
    }

    const insights: AnalysisInsight[] = [];
    if (Array.isArray(obj.insights)) {
      for (const insight of obj.insights) {
        if (insight && typeof insight === 'object' && 'type' in insight) {
          const insightObj = insight as Record<string, Prisma.JsonValue>;
          if (
            typeof insightObj.type === 'string' &&
            typeof insightObj.title === 'string' &&
            typeof insightObj.description === 'string'
          ) {
            insights.push({
              type: insightObj.type as InsightType,
              title: insightObj.title,
              description: insightObj.description,
              data:
                insightObj.data && typeof insightObj.data === 'object'
                  ? (insightObj.data as Record<string, string | number | boolean | Date>)
                  : {},
              importance:
                insightObj.importance === 'low' ||
                insightObj.importance === 'medium' ||
                insightObj.importance === 'high' ||
                insightObj.importance === 'critical'
                  ? insightObj.importance
                  : 'low',
            });
          }
        }
      }
    }

    const suggestions: WorkflowSuggestion[] = [];
    if (Array.isArray(obj.suggestions)) {
      for (const suggestion of obj.suggestions) {
        if (suggestion && typeof suggestion === 'object' && 'id' in suggestion) {
          const suggestionObj = suggestion as Record<string, Prisma.JsonValue>;
          if (
            typeof suggestionObj.id === 'string' &&
            typeof suggestionObj.type === 'string' &&
            typeof suggestionObj.title === 'string'
          ) {
            suggestions.push({
              id: suggestionObj.id,
              type: suggestionObj.type as SuggestionType,
              title: suggestionObj.title,
              description:
                typeof suggestionObj.description === 'string' ? suggestionObj.description : '',
              actions: [], // Would need proper conversion for actions array
              priority: typeof suggestionObj.priority === 'number' ? suggestionObj.priority : 0,
              estimatedImpact: {
                timeSaved:
                  typeof suggestionObj.timeSaved === 'number' ? suggestionObj.timeSaved : undefined,
              },
              reasoning: typeof suggestionObj.reasoning === 'string' ? suggestionObj.reasoning : '',
              confidence:
                typeof suggestionObj.confidence === 'number' ? suggestionObj.confidence : 0,
            });
          }
        }
      }
    }

    return {
      id: obj.id,
      workflowId: obj.workflowId,
      triggerId: obj.triggerId,
      context,
      insights,
      suggestions,
      confidence: typeof obj.confidence === 'number' ? obj.confidence : 0,
      timestamp: obj.timestamp ? new Date(obj.timestamp as string) : new Date(),
    };
  }

  private convertJsonToExecutedActions(json: Prisma.JsonValue): ExecutedAction[] {
    if (!Array.isArray(json)) {
      return [];
    }

    const validActions: ExecutedAction[] = [];

    for (const item of json) {
      if (!item || typeof item !== 'object' || !this.isValidExecutedAction(item)) {
        continue;
      }

      const itemObj = item as Record<string, Prisma.JsonValue>;

      // Validate and extract actionId
      const actionId = typeof itemObj.actionId === 'string' ? itemObj.actionId : '';
      if (!actionId) continue;

      // Validate and extract input
      const inputData = itemObj.input;
      if (!inputData || typeof inputData !== 'object' || Array.isArray(inputData)) {
        continue;
      }

      const inputObj = inputData as Record<string, Prisma.JsonValue>;

      // Extract parameters
      const parametersData = inputObj.parameters;
      const parameters: Record<string, string | number | boolean | Date | string[] | number[]> = {};
      if (parametersData && typeof parametersData === 'object' && !Array.isArray(parametersData)) {
        const paramsObj = parametersData as Record<string, Prisma.JsonValue>;
        for (const [key, value] of Object.entries(paramsObj)) {
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean' ||
            Array.isArray(value)
          ) {
            parameters[key] = value as string | number | boolean | string[] | number[];
          } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
            parameters[key] = new Date(value);
          }
        }
      }

      // Extract context
      const contextData = inputObj.context;
      const context = {
        userId: '',
        timestamp: new Date(),
        source: 'workflow_execution',
      };

      if (contextData && typeof contextData === 'object' && !Array.isArray(contextData)) {
        const contextObj = contextData as Record<string, Prisma.JsonValue>;
        context.userId = typeof contextObj.userId === 'string' ? contextObj.userId : '';
        context.source =
          typeof contextObj.source === 'string' ? contextObj.source : 'workflow_execution';

        if (typeof contextObj.timestamp === 'string') {
          const parsedDate = new Date(contextObj.timestamp);
          if (!isNaN(parsedDate.getTime())) {
            context.timestamp = parsedDate;
          }
        }
      }

      const actionInput: ActionInput = {
        parameters,
        context,
      };

      // Extract executedAt
      const executedAtValue = itemObj.executedAt;
      let executedAt = new Date();
      if (typeof executedAtValue === 'string') {
        const parsedDate = new Date(executedAtValue);
        if (!isNaN(parsedDate.getTime())) {
          executedAt = parsedDate;
        }
      }

      // Extract duration
      const duration = typeof itemObj.duration === 'number' ? itemObj.duration : 0;

      // Extract status
      const statusValue = itemObj.status;
      let status: 'success' | 'failed' | 'skipped' = 'failed';
      if (statusValue === 'success' || statusValue === 'failed' || statusValue === 'skipped') {
        status = statusValue;
      }

      // Extract output
      let output: ActionOutput | undefined;
      const outputData = itemObj.output;
      if (outputData && typeof outputData === 'object' && !Array.isArray(outputData)) {
        const outputObj = outputData as Record<string, Prisma.JsonValue>;

        const result: Record<string, string | number | boolean | Date> = {};
        const resultData = outputObj.result;
        if (resultData && typeof resultData === 'object' && !Array.isArray(resultData)) {
          const resultObj = resultData as Record<string, Prisma.JsonValue>;
          for (const [key, value] of Object.entries(resultObj)) {
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean'
            ) {
              result[key] = value;
            } else if (typeof value === 'string' && !isNaN(Date.parse(value))) {
              result[key] = new Date(value);
            }
          }
        }

        const metadata = {
          executionTime: 0,
          resourcesUsed: [] as string[],
          sideEffects: undefined as string[] | undefined,
        };

        const metadataData = outputObj.metadata;
        if (metadataData && typeof metadataData === 'object' && !Array.isArray(metadataData)) {
          const metaObj = metadataData as Record<string, Prisma.JsonValue>;
          if (typeof metaObj.executionTime === 'number') {
            metadata.executionTime = metaObj.executionTime;
          }
          if (Array.isArray(metaObj.resourcesUsed)) {
            metadata.resourcesUsed = metaObj.resourcesUsed.filter(
              r => typeof r === 'string'
            ) as string[];
          }
          if (Array.isArray(metaObj.sideEffects)) {
            metadata.sideEffects = metaObj.sideEffects.filter(
              s => typeof s === 'string'
            ) as string[];
          }
        }

        output = { result, metadata };
      }

      // Extract error
      const error = typeof itemObj.error === 'string' ? itemObj.error : undefined;

      validActions.push({
        actionId,
        executedAt,
        duration,
        status,
        input: actionInput,
        output,
        error,
      });
    }

    return validActions;
  }

  private convertJsonToExecutionResults(json: Prisma.JsonValue): ExecutionResult[] {
    if (!Array.isArray(json)) {
      return [];
    }

    return json.map(item => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as {
          type?: string;
          message?: string;
          data?: Record<string, string | number | boolean>;
        };
        return {
          type:
            obj.type === 'success' ||
            obj.type === 'warning' ||
            obj.type === 'error' ||
            obj.type === 'info'
              ? obj.type
              : 'error',
          message: typeof obj.message === 'string' ? obj.message : '',
          data: obj.data && typeof obj.data === 'object' ? obj.data : undefined,
        };
      }
      return {
        type: 'error' as const,
        message: 'Unknown result',
      };
    });
  }

  private convertJsonToWorkflowError(json: Prisma.JsonValue): WorkflowError | undefined {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return undefined;
    }

    const obj = json as Prisma.JsonObject;

    // Only create error object if we have meaningful data
    if (typeof obj.code !== 'string' && typeof obj.message !== 'string') {
      return undefined;
    }

    let details: WorkflowErrorDetails | undefined;
    if (obj.details && typeof obj.details === 'object' && !Array.isArray(obj.details)) {
      const detailsObj = obj.details as Record<string, Prisma.JsonValue>;
      details = {
        stackTrace: typeof detailsObj.stackTrace === 'string' ? detailsObj.stackTrace : undefined,
        actionId: typeof detailsObj.actionId === 'string' ? detailsObj.actionId : undefined,
        step: typeof detailsObj.step === 'string' ? detailsObj.step : undefined,
        userInput:
          detailsObj.userInput &&
          typeof detailsObj.userInput === 'object' &&
          !Array.isArray(detailsObj.userInput)
            ? (detailsObj.userInput as Record<string, string | number | boolean>)
            : undefined,
        systemState:
          detailsObj.systemState &&
          typeof detailsObj.systemState === 'object' &&
          !Array.isArray(detailsObj.systemState)
            ? (detailsObj.systemState as Record<string, string | number>)
            : undefined,
        retryCount: typeof detailsObj.retryCount === 'number' ? detailsObj.retryCount : undefined,
        lastRetryAt:
          typeof detailsObj.lastRetryAt === 'string' ? new Date(detailsObj.lastRetryAt) : undefined,
        recoveryOptions: Array.isArray(detailsObj.recoveryOptions)
          ? (detailsObj.recoveryOptions.filter(r => typeof r === 'string') as string[])
          : undefined,
      };
    }

    return {
      code: typeof obj.code === 'string' ? obj.code : 'EXECUTION_ERROR',
      message:
        typeof obj.message === 'string' ? obj.message : 'Workflow execution encountered an error',
      details,
      recoverable: typeof obj.recoverable === 'boolean' ? obj.recoverable : false,
    };
  }

  private isValidExecutedAction(item: Prisma.JsonValue): boolean {
    return (
      typeof item === 'object' &&
      item !== null &&
      'actionId' in item &&
      typeof item.actionId === 'string' &&
      'input' in item &&
      typeof item.input === 'object' &&
      item.input !== null
    );
  }

  private getDefaultAnalysisContext(): AnalysisContext {
    return {
      userId: '',
      triggerData: {
        type: '',
        timestamp: new Date(),
        source: '',
        payload: {},
      },
      userContext: {
        currentTasks: 0,
        upcomingEvents: 0,
        recentActivity: [],
        preferences: {
          workingHours: { start: '09:00', end: '17:00', timezone: 'UTC' },
          communicationStyle: 'formal',
          priorities: [],
          automationLevel: 'moderate',
          notifications: {},
        },
      },
      environmentContext: {
        timeOfDay: 'unknown',
        dayOfWeek: 'unknown',
      },
    };
  }
}
