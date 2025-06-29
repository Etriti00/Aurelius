import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/services/queue.service';
import { AIGatewayService } from '../../ai-gateway/ai-gateway.service';
import { EmailService } from '../../email/email.service';
import { TasksService } from '../../tasks/tasks.service';
import { CalendarService } from '../../calendar/calendar.service';
import {
  WorkflowAction,
  ActionType,
  ExecutedAction,
  ActionInput,
  ActionOutput,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotificationChannel,
  NotificationType,
  NotificationPriority,
} from '../../../common/types/notification.types';

@Injectable()
export class ActionService {
  private readonly logger = new Logger(ActionService.name);
  private readonly actionHandlers = new Map<
    ActionType,
    (userId: string, parameters: ActionInput) => Promise<ActionOutput>
  >();

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private aiGateway: AIGatewayService,
    private emailService: EmailService,
    private tasksService: TasksService,
    private calendarService: CalendarService,
    private eventEmitter: EventEmitter2
  ) {
    this.registerActionHandlers();
  }

  /**
   * Execute a workflow action
   */
  async executeAction(
    userId: string,
    action: WorkflowAction,
    parameters: ActionInput
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Action execution failed: ${errorMessage}`, error);

      const executedAction: ExecutedAction = {
        actionId: action.id,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        status: 'failed',
        input: parameters,
        error: errorMessage,
      };

      // Emit failure event
      this.eventEmitter.emit('workflow.action.failed', {
        userId,
        action: action.type,
        error: errorMessage,
      });

      return executedAction;
    }
  }

  /**
   * Execute multiple actions
   */
  async executeActions(
    userId: string,
    actions: Array<{ action: WorkflowAction; parameters: ActionInput }>
  ): Promise<ExecutedAction[]> {
    const results: ExecutedAction[] = [];

    for (const { action, parameters } of actions) {
      const result = await this.executeAction(userId, action, parameters);
      results.push(result);

      // Stop execution if action failed and it's not optional
      if (result.status === 'failed') {
        this.logger.warn(`Action ${action.id} failed, stopping execution`);
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
  private async handleCreateTask(userId: string, parameters: ActionInput): Promise<ActionOutput> {
    const taskParams = parameters.parameters;
    const task = await this.tasksService.create(userId, {
      title: String(taskParams.title),
      description: taskParams.description ? String(taskParams.description) : undefined,
      dueDate: taskParams.dueDate ? new Date(String(taskParams.dueDate)) : undefined,
      priority: String(taskParams.priority || 'medium'),
      labels: Array.isArray(taskParams.labels) ? taskParams.labels.map(String) : [],
    });

    return {
      result: {
        taskId: task.id,
        title: task.title,
        createdAt: task.createdAt,
      },
      metadata: {
        executionTime: Date.now() - parameters.context.timestamp.getTime(),
        resourcesUsed: ['tasks'],
      },
    };
  }

  private async handleUpdateTask(userId: string, parameters: ActionInput): Promise<ActionOutput> {
    const taskParams = parameters.parameters;
    const updates: Record<string, string | Date | string[]> = {};

    if (taskParams.status) updates.status = String(taskParams.status);
    if (taskParams.priority) updates.priority = String(taskParams.priority);
    if (taskParams.dueDate) updates.dueDate = new Date(String(taskParams.dueDate));
    if (taskParams.assignedTo) updates.assignedTo = String(taskParams.assignedTo);

    const taskIds = Array.isArray(taskParams.taskIds)
      ? taskParams.taskIds.map(String)
      : [String(taskParams.taskId)];

    const results: Array<{ taskId: string; updated: boolean }> = [];
    for (const taskId of taskIds) {
      const task = await this.tasksService.update(userId, taskId, updates);
      results.push({
        taskId: task.id,
        updated: true,
      });
    }

    return {
      result: { results: results.length.toString() },
      metadata: {
        executionTime: Date.now() - parameters.context.timestamp.getTime(),
        resourcesUsed: ['tasks'],
      },
    };
  }

  private async handleSendEmail(userId: string, parameters: ActionInput): Promise<ActionOutput> {
    const emailParams = parameters.parameters;
    // Generate email content if needed
    let content = String(emailParams.content || '');
    if (emailParams.generateContent) {
      // Get user subscription info for AI gateway
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user || !user.subscription) {
        throw new Error('User or subscription not found for AI content generation');
      }

      const generated = await this.aiGateway.processRequest({
        prompt: `Write a professional email with subject: ${String(
          emailParams.subject
        )}\nContext: ${String(emailParams.context || '')}`,
        userId,
        action: 'email-content-generation',
        userSubscription: { tier: user.subscription.tier },
        metadata: { type: 'email-content' },
      });
      content = generated.text;
    }

    const email = await this.emailService.sendEmail({
      from: String(emailParams.from || 'noreply@aurelius.ai'),
      to: String(emailParams.to),
      subject: String(emailParams.subject),
      content,
      html: content,
    });

    return {
      result: {
        messageId: email.messageId,
        sentAt: new Date(),
      },
      metadata: {
        executionTime: Date.now() - parameters.context.timestamp.getTime(),
        resourcesUsed: ['email'],
      },
    };
  }

  private async handleScheduleEvent(
    userId: string,
    parameters: ActionInput
  ): Promise<ActionOutput> {
    const eventParams = parameters.parameters;
    const event = await this.calendarService.createEvent(userId, {
      title: String(eventParams.title),
      description: eventParams.description ? String(eventParams.description) : undefined,
      startTime: new Date(String(eventParams.startTime)),
      endTime: eventParams.endTime
        ? new Date(String(eventParams.endTime))
        : new Date(Date.now() + (Number(eventParams.duration) || 60) * 60000),
      location: eventParams.location ? String(eventParams.location) : undefined,
      attendees: Array.isArray(eventParams.attendees) ? eventParams.attendees.map(String) : [],
    });

    return {
      result: {
        eventId: event.id,
        title: event.title,
        startTime: event.startTime,
      },
      metadata: {
        executionTime: Date.now() - parameters.context.timestamp.getTime(),
        resourcesUsed: ['calendar'],
      },
    };
  }

  private async handleCreateReminder(
    userId: string,
    parameters: ActionInput
  ): Promise<ActionOutput> {
    const reminderParams = parameters.parameters;
    // Create a scheduled notification as a reminder
    const reminder = await this.prisma.notification.create({
      data: {
        userId,
        type: 'reminder',
        title: String(reminderParams.title),
        message: String(reminderParams.message),
        scheduledFor: new Date(String(reminderParams.remindAt)),
        actions: [],
        channels: ['in_app'],
      },
    });

    // Schedule reminder notification
    await this.queueService.addNotificationJob({
      userId,
      type: NotificationType.TASK_REMINDER,
      title: String(reminderParams.title),
      message: String(reminderParams.message),
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.IN_APP],
      scheduledFor: new Date(String(reminderParams.remindAt)),
    });

    return {
      result: {
        reminderId: reminder.id,
        scheduledFor: new Date(String(reminderParams.remindAt)),
      },
      metadata: {
        executionTime: Date.now() - parameters.context.timestamp.getTime(),
        resourcesUsed: ['notifications'],
      },
    };
  }

  private async handleExecuteIntegration(
    _userId: string,
    parameters: ActionInput
  ): Promise<ActionOutput> {
    const integrationParams = parameters.parameters;
    const integration = String(integrationParams.integration);
    const action = String(integrationParams.action);

    // Queue integration execution
    const job = await this.queueService.addIntegrationSyncJob(
      { integrationId: integration },
      {
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    return {
      result: {
        jobId: job.id,
        status: 'queued',
        integration,
        action,
      },
      metadata: {
        executionTime: Date.now() - parameters.context.timestamp.getTime(),
        resourcesUsed: ['integrations'],
      },
    };
  }

  private async handleTriggerWorkflow(
    userId: string,
    parameters: ActionInput
  ): Promise<ActionOutput> {
    const workflowParams = parameters.parameters;
    const workflowId = String(workflowParams.workflowId || workflowParams.workflowType);

    // Queue workflow execution
    const job = await this.queueService.addWorkflowJob({
      userId,
      triggerId: workflowId,
      triggerType: 'manual',
      triggerData:
        typeof workflowParams.data === 'object' &&
        workflowParams.data !== null &&
        !Array.isArray(workflowParams.data) &&
        !(workflowParams.data instanceof Date)
          ? (workflowParams.data as Record<string, string | number | boolean>)
          : {},
    });

    return {
      result: {
        workflowExecutionId: job.id,
        status: 'triggered',
      },
      metadata: {
        executionTime: Date.now() - parameters.context.timestamp.getTime(),
        resourcesUsed: ['workflows'],
      },
    };
  }

  private async handleGenerateContent(
    userId: string,
    parameters: ActionInput
  ): Promise<ActionOutput> {
    const contentParams = parameters.parameters;
    const prompt = String(contentParams.prompt || this.buildContentPrompt(contentParams));

    // Get user subscription info for AI gateway
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user || !user.subscription) {
      throw new Error('User or subscription not found for content generation');
    }

    const response = await this.aiGateway.processRequest({
      prompt,
      userId,
      action: 'content-generation',
      userSubscription: { tier: user.subscription.tier },
      metadata: {
        type: 'content-generation',
      },
    });

    // Save generated content if requested
    if (contentParams.save) {
      // Save to ActionLog since there's no generatedContent model
      await this.prisma.actionLog.create({
        data: {
          userId,
          type: 'content_generation',
          category: 'ai',
          output: response.text,
          metadata: {
            prompt,
            parameters: contentParams,
            contentType: String(contentParams.contentType || 'text'),
          },
        },
      });
    }

    return {
      result: {
        content: response.text,
        saved: Boolean(contentParams.save),
      },
      metadata: {
        executionTime: Date.now() - parameters.context.timestamp.getTime(),
        resourcesUsed: ['ai'],
      },
    };
  }

  private async handleAnalyzeData(userId: string, parameters: ActionInput): Promise<ActionOutput> {
    const analysisParams = parameters.parameters;
    const dataType = String(analysisParams.dataType);
    const timeRange = String(analysisParams.timeRange || '7d');
    const metricsRequested = Array.isArray(analysisParams.metrics)
      ? analysisParams.metrics.map(String)
      : [];

    // Log the metrics requested for potential future use
    this.logger.debug(
      `Analyzing data for type ${dataType}, timeRange ${timeRange}, metrics: ${metricsRequested.join(
        ', '
      )}`
    );

    // Gather data based on type
    let data: Record<string, number | string | boolean>;
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
      result: {
        analysis: JSON.stringify(data),
        generatedAt: new Date(),
        timeRange,
      },
      metadata: {
        executionTime: Date.now() - parameters.context.timestamp.getTime(),
        resourcesUsed: ['analytics'],
      },
    };
  }

  private async handleNotifyUser(userId: string, parameters: ActionInput): Promise<ActionOutput> {
    const notificationParams = parameters.parameters;
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: String(notificationParams.notificationType || 'info'),
        title: String(notificationParams.title),
        message: String(notificationParams.message),
        actions: Array.isArray(notificationParams.actions)
          ? notificationParams.actions.map(String)
          : [],
        channels: Array.isArray(notificationParams.channels)
          ? notificationParams.channels.map(String)
          : ['in_app'],
        relatedType: notificationParams.relatedType
          ? String(notificationParams.relatedType)
          : undefined,
        relatedId: notificationParams.relatedId ? String(notificationParams.relatedId) : undefined,
      },
    });

    // Queue notification delivery
    await this.queueService.addNotificationJob({
      userId,
      type: NotificationType.SYSTEM_UPDATE,
      title: String(notificationParams.title),
      message: String(notificationParams.message),
      priority: NotificationPriority.MEDIUM,
      channels: notification.channels.map(channel => {
        const channelMap: Record<string, NotificationChannel> = {
          in_app: NotificationChannel.IN_APP,
          email: NotificationChannel.EMAIL,
          push: NotificationChannel.PUSH,
          sms: NotificationChannel.SMS,
          slack: NotificationChannel.SLACK,
        };
        return channelMap[channel.toLowerCase()] || NotificationChannel.IN_APP;
      }),
    });

    return {
      result: {
        notificationId: notification.id,
        delivered: true,
      },
      metadata: {
        executionTime: Date.now() - parameters.context.timestamp.getTime(),
        resourcesUsed: ['notifications'],
      },
    };
  }

  /**
   * Helper methods
   */
  private validateParameters(action: WorkflowAction, parameters: ActionInput): void {
    const parameterValues = parameters.parameters;
    const required = action.parameters.required;

    for (const [key, definition] of Object.entries(required)) {
      if (!(key in parameterValues)) {
        throw new BusinessException(`Missing required parameter: ${key}`, 'MISSING_PARAMETER');
      }

      const value = parameterValues[key];

      // Type validation
      if (definition.type === 'array' && !Array.isArray(value)) {
        throw new BusinessException(`Parameter ${key} must be an array`, 'INVALID_PARAMETER_TYPE');
      }

      // Additional validation
      if (definition.validation) {
        if (definition.validation.pattern) {
          const pattern = new RegExp(definition.validation.pattern);
          if (!pattern.test(String(value))) {
            throw new BusinessException(
              `Parameter ${key} does not match required pattern`,
              'INVALID_PARAMETER_PATTERN'
            );
          }
        }

        if (definition.validation.min !== undefined && Number(value) < definition.validation.min) {
          throw new BusinessException(
            `Parameter ${key} is below minimum value`,
            'PARAMETER_BELOW_MIN'
          );
        }

        if (definition.validation.max !== undefined && Number(value) > definition.validation.max) {
          throw new BusinessException(
            `Parameter ${key} exceeds maximum value`,
            'PARAMETER_EXCEEDS_MAX'
          );
        }
      }
    }
  }

  private async checkRequirements(userId: string, action: WorkflowAction): Promise<void> {
    for (const requirement of action.requires) {
      switch (requirement.type) {
        case 'permission':
          await this.checkPermission(userId, requirement.details.permission?.scope || 'default');
          break;
        case 'integration':
          await this.checkIntegration(
            userId,
            requirement.details.integration?.provider || 'default'
          );
          break;
        case 'data':
          await this.checkDataAvailability(userId, requirement.details.data?.source || 'default');
          break;
        case 'confirmation':
          // In a real implementation, this would check if user confirmed
          break;
      }
    }
  }

  private async checkPermission(userId: string, scope: string): Promise<void> {
    // Implementation would check user permissions for the given scope
    // For now, we log the permission check and allow all operations
    this.logger.debug(`Checking permission for user ${userId} with scope ${scope}`);
    const hasPermission = true; // Placeholder
    if (!hasPermission) {
      throw new BusinessException(`User lacks required permission: ${scope}`, 'PERMISSION_DENIED');
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
        'INTEGRATION_NOT_CONNECTED'
      );
    }
  }

  private async checkDataAvailability(userId: string, dataType: string): Promise<void> {
    // Implementation would check if required data exists for the user and data type
    // For now, we log the data availability check and assume data exists
    this.logger.debug(`Checking data availability for user ${userId} with type ${dataType}`);
    const hasData = true; // Placeholder
    if (!hasData) {
      throw new BusinessException(`Required data not available: ${dataType}`, 'DATA_NOT_AVAILABLE');
    }
  }

  private buildContentPrompt(
    parameters: Record<string, string | number | boolean | Date | string[] | number[]>
  ): string {
    const type = String(parameters.contentType || 'text');
    const context = String(parameters.context || '');
    const style = String(parameters.style || 'professional');
    const length = String(parameters.length || 'medium');

    return `Generate ${type} content:
Type: ${type}
Style: ${style}
Length: ${length}
Context: ${context}
Additional requirements: ${String(parameters.requirements || 'None')}`;
  }

  private async analyzeTaskData(
    userId: string,
    timeRange: string
  ): Promise<Record<string, number | string | boolean>> {
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

  private async analyzeEmailData(
    userId: string,
    timeRange: string
  ): Promise<Record<string, number | string | boolean>> {
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

  private async analyzeProductivityData(
    userId: string,
    timeRange: string
  ): Promise<Record<string, number | string | boolean>> {
    const taskData = await this.analyzeTaskData(userId, timeRange);
    const emailData = await this.analyzeEmailData(userId, timeRange);

    return {
      tasks: JSON.stringify(taskData),
      emails: JSON.stringify(emailData),
      productivityScore: String(
        this.calculateProductivityScore(
          taskData as Record<string, number>,
          emailData as Record<string, number>
        )
      ),
    };
  }

  private calculateProductivityScore(
    taskData: Record<string, number>,
    emailData: Record<string, number>
  ): number {
    const taskScore = Number(taskData.completionRate || 0) * 0.6;
    const emailScore = Math.min(Number(emailData.responseRate || 0), 100) * 0.4;
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
