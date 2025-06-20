import { Injectable, Logger } from '@nestjs/common';
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
  TriggerType,
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
    private cacheService: CacheService,
  ) {}

  /**
   * Create a new workflow
   */
  async createWorkflow(
    userId: string,
    name: string,
    description: string,
    triggers: Omit<WorkflowTrigger, 'id'>[],
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
    } catch (error: any) {
      this.logger.error(`Failed to create workflow: ${error.message}`);
      throw new BusinessException(
        'Failed to create workflow',
        'WORKFLOW_CREATE_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Create workflow from template
   */
  async createFromTemplate(
    userId: string,
    templateId: string,
    customizations?: Record<string, any>,
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
      const { triggers } = await this.templateService.createFromTemplate(
        userId,
        templateId,
        customizations,
      );

      // Create workflow
      return this.createWorkflow(
        userId,
        template.name,
        template.description,
        triggers,
      );
    } catch (error: any) {
      this.logger.error(`Failed to create from template: ${error.message}`);
      throw new BusinessException(
        'Failed to create workflow from template',
        'TEMPLATE_CREATE_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    userId: string,
    triggerId: string,
    triggerData: Record<string, any>,
  ): Promise<WorkflowExecution> {
    try {
      return await this.workflowEngine.executeWorkflow(userId, triggerId, triggerData);
    } catch (error: any) {
      this.logger.error(`Workflow execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user workflows
   */
  async getUserWorkflows(userId: string): Promise<any[]> {
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
      workflows.map(async (workflow) => {
        const triggers = await this.triggerService.getUserTriggers(userId);
        const workflowTriggers = triggers.filter(t => 
          t.id.startsWith(`${userId}-`) && t.metadata?.workflowId === workflow.id
        );

        return {
          ...workflow,
          triggers: workflowTriggers,
          executionCount: workflow._count.executions,
        };
      }),
    );

    return workflowsWithTriggers;
  }

  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(
    userId: string,
    workflowId?: string,
    limit: number = 20,
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
      status: exec.status as any,
      startedAt: exec.startedAt,
      completedAt: exec.completedAt || undefined,
      trigger: exec.triggerData as any,
      analysis: exec.analysisData as any,
      selectedSuggestions: exec.selectedSuggestions as string[],
      executedActions: exec.executedActions as any[],
      results: exec.results as any[],
      error: exec.error as any,
    }));
  }

  /**
   * Get execution details
   */
  async getExecutionDetails(
    userId: string,
    executionId: string,
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
        'EXECUTION_ACCESS_DENIED',
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
    },
  ): Promise<any> {
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
      const workflowTriggers = triggers.filter(t => 
        t.metadata?.workflowId === workflowId
      );

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
    const workflowTriggers = triggers.filter(t => 
      t.metadata?.workflowId === workflowId
    );

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
  async getWorkflowMetrics(
    userId: string,
    workflowId?: string,
  ): Promise<WorkflowMetrics[]> {
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
      averageExecutionTime: m.averageExecutionTime,
      timeSaved: m.timeSaved,
      actionsExecuted: m.actionsExecuted,
      lastExecuted: m.lastExecuted || undefined,
      userSatisfaction: m.userSatisfaction || undefined,
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
    testData?: Record<string, any>,
  ): Promise<{
    triggered: boolean;
    message: string;
  }> {
    try {
      await this.triggerService.fireTrigger(triggerId, testData || {});
      return {
        triggered: true,
        message: 'Trigger fired successfully',
      };
    } catch (error: any) {
      return {
        triggered: false,
        message: error.message,
      };
    }
  }

  /**
   * Get workflow suggestions
   */
  async getWorkflowSuggestions(userId: string): Promise<any[]> {
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

    return suggestions;
  }
}