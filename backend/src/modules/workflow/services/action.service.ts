import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { AIGatewayService } from '../../ai-gateway/ai-gateway.service';
import { EmailService } from '../../email/email.service';
import { TaskService } from '../../tasks/tasks.service';
import { CalendarService } from '../../calendar/calendar.service';
import {
  WorkflowAction,
  ActionType,
  ExecutedAction,
  ExecutionResult,
  WorkflowError,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ActionService {
  private readonly logger = new Logger(ActionService.name);
  private readonly actionHandlers = new Map<ActionType, Function>();

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private aiGateway: AIGatewayService,
    private emailService: EmailService,
    private taskService: TaskService,
    private calendarService: CalendarService,
    private eventEmitter: EventEmitter2,
  ) {
    this.registerActionHandlers();
  }

  /**
   * Execute a workflow action
   */
  async executeAction(
    userId: string,
    action: WorkflowAction,
    parameters: Record<string, any>,
  ): Promise<ExecutedAction> {
    const startTime = Date.now();
    
    try {
      // Validate parameters
      this.validateParameters(action, parameters);

      // Check requirements
      await this.checkRequirements(userId, action);

      // Get action handler
      const handler = this.actionHandlers.get(action.type);
      if (!handler) {
        throw new Error(`No handler registered for action type: ${action.type}`);
      }

      // Execute action
      const result = await handler.call(this, userId, parameters);

      // Record execution
      const executedAction: ExecutedAction = {
        actionId: action.id,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        status: 'success',
        input: parameters,
        output: result,
      };

      // Emit success event
      this.eventEmitter.emit('workflow.action.executed', {
        userId,
        action: action.type,
        result,
      });

      this.logger.log(`Executed action ${action.type} for user ${userId}`);
      return executedAction;
    } catch (error: any) {
      this.logger.error(`Action execution failed: ${error.message}`);
      
      const executedAction: ExecutedAction = {
        actionId: action.id,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        status: 'failed',
        input: parameters,
        error: error.message,
      };

      // Emit failure event
      this.eventEmitter.emit('workflow.action.failed', {
        userId,
        action: action.type,
        error: error.message,
      });

      return executedAction;
    }
  }

  /**
   * Execute multiple actions
   */
  async executeActions(
    userId: string,
    actions: Array<{ action: WorkflowAction; parameters: Record<string, any> }>,
  ): Promise<ExecutedAction[]> {
    const results: ExecutedAction[] = [];

    for (const { action, parameters } of actions) {
      const result = await this.executeAction(userId, action, parameters);
      results.push(result);

      // Stop execution if action failed and it's not optional
      if (result.status === 'failed' && !action.parameters.optional) {
        break;
      }
    }

    return results;
  }

  /**
   * Register action handlers
   */
  private registerActionHandlers(): void {
    this.actionHandlers.set(ActionType.CREATE_TASK, this.handleCreateTask);
    this.actionHandlers.set(ActionType.UPDATE_TASK, this.handleUpdateTask);
    this.actionHandlers.set(ActionType.SEND_EMAIL, this.handleSendEmail);
    this.actionHandlers.set(ActionType.SCHEDULE_EVENT, this.handleScheduleEvent);
    this.actionHandlers.set(ActionType.CREATE_REMINDER, this.handleCreateReminder);
    this.actionHandlers.set(ActionType.EXECUTE_INTEGRATION, this.handleExecuteIntegration);
    this.actionHandlers.set(ActionType.TRIGGER_WORKFLOW, this.handleTriggerWorkflow);
    this.actionHandlers.set(ActionType.GENERATE_CONTENT, this.handleGenerateContent);
    this.actionHandlers.set(ActionType.ANALYZE_DATA, this.handleAnalyzeData);
    this.actionHandlers.set(ActionType.NOTIFY_USER, this.handleNotifyUser);
  }

  /**
   * Action handlers
   */
  private async handleCreateTask(
    userId: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    const task = await this.taskService.createTask(userId, {
      title: parameters.title,
      description: parameters.description,
      dueDate: parameters.dueDate ? new Date(parameters.dueDate) : undefined,
      priority: parameters.priority || 'medium',
      labels: parameters.labels || [],
    });

    return {
      taskId: task.id,
      title: task.title,
      createdAt: task.createdAt,
    };
  }

  private async handleUpdateTask(
    userId: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    const updates: any = {};
    
    if (parameters.status) updates.status = parameters.status;
    if (parameters.priority) updates.priority = parameters.priority;
    if (parameters.dueDate) updates.dueDate = new Date(parameters.dueDate);
    if (parameters.assignedTo) updates.assignedTo = parameters.assignedTo;

    const results = [];
    for (const taskId of parameters.taskIds || [parameters.taskId]) {
      const task = await this.taskService.updateTask(userId, taskId, updates);
      results.push({
        taskId: task.id,
        updated: true,
      });
    }

    return { results };
  }

  private async handleSendEmail(
    userId: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    // Generate email content if needed
    let content = parameters.content;
    if (parameters.generateContent) {
      const generated = await this.aiGateway.generateResponse(
        `Write a professional email with subject: ${parameters.subject}\nContext: ${parameters.context}`,
        { maxTokens: 500 },
      );
      content = generated.content;
    }

    const email = await this.emailService.sendEmail({
      from: parameters.from || 'noreply@aurelius.ai',
      to: parameters.to,
      subject: parameters.subject,
      html: content,
      attachments: parameters.attachments,
    });

    return {
      messageId: email.messageId,
      sentAt: new Date(),
    };
  }

  private async handleScheduleEvent(
    userId: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    const event = await this.calendarService.createEvent(userId, {
      title: parameters.title,
      description: parameters.description,
      startTime: new Date(parameters.startTime),
      endTime: new Date(parameters.endTime || Date.now() + parameters.duration * 60000),
      location: parameters.location,
      attendees: parameters.attendees || [],
      reminders: parameters.reminders || [{ minutes: 15 }],
    });

    return {
      eventId: event.id,
      title: event.title,
      startTime: event.startTime,
    };
  }

  private async handleCreateReminder(
    userId: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    const reminder = await this.prisma.reminder.create({
      data: {
        userId,
        title: parameters.title,
        message: parameters.message,
        remindAt: new Date(parameters.remindAt),
        type: parameters.type || 'notification',
        metadata: parameters.metadata || {},
      },
    });

    // Schedule reminder notification
    await this.queueService.addJob(
      'notification',
      {
        userId,
        type: 'reminder',
        reminderId: reminder.id,
      },
      {
        delay: new Date(parameters.remindAt).getTime() - Date.now(),
      },
    );

    return {
      reminderId: reminder.id,
      scheduledFor: reminder.remindAt,
    };
  }

  private async handleExecuteIntegration(
    userId: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    // This would call the appropriate integration service
    const integration = parameters.integration;
    const action = parameters.action;
    const data = parameters.data;

    // Queue integration execution
    const job = await this.queueService.addJob('integration', {
      userId,
      integration,
      action,
      data,
    });

    return {
      jobId: job.id,
      status: 'queued',
      integration,
      action,
    };
  }

  private async handleTriggerWorkflow(
    userId: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    const workflowId = parameters.workflowId || parameters.workflowType;
    
    // Queue workflow execution
    const job = await this.queueService.addJob('workflow', {
      userId,
      workflowId,
      triggerData: parameters.data || {},
      parentWorkflowId: parameters.parentWorkflowId,
    });

    return {
      workflowExecutionId: job.id,
      status: 'triggered',
    };
  }

  private async handleGenerateContent(
    userId: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    const prompt = parameters.prompt || this.buildContentPrompt(parameters);
    
    const response = await this.aiGateway.generateResponse(prompt, {
      model: parameters.model || 'claude-3-haiku',
      maxTokens: parameters.maxTokens || 1000,
      temperature: parameters.temperature || 0.7,
    });

    // Save generated content if requested
    if (parameters.save) {
      await this.prisma.generatedContent.create({
        data: {
          userId,
          type: parameters.contentType || 'text',
          content: response.content,
          metadata: {
            prompt,
            parameters,
          },
        },
      });
    }

    return {
      content: response.content,
      tokens: response.usage.totalTokens,
      saved: parameters.save || false,
    };
  }

  private async handleAnalyzeData(
    userId: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    const dataType = parameters.dataType;
    const timeRange = parameters.timeRange || '7d';
    const metrics = parameters.metrics || [];

    // Gather data based on type
    let data: any;
    switch (dataType) {
      case 'tasks':
        data = await this.analyzeTaskData(userId, timeRange);
        break;
      case 'emails':
        data = await this.analyzeEmailData(userId, timeRange);
        break;
      case 'productivity':
        data = await this.analyzeProductivityData(userId, timeRange);
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    return {
      analysis: data,
      generatedAt: new Date(),
      timeRange,
    };
  }

  private async handleNotifyUser(
    userId: string,
    parameters: Record<string, any>,
  ): Promise<any> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: parameters.notificationType || 'info',
        title: parameters.title,
        message: parameters.message,
        data: parameters.data || {},
        channels: parameters.channels || ['in_app'],
      },
    });

    // Queue notification delivery
    await this.queueService.addJob('notification', {
      notificationId: notification.id,
      userId,
      channels: notification.channels,
    });

    return {
      notificationId: notification.id,
      delivered: true,
    };
  }

  /**
   * Helper methods
   */
  private validateParameters(
    action: WorkflowAction,
    parameters: Record<string, any>,
  ): void {
    const required = action.parameters.required;
    
    for (const [key, definition] of Object.entries(required)) {
      if (!(key in parameters)) {
        throw new BusinessException(
          `Missing required parameter: ${key}`,
          'MISSING_PARAMETER',
          { action: action.type, parameter: key },
        );
      }

      const value = parameters[key];
      
      // Type validation
      if (definition.type === 'array' && !Array.isArray(value)) {
        throw new BusinessException(
          `Parameter ${key} must be an array`,
          'INVALID_PARAMETER_TYPE',
          { expected: 'array', received: typeof value },
        );
      }

      // Additional validation
      if (definition.validation) {
        if (definition.validation.pattern) {
          const pattern = new RegExp(definition.validation.pattern);
          if (!pattern.test(String(value))) {
            throw new BusinessException(
              `Parameter ${key} does not match required pattern`,
              'INVALID_PARAMETER_PATTERN',
            );
          }
        }

        if (definition.validation.min !== undefined && Number(value) < definition.validation.min) {
          throw new BusinessException(
            `Parameter ${key} is below minimum value`,
            'PARAMETER_BELOW_MIN',
          );
        }

        if (definition.validation.max !== undefined && Number(value) > definition.validation.max) {
          throw new BusinessException(
            `Parameter ${key} exceeds maximum value`,
            'PARAMETER_EXCEEDS_MAX',
          );
        }
      }
    }
  }

  private async checkRequirements(
    userId: string,
    action: WorkflowAction,
  ): Promise<void> {
    for (const requirement of action.requires) {
      switch (requirement.type) {
        case 'permission':
          await this.checkPermission(userId, requirement.details.scope);
          break;
        case 'integration':
          await this.checkIntegration(userId, requirement.details.service);
          break;
        case 'data':
          await this.checkDataAvailability(userId, requirement.details.required);
          break;
        case 'confirmation':
          // In a real implementation, this would check if user confirmed
          break;
      }
    }
  }

  private async checkPermission(userId: string, scope: string): Promise<void> {
    // Implementation would check user permissions
    const hasPermission = true; // Placeholder
    if (!hasPermission) {
      throw new BusinessException(
        `User lacks required permission: ${scope}`,
        'PERMISSION_DENIED',
      );
    }
  }

  private async checkIntegration(userId: string, service: string): Promise<void> {
    const integration = await this.prisma.integration.findFirst({
      where: {
        userId,
        provider: service,
        status: 'active',
      },
    });

    if (!integration) {
      throw new BusinessException(
        `Integration not connected: ${service}`,
        'INTEGRATION_NOT_CONNECTED',
      );
    }
  }

  private async checkDataAvailability(userId: string, dataType: string): Promise<void> {
    // Implementation would check if required data exists
    const hasData = true; // Placeholder
    if (!hasData) {
      throw new BusinessException(
        `Required data not available: ${dataType}`,
        'DATA_NOT_AVAILABLE',
      );
    }
  }

  private buildContentPrompt(parameters: Record<string, any>): string {
    const type = parameters.contentType || 'text';
    const context = parameters.context || '';
    const style = parameters.style || 'professional';
    const length = parameters.length || 'medium';

    return `Generate ${type} content:
Type: ${type}
Style: ${style}
Length: ${length}
Context: ${context}
Additional requirements: ${parameters.requirements || 'None'}`;
  }

  private async analyzeTaskData(userId: string, timeRange: string): Promise<any> {
    const startDate = this.getStartDate(timeRange);
    
    const [total, completed, overdue] = await Promise.all([
      this.prisma.task.count({
        where: { userId, createdAt: { gte: startDate } },
      }),
      this.prisma.task.count({
        where: { userId, status: 'completed', completedAt: { gte: startDate } },
      }),
      this.prisma.task.count({
        where: {
          userId,
          status: { notIn: ['completed', 'cancelled'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return {
      total,
      completed,
      overdue,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  private async analyzeEmailData(userId: string, timeRange: string): Promise<any> {
    const startDate = this.getStartDate(timeRange);
    
    const [received, sent, threads] = await Promise.all([
      this.prisma.email.count({
        where: { userId, receivedAt: { gte: startDate } },
      }),
      this.prisma.email.count({
        where: { userId, sentAt: { gte: startDate } },
      }),
      this.prisma.emailThread.count({
        where: { userId, updatedAt: { gte: startDate } },
      }),
    ]);

    return {
      received,
      sent,
      threads,
      responseRate: received > 0 ? (sent / received) * 100 : 0,
    };
  }

  private async analyzeProductivityData(userId: string, timeRange: string): Promise<any> {
    const taskData = await this.analyzeTaskData(userId, timeRange);
    const emailData = await this.analyzeEmailData(userId, timeRange);
    
    return {
      tasks: taskData,
      emails: emailData,
      productivityScore: this.calculateProductivityScore(taskData, emailData),
    };
  }

  private calculateProductivityScore(taskData: any, emailData: any): number {
    const taskScore = taskData.completionRate * 0.6;
    const emailScore = Math.min(emailData.responseRate, 100) * 0.4;
    return Math.round(taskScore + emailScore);
  }

  private getStartDate(timeRange: string): Date {
    const now = new Date();
    const match = timeRange.match(/(\d+)([dhwm])/);
    
    if (!match) return now;
    
    const [, value, unit] = match;
    const amount = parseInt(value);
    
    switch (unit) {
      case 'd':
        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
      case 'w':
        return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
      default:
        return now;
    }
  }
}