import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppWebSocketGateway } from '../websocket.gateway';
import {
  WebSocketEventData,
  WebSocketEventType,
  TypedWebSocketEvent,
  BroadcastOptions,
  EventProcessingResult,
  TaskEventData,
  EmailEventData,
  CalendarEventData,
  AIEventData,
  NotificationEventData,
} from '../interfaces/websocket.interface';

@Injectable()
export class WebSocketEventService {
  private readonly logger = new Logger(WebSocketEventService.name);
  private readonly eventQueue: WebSocketEventData[] = [];
  private readonly eventHistory = new Map<string, WebSocketEventData[]>();
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly websocketGateway: AppWebSocketGateway
  ) {
    this.setupEventProcessing();
  }

  private setupEventProcessing(): void {
    const config = this.configService.get('websocket.messageQueue');

    if (!config?.enabled) {
      this.logger.debug('Event queue processing disabled');
      return;
    }

    const processingInterval = config.processingInterval || 1000;
    const batchSize = config.processingBatchSize || 100;

    this.processingInterval = setInterval(() => {
      this.processEventQueue(batchSize);
    }, processingInterval);

    this.logger.log('WebSocket event processing started');
  }

  private async processEventQueue(batchSize: number): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, batchSize);

    for (const eventData of batch) {
      try {
        await this.processEvent(eventData);
      } catch (error) {
        this.logger.error(`Failed to process event ${eventData.event}:`, error);

        // Add back to queue for retry if retryable
        if (eventData.metadata?.retryCount !== undefined && eventData.metadata.retryCount < 3) {
          eventData.metadata.retryCount++;
          this.eventQueue.push(eventData);
        }
      }
    }
  }

  private async processEvent(eventData: WebSocketEventData): Promise<void> {
    const { event, data, userId } = eventData;

    // Store in event history for debugging/audit
    this.storeEventHistory(eventData);

    // Route event based on type
    switch (event) {
      case 'user':
        if (userId) {
          this.websocketGateway.sendToUser(userId, event, data);
        }
        break;
      case 'room':
        const roomId = data.roomId as string;
        if (roomId) {
          this.websocketGateway.sendToRoom(roomId, event, data);
        }
        break;
      case 'broadcast':
        this.websocketGateway.sendToAll(event, data);
        break;
      default:
        // Handle specific event types
        await this.handleTypedEvent(event as WebSocketEventType, data, userId);
    }
  }

  private async handleTypedEvent(
    eventType: WebSocketEventType,
    data: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    const routingConfig = this.configService.get('websocket.events.routing');

    // Determine routing pattern
    let target: string;

    if (userId) {
      target = routingConfig?.user?.replace('{userId}', userId) || `user:${userId}`;
    } else if (eventType.startsWith('system:')) {
      target = routingConfig?.system || 'system';
    } else {
      target = routingConfig?.broadcast || 'broadcast';
    }

    // Send the event
    if (target === 'broadcast') {
      this.websocketGateway.sendToAll(eventType, data);
    } else if (target.startsWith('user:')) {
      const targetUserId = target.replace('user:', '');
      this.websocketGateway.sendToUser(targetUserId, eventType, data);
    } else {
      this.websocketGateway.sendToRoom(target, eventType, data);
    }
  }

  private storeEventHistory(eventData: WebSocketEventData): void {
    const persistenceConfig = this.configService.get('websocket.events.persistence');

    if (!persistenceConfig?.enabled) return;

    const maxEvents = persistenceConfig.maxEventsPerUser || 1000;
    const userId = eventData.userId || 'anonymous';

    if (!this.eventHistory.has(userId)) {
      this.eventHistory.set(userId, []);
    }

    const userHistory = this.eventHistory.get(userId);
    if (!userHistory) return; // Should not happen due to check above, but for safety
    userHistory.push(eventData);

    // Keep only recent events
    if (userHistory.length > maxEvents) {
      userHistory.splice(0, userHistory.length - maxEvents);
    }
  }

  // Public API methods for emitting events

  /**
   * Emit a task-related event
   */
  async emitTaskEvent(
    type: 'created' | 'updated' | 'completed' | 'deleted',
    taskData: TaskEventData,
    userId?: string,
    options?: BroadcastOptions
  ): Promise<EventProcessingResult> {
    const event: TypedWebSocketEvent<Record<string, unknown>> = {
      type: `task:${type}` as WebSocketEventType,
      data: JSON.parse(JSON.stringify(taskData)) as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      userId,
      metadata: {
        source: 'task-service',
        priority: taskData.priority === 'high' ? 'high' : 'medium',
        persistent: true,
        retryable: true,
      },
    };

    return this.queueEvent(event, options);
  }

  /**
   * Emit an email-related event
   */
  async emitEmailEvent(
    type: 'received' | 'read' | 'archived',
    emailData: EmailEventData,
    userId?: string,
    options?: BroadcastOptions
  ): Promise<EventProcessingResult> {
    const event: TypedWebSocketEvent<Record<string, unknown>> = {
      type: `email:${type}` as WebSocketEventType,
      data: JSON.parse(JSON.stringify(emailData)) as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      userId,
      metadata: {
        source: 'email-service',
        priority: 'medium',
        persistent: true,
        retryable: true,
      },
    };

    return this.queueEvent(event, options);
  }

  /**
   * Emit a calendar-related event
   */
  async emitCalendarEvent(
    type: 'created' | 'updated' | 'reminder',
    calendarData: CalendarEventData,
    userId?: string,
    options?: BroadcastOptions
  ): Promise<EventProcessingResult> {
    const event: TypedWebSocketEvent<Record<string, unknown>> = {
      type: `calendar:event:${type}` as WebSocketEventType,
      data: JSON.parse(JSON.stringify(calendarData)) as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      userId,
      metadata: {
        source: 'calendar-service',
        priority: type === 'reminder' ? 'high' : 'medium',
        persistent: true,
        retryable: true,
      },
    };

    return this.queueEvent(event, options);
  }

  /**
   * Emit an AI-related event
   */
  async emitAIEvent(
    type:
      | 'suggestion:new'
      | 'insight:generated'
      | 'processing:started'
      | 'processing:completed'
      | 'processing:failed',
    aiData: AIEventData,
    userId?: string,
    options?: BroadcastOptions
  ): Promise<EventProcessingResult> {
    const event: TypedWebSocketEvent<Record<string, unknown>> = {
      type: `ai:${type}` as WebSocketEventType,
      data: JSON.parse(JSON.stringify(aiData)) as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      userId,
      metadata: {
        source: 'ai-service',
        priority: aiData.priority,
        persistent: type.includes('failed'),
        retryable: !type.includes('failed'),
      },
    };

    return this.queueEvent(event, options);
  }

  /**
   * Emit a system notification
   */
  async emitNotification(
    notificationData: NotificationEventData,
    userId?: string,
    options?: BroadcastOptions
  ): Promise<EventProcessingResult> {
    const event: TypedWebSocketEvent<Record<string, unknown>> = {
      type: 'system:notification',
      data: JSON.parse(JSON.stringify(notificationData)) as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      userId,
      metadata: {
        source: 'notification-service',
        priority: notificationData.type === 'error' ? 'high' : 'medium',
        persistent: notificationData.persistent,
        retryable: true,
      },
    };

    return this.queueEvent(event, options);
  }

  /**
   * Broadcast system maintenance message
   */
  async emitMaintenanceNotice(
    message: string,
    scheduledTime?: string,
    options?: BroadcastOptions
  ): Promise<EventProcessingResult> {
    const event: TypedWebSocketEvent = {
      type: 'system:maintenance',
      data: {
        message,
        scheduledTime,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'system',
        priority: 'high',
        persistent: true,
        retryable: true,
      },
    };

    return this.queueEvent(event, { ...options, rooms: ['broadcast'] });
  }

  private async queueEvent(
    event: TypedWebSocketEvent,
    options?: BroadcastOptions
  ): Promise<EventProcessingResult> {
    const eventData: WebSocketEventData = {
      userId: event.userId,
      timestamp: event.timestamp,
      event: event.type,
      data: event.data,
      metadata: {
        source: event.metadata?.source,
        priority: event.metadata?.priority,
        retryCount: 0,
      },
    };

    // Add to processing queue
    this.eventQueue.push(eventData);

    // If high priority, process immediately
    if (event.metadata?.priority === 'high') {
      try {
        await this.processEvent(eventData);
        // Remove from queue since we processed it
        const index = this.eventQueue.indexOf(eventData);
        if (index > -1) {
          this.eventQueue.splice(index, 1);
        }
      } catch (error) {
        this.logger.error(`Failed to process high-priority event:`, error);
      }
    }

    return {
      success: true,
      processedAt: new Date().toISOString(),
      recipientCount: await this.getRecipientCount(event.type, options),
    };
  }

  private async getRecipientCount(
    _eventType: WebSocketEventType,
    options?: BroadcastOptions
  ): Promise<number> {
    // Estimate recipient count based on event type and options
    const stats = this.websocketGateway.getConnectionStats();

    if (options?.userId) {
      return this.websocketGateway.isUserConnected(options.userId) ? 1 : 0;
    }

    if (options?.rooms?.includes('broadcast')) {
      return stats.totalConnections as number;
    }

    // Default estimation
    return Math.floor((stats.totalConnections as number) * 0.1); // Assume 10% relevance
  }

  /**
   * Get event processing statistics
   */
  getEventStats(): Record<string, unknown> {
    return {
      queueSize: this.eventQueue.length,
      totalUsersWithHistory: this.eventHistory.size,
      isProcessing: this.processingInterval !== null,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get event history for a user
   */
  getUserEventHistory(userId: string, limit = 100): WebSocketEventData[] {
    const history = this.eventHistory.get(userId) || [];
    return history.slice(-limit);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Process remaining events
    if (this.eventQueue.length > 0) {
      this.logger.log(`Processing ${this.eventQueue.length} remaining events before shutdown`);
      await this.processEventQueue(this.eventQueue.length);
    }

    this.eventHistory.clear();
    this.logger.log('WebSocket event service cleaned up');
  }
}
