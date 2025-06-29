import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/services/cache.service';
import { QueueService } from '../../queue/services/queue.service';
import {
  WorkflowTrigger,
  TriggerType,
  TriggerCondition,
  ConditionOperator,
  TriggerMetadata,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as cron from 'node-cron';

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);
  private readonly activeTriggers = new Map<string, { userId: string; trigger: WorkflowTrigger }>();
  private readonly cronJobs = new Map<string, cron.ScheduledTask>();

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private queueService: QueueService,
    private eventEmitter: EventEmitter2
  ) {
    this.initializeEventListeners();
  }

  /**
   * Register a new trigger
   */
  async registerTrigger(
    userId: string,
    trigger: Omit<WorkflowTrigger, 'id'>
  ): Promise<WorkflowTrigger> {
    try {
      const triggerId = this.generateTriggerId(userId, trigger.type);

      const newTrigger: WorkflowTrigger = {
        id: triggerId,
        ...trigger,
      };

      // Store trigger in database
      await this.prisma.workflowTrigger.create({
        data: {
          id: triggerId,
          userId,
          type: trigger.type,
          config: JSON.parse(JSON.stringify({ conditions: trigger.conditions })),
          active: trigger.enabled,
          metadata: JSON.parse(JSON.stringify(trigger.metadata || {})),
        },
      });

      // Activate trigger if enabled
      if (trigger.enabled) {
        await this.activateTrigger(userId, newTrigger);
      }

      // Cache trigger configuration
      await this.cacheTrigger(userId, newTrigger);

      this.logger.log(`Registered trigger ${triggerId} for user ${userId}`);
      return newTrigger;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to register trigger: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to register trigger',
        'TRIGGER_REGISTRATION_FAILED',
        undefined,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Activate a trigger
   */
  async activateTrigger(userId: string, trigger: WorkflowTrigger): Promise<void> {
    try {
      switch (trigger.type) {
        case TriggerType.TIME_BASED:
          await this.activateTimeTrigger(userId, trigger);
          break;
        case TriggerType.EVENT_BASED:
          await this.activateEventTrigger(userId, trigger);
          break;
        case TriggerType.CONTEXT_BASED:
          await this.activateContextTrigger(userId, trigger);
          break;
        case TriggerType.EMAIL_RECEIVED:
          await this.activateEmailTrigger(userId, trigger);
          break;
        case TriggerType.CALENDAR_EVENT:
          await this.activateCalendarTrigger(userId, trigger);
          break;
        case TriggerType.TASK_STATUS:
          await this.activateTaskTrigger(userId, trigger);
          break;
        case TriggerType.AI_INSIGHT:
          await this.activateAITrigger(userId, trigger);
          break;
        default:
          this.logger.warn(`Unknown trigger type: ${trigger.type}`);
      }

      this.activeTriggers.set(trigger.id, { userId, trigger });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to activate trigger: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to activate trigger',
        'TRIGGER_ACTIVATION_FAILED',
        undefined,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Deactivate a trigger
   */
  async deactivateTrigger(triggerId: string): Promise<void> {
    try {
      // Stop cron job if exists
      const cronJob = this.cronJobs.get(triggerId);
      if (cronJob) {
        cronJob.stop();
        this.cronJobs.delete(triggerId);
      }

      // Remove from active triggers
      this.activeTriggers.delete(triggerId);

      // Update database
      await this.prisma.workflowTrigger.update({
        where: { id: triggerId },
        data: { active: false },
      });

      this.logger.log(`Deactivated trigger ${triggerId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to deactivate trigger: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to deactivate trigger',
        'TRIGGER_DEACTIVATION_FAILED',
        undefined,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Evaluate trigger conditions
   */
  async evaluateTrigger(
    trigger: WorkflowTrigger,
    context: Record<string, string | number | boolean | Date>
  ): Promise<boolean> {
    try {
      if (!trigger.conditions || trigger.conditions.length === 0) {
        return true;
      }

      let result = true;
      let currentOperator: 'AND' | 'OR' = 'AND';

      for (const condition of trigger.conditions) {
        const conditionMet = this.evaluateCondition(condition, context);

        if (currentOperator === 'AND') {
          result = result && conditionMet;
        } else {
          result = result || conditionMet;
        }

        currentOperator = condition.logicalOperator || 'AND';
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to evaluate trigger: ${errorMessage}`, error);
      return false;
    }
  }

  /**
   * Fire a trigger
   */
  async fireTrigger(
    triggerId: string,
    data: Record<string, string | number | boolean | Date> = {}
  ): Promise<void> {
    try {
      const triggerData = this.activeTriggers.get(triggerId);
      if (!triggerData) {
        throw new Error(`Trigger ${triggerId} not found or not active`);
      }

      const { userId, trigger } = triggerData;

      // Check if trigger conditions are met
      const shouldFire = await this.evaluateTrigger(trigger, data);
      if (!shouldFire) {
        this.logger.debug(`Trigger ${triggerId} conditions not met`);
        return;
      }

      // Queue workflow execution
      await this.queueService.addWorkflowJob({
        userId,
        triggerId,
        triggerType: trigger.type,
        triggerData: this.serializeDataForQueue(data),
      });

      // Emit event for real-time updates
      this.eventEmitter.emit('workflow.triggered', {
        userId,
        triggerId,
        data,
      });

      this.logger.log(`Fired trigger ${triggerId} for user ${userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fire trigger: ${errorMessage}`, error);
      throw new BusinessException('Failed to fire trigger', 'TRIGGER_FIRE_FAILED', undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get user triggers
   */
  async getUserTriggers(userId: string, type?: TriggerType): Promise<WorkflowTrigger[]> {
    const triggers = await this.prisma.workflowTrigger.findMany({
      where: {
        userId,
        ...(type != null && { type }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return triggers.map(t => ({
      id: t.id,
      type: t.type as TriggerType,
      conditions: Array.isArray((t.config as Record<string, unknown>)?.conditions)
        ? ((t.config as Record<string, unknown>).conditions as TriggerCondition[])
        : [],
      enabled: t.active,
      metadata: t.metadata as TriggerMetadata,
    }));
  }

  /**
   * Activate time-based trigger
   */
  private async activateTimeTrigger(userId: string, trigger: WorkflowTrigger): Promise<void> {
    this.logger.debug(`Activating time trigger for user ${userId}: ${trigger.id}`);
    const cronPattern = trigger.metadata?.schedule?.cron;
    if (!cronPattern) {
      throw new Error('Time trigger requires cronPattern in metadata');
    }

    const task = cron.schedule(cronPattern, async () => {
      await this.fireTrigger(trigger.id, {
        firedAt: new Date(),
        type: 'scheduled',
      });
    });

    this.cronJobs.set(trigger.id, task);
    task.start();
  }

  /**
   * Activate event-based trigger
   */
  private async activateEventTrigger(userId: string, trigger: WorkflowTrigger): Promise<void> {
    const eventName = trigger.metadata?.source;
    if (!eventName) {
      throw new Error('Event trigger requires eventName in metadata');
    }

    // Register event listener
    this.eventEmitter.on(eventName, async data => {
      if (data.userId === userId) {
        await this.fireTrigger(trigger.id, data);
      }
    });
  }

  /**
   * Activate context-based trigger
   */
  private async activateContextTrigger(userId: string, trigger: WorkflowTrigger): Promise<void> {
    // Context triggers are evaluated periodically
    const checkInterval = trigger.metadata?.checkInterval || 300000; // 5 minutes default

    setInterval(async () => {
      const context = await this.getUserContext(userId);
      await this.fireTrigger(trigger.id, context);
    }, checkInterval);
  }

  /**
   * Activate email trigger
   */
  private async activateEmailTrigger(userId: string, trigger: WorkflowTrigger): Promise<void> {
    this.eventEmitter.on('email.received', async data => {
      if (data.userId === userId) {
        await this.fireTrigger(trigger.id, {
          emailId: data.emailId,
          subject: data.subject,
          from: data.from,
          receivedAt: data.receivedAt,
        });
      }
    });
  }

  /**
   * Activate calendar trigger
   */
  private async activateCalendarTrigger(userId: string, trigger: WorkflowTrigger): Promise<void> {
    const eventTypes = trigger.metadata?.eventTypes || ['created', 'updated'];

    eventTypes.forEach((eventType: string) => {
      this.eventEmitter.on(`calendar.${eventType}`, async data => {
        if (data.userId === userId) {
          await this.fireTrigger(trigger.id, data);
        }
      });
    });
  }

  /**
   * Activate task trigger
   */
  private async activateTaskTrigger(userId: string, trigger: WorkflowTrigger): Promise<void> {
    const statusChanges = trigger.metadata?.statusChanges || ['completed', 'overdue'];

    this.eventEmitter.on('task.statusChanged', async data => {
      if (data.userId === userId && statusChanges.includes(data.newStatus)) {
        await this.fireTrigger(trigger.id, data);
      }
    });
  }

  /**
   * Activate AI insight trigger
   */
  private async activateAITrigger(userId: string, trigger: WorkflowTrigger): Promise<void> {
    this.eventEmitter.on('ai.insightDetected', async data => {
      if (data.userId === userId) {
        const insightTypes = trigger.metadata?.insightTypes || [];
        if (insightTypes.length === 0 || insightTypes.includes(data.insightType)) {
          await this.fireTrigger(trigger.id, data);
        }
      }
    });
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: TriggerCondition,
    context: Record<string, string | number | boolean | Date>
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case ConditionOperator.EQUALS:
        return fieldValue === conditionValue;
      case ConditionOperator.NOT_EQUALS:
        return fieldValue !== conditionValue;
      case ConditionOperator.CONTAINS:
        return String(fieldValue).includes(String(conditionValue));
      case ConditionOperator.STARTS_WITH:
        return String(fieldValue).startsWith(String(conditionValue));
      case ConditionOperator.ENDS_WITH:
        return String(fieldValue).endsWith(String(conditionValue));
      case ConditionOperator.GREATER_THAN:
        return Number(fieldValue) > Number(conditionValue);
      case ConditionOperator.LESS_THAN:
        return Number(fieldValue) < Number(conditionValue);
      case ConditionOperator.IN:
        return Array.isArray(conditionValue) && conditionValue.some(val => val === fieldValue);
      case ConditionOperator.NOT_IN:
        return Array.isArray(conditionValue) && !conditionValue.some(val => val === fieldValue);
      case ConditionOperator.MATCHES_PATTERN:
        return new RegExp(String(conditionValue)).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(
    field: string,
    context: Record<string, string | number | boolean | Date>
  ): string | number | boolean | Date | undefined {
    const keys = field.split('.');
    let current: string | number | boolean | Date | Record<string, unknown> | undefined = context;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key] as
          | string
          | number
          | boolean
          | Date
          | Record<string, unknown>
          | undefined;
      } else {
        return undefined;
      }
    }

    return current as string | number | boolean | Date | undefined;
  }

  /**
   * Get user context for context-based triggers
   */
  private async getUserContext(
    userId: string
  ): Promise<Record<string, string | number | boolean | Date>> {
    const [taskCount, upcomingEvents, recentEmails] = await Promise.all([
      this.prisma.task.count({
        where: { userId, status: 'pending' },
      }),
      this.prisma.calendarEvent.count({
        where: {
          userId,
          startTime: { gte: new Date() },
        },
      }),
      this.prisma.email.count({
        where: {
          userId,
          receivedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      taskCount,
      upcomingEvents,
      recentEmails,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
    };
  }

  /**
   * Generate trigger ID
   */
  private generateTriggerId(userId: string, type: TriggerType): string {
    return `${userId}-${type}-${Date.now()}`;
  }

  /**
   * Cache trigger configuration
   */
  private async cacheTrigger(userId: string, trigger: WorkflowTrigger): Promise<void> {
    const key = `trigger:${userId}:${trigger.id}`;
    await this.cacheService.set(key, trigger, 3600); // 1 hour
    this.logger.debug(`Cached trigger ${trigger.id} for user ${userId}`);
  }

  /**
   * Initialize event listeners
   */
  private initializeEventListeners(): void {
    // Listen for system events
    this.eventEmitter.on('system.startup', async () => {
      await this.loadActiveTriggers();
    });

    this.eventEmitter.on('system.shutdown', async () => {
      await this.deactivateAllTriggers();
    });
  }

  /**
   * Load active triggers on startup
   */
  private async loadActiveTriggers(): Promise<void> {
    try {
      const triggers = await this.prisma.workflowTrigger.findMany({
        where: { active: true },
      });

      for (const trigger of triggers) {
        const workflowTrigger: WorkflowTrigger = {
          id: trigger.id,
          type: trigger.type as TriggerType,
          conditions: Array.isArray((trigger.config as Record<string, unknown>)?.conditions)
            ? ((trigger.config as Record<string, unknown>).conditions as TriggerCondition[])
            : [],
          enabled: trigger.active,
          metadata: trigger.metadata as TriggerMetadata,
        };

        await this.activateTrigger(trigger.userId, workflowTrigger);
      }

      this.logger.log(`Loaded ${triggers.length} active triggers`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load active triggers: ${errorMessage}`, error);
    }
  }

  /**
   * Deactivate all triggers on shutdown
   */
  private async deactivateAllTriggers(): Promise<void> {
    for (const [triggerId] of this.activeTriggers) {
      await this.deactivateTrigger(triggerId);
    }
  }

  /**
   * Serialize data for queue by converting Date objects to strings
   */
  private serializeDataForQueue(
    data: Record<string, string | number | boolean | Date>
  ): Record<string, string | number | boolean> {
    const serialized: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date) {
        serialized[key] = value.toISOString();
      } else {
        serialized[key] = value;
      }
    }

    return serialized;
  }
}
