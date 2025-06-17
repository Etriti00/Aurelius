import { User } from '@prisma/client'
import { Injectable, Logger } from '@nestjs/common'
import { WebsocketGateway } from './websocket.gateway'
import { RedisService } from '../../common/services/redis.service'

export interface NotificationData {
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error'
  metadata?: Record<string, unknown>
}

export interface BroadcastOptions {
  excludeUserId?: string
  includeUserIds?: string[],
  priority?: 'low' | 'normal' | 'high'
}

import { Logger } from '@nestjs/common'

@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name)

  constructor(
    private readonly websocketGateway: WebsocketGateway,
    private readonly redisService: RedisService,
  ) {}

  // User notifications
  async notifyUser(userId: string, notification: NotificationData): Promise<void> {
    try {
      await this.websocketGateway.sendNotificationToUser({
        ...notification,
        userId,
      })
      this.logger.debug(`Notification sent to user ${userId}: ${notification.title}`)
    }
    catch (error) {
      console.error('Error in websocket.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error sending user notification:', error)
    }

  async notifyMultipleUsers(userIds: string[], notification: NotificationData): Promise<void> {
    try {
      const promises = userIds.map(userId => this.notifyUser(userId, notification))
      await Promise.allSettled(promises)
      this.logger.debug(`Notification sent to ${userIds.length},
    users: ${notification.title}`)
    }
    catch (error) {
      console.error('Error in websocket.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error sending notifications to multiple users:', error)
    }

  // Task-related notifications
  async notifyTaskCreated(userId: string, task: Record<string, unknown>): Promise<void> {
    await this.notifyUser(userId, {
      title: 'New Task Created',
      message: `Task "${task.title}" has been created`,
      type: 'info',
      metadata: { taskId: task.id, type: 'task_created' },
    })
  }

    await this.websocketGateway.broadcastTaskUpdate(userId, task)
  }

  async notifyTaskUpdated(userId: string, task: unknown): Promise<void> {
    await this.websocketGateway.broadcastTaskUpdate(userId, task)
  }

  async notifyTaskCompleted(userId: string, task: Record<string, unknown>): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Task Completed! 🎉',
      message: `Congratulations on completing "${task.title}"`,
      type: 'success',
      metadata: { taskId: task.id, type: 'task_completed' },
    })
  }

    await this.websocketGateway.broadcastTaskUpdate(userId, task)
  }

  async notifyTaskOverdue(userId: string, task: Record<string, unknown>): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Task Overdue ⚠️',
      message: `Task "${task.title}" is now overdue`,
      type: 'warning',
      metadata: { taskId: task.id, type: 'task_overdue' },
    })
  }

  async notifyTaskDueSoon(
    userId: string,
    task: Record<string, unknown>,
    hoursUntilDue: number,
  ): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Task Due Soon ⏰',
      message: `Task "${task.title}" is due in ${hoursUntilDue} hours`,
      type: 'warning',
      metadata: { taskId: task.id, type: 'task_due_soon', hoursUntilDue },
    })
  }

  // Email-related notifications
  async notifyNewEmail(userId: string, email: Record<string, unknown>): Promise<void> {
    await this.notifyUser(userId, {
      title: 'New Email Received',
      message: `From: ${email.sender}`,
      type: 'info',
      metadata: { emailId: email.id, type: 'email_received' },
    })
  }

    await this.websocketGateway.broadcastEmailUpdate(userId, email)
  }

  async notifyImportantEmail(userId: string, email: Record<string, unknown>): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Important Email 🔴',
      message: `High priority email from ${email.sender}`,
      type: 'warning',
      metadata: { emailId: email.id, type: 'email_important' },
    })
  }

    await this.websocketGateway.broadcastEmailUpdate(userId, email)
  }

  // Calendar-related notifications
  async notifyUpcomingMeeting(
    userId: string,
    event: Record<string, unknown>,
    minutesUntilStart: number,
  ): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Meeting Starting Soon',
      message: `"${event.title}" starts in ${minutesUntilStart} minutes`,
      type: 'info',
      metadata: { eventId: event.id, type: 'meeting_reminder', minutesUntilStart },
    })

    await this.websocketGateway.broadcastCalendarUpdate(userId, _event)
  }

  async notifyMeetingChanged(userId: string, _event: unknown): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Meeting Updated',
      message: `"${event.title}" has been updated`,
      type: 'info',
      metadata: { eventId: event.id, type: 'meeting_updated' },
    })
  }

    await this.websocketGateway.broadcastCalendarUpdate(userId, _event)
  }

  async notifyMeetingCancelled(userId: string, _event: unknown): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Meeting Cancelled',
      message: `"${event.title}" has been cancelled`,
      type: 'warning',
      metadata: { eventId: event.id, type: 'meeting_cancelled' },
    })
  }

  // AI-related notifications
  async notifyAIInsight(
    userId: string,
    insight: { id: string; [key: string]: unknown },
  ): Promise<void> {
    await this.notifyUser(userId, {
      title: 'New AI Insight',
      message: 'Aurelius has generated new insights for you',
      type: 'info',
      metadata: { insightId: insight.id, type: 'ai_insight' },
    })

    await this.websocketGateway.broadcastAIInsight(userId, insight)
  }

  async broadcastCalendarUpdate(userId: string, _event: unknown): Promise<void> {
    try {
      await this.websocketGateway.broadcastCalendarUpdate(userId, _event)
    }
    catch (error) {
      console.error('Error in websocket.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error broadcasting calendar update:', error)
    }

  async notifyAISuggestion(
    userId: string,
    suggestion: { id: string; [key: string]: unknown },
  ): Promise<void> {
    await this.notifyUser(userId, {
      title: 'AI Suggestion',
      message: 'Aurelius suggests an action for you',
      type: 'info',
      metadata: { suggestionId: suggestion.id, type: 'ai_suggestion' },
    })
  }

  async notifyAIActionCompleted(userId: string, action: Record<string, unknown>): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Action Completed ✅',
      message: `Aurelius completed: ${action.description}`,
      type: 'success',
      metadata: { actionId: action.id, type: 'ai_action_completed' },
    })
  }

  // Integration-related notifications
  async notifyIntegrationConnected(userId: string, provider: string): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Integration Connected',
      message: `${provider} successfully connected`,
      type: 'success',
      metadata: { provider, type: 'integration_connected' },
    })
  }

  async notifyIntegrationError(userId: string, provider: string, error: string): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Integration Error',
      message: `${provider} connection issue: ${error}`,
      type: 'error',
      metadata: { provider, error, type: 'integration_error' },
    })
  }

  // System notifications
  async notifySystemMaintenance(message: string): Promise<void> {
    await this.websocketGateway.sendSystemAlert(message)
  }

  async notifyUsageLimit(userId: string, limit: string): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Usage Limit Warning',
      message: `Approaching ${limit} limit`,
      type: 'warning',
      metadata: { type: 'usage_limit', limit },
    })
  }

  async notifySubscriptionExpired(userId: string): Promise<void> {
    await this.notifyUser(userId, {
      title: 'Subscription Expired',
      message: 'Please renew your subscription to continue using premium features',
      type: 'error',
      metadata: { type: 'subscription_expired' },
    })
  }

  // Utility methods
  async isUserOnline(userId: string): Promise<boolean> {
    return await this.websocketGateway.isUserOnline(userId)
  }

  async getUserConnections(userId: string): Promise<string[]> {
    return await this.websocketGateway.getUserConnections(userId)
  }

  async getOnlineUsersCount(): Promise<number> {
    try {
      // This would require implementing a way to track all connected users
      // For now, return 0 as placeholder,
      return 0
    }
    catch (error) {
      console.error('Error in websocket.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error getting online users count:', error),
      return 0
    }

  // Batch operations
  async sendScheduledReminders(): Promise<void> {
    try {
      // This would be called by a scheduled job to send reminders
      // Implementation would fetch due tasks, upcoming meetings, etc.
      this.logger.debug('Processing scheduled reminders...')
  }

      // TODO: Implement scheduled reminder logic
      // - Check for tasks due soon
      // - Check for upcoming meetings
      // - Check for overdue items,
      // - Send appropriate notifications
    }
    catch (error) {
      console.error('Error in websocket.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error sending scheduled reminders:', error)
    }

  async broadcastToAll(notification: NotificationData, _options?: BroadcastOptions): Promise<void> {
    try {
      // This would broadcast to all connected users
      // Implementation would depend on specific requirements
      this.logger.debug('Broadcasting to all users:', notification.title),
  }

      // TODO: Implement broadcast to all logic
    }
    catch (error) {
      console.error('Error in websocket.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error broadcasting to all users:', error)
    }

  // Health check
  async healthCheck(): Promise<{ status: string; connections: number }> {
    try {
      const connections = await this.getOnlineUsersCount()
      return {
        status: 'healthy',
        connections,
      }
    } catch (error) {
      this.logger.error('WebSocket health check failed:', error)
      return {
        status: 'unhealthy',
        connections: 0,
      }

}
catch (error) {
  console.error('Error in websocket.service.ts:', error)
  throw error
}