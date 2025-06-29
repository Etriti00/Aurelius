import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/services/queue.service';
import { CreateNotificationDto, NotificationPriority } from '../dto/create-notification.dto';
import {
  NotificationType,
  NotificationPriority as TypesNotificationPriority,
  NotificationChannel,
} from '../../../common/types/notification.types';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { NotificationQueryDto } from '../dto/notification-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService
  ) {}

  async create(data: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority ?? 'medium',
      },
    });

    // Queue notification delivery
    await this.queueService.addNotificationJob({
      userId: notification.userId,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      priority: this.mapPriorityToEnum(notification.priority),
      channels: [NotificationChannel.IN_APP], // Default to in-app notifications
    });

    return notification;
  }

  async getUserNotifications(userId: string, query: NotificationQueryDto) {
    const where: Prisma.NotificationWhereInput = { userId };

    if (query.type != null) {
      where.type = query.type;
    }

    if (query.unreadOnly) {
      where.readAt = null;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip || 0,
        take: query.take || 20,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
      hasMore: (query.skip || 0) + notifications.length < total,
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });

    return { unreadCount: count };
  }

  async markAsRead(userId: string, notificationId: string) {
    return await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  async delete(userId: string, notificationId: string) {
    return await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  async updatePreferences(userId: string, preferences: UpdateNotificationDto) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        smsNotifications: preferences.smsNotifications,
        notificationFrequency: preferences.notificationFrequency,
      },
      select: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: true,
        notificationFrequency: true,
      },
    });
  }

  async sendToUser(
    userId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      metadata?: Prisma.JsonValue;
      priority?: string;
    }
  ) {
    // Create notification in database
    const created = await this.create({
      userId,
      type: this.validateNotificationType(notification.type),
      title: notification.title,
      message: notification.message,
      priority: this.validateNotificationPriority(notification.priority),
    });

    // Send real-time notification via WebSocket
    // This will be handled by WebSocket gateway

    return created;
  }

  async sendToMultipleUsers(
    userIds: string[],
    notification: {
      type: string;
      title: string;
      message: string;
      metadata?: Prisma.JsonValue;
      priority?: string;
    }
  ) {
    const notifications = await this.prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata || Prisma.JsonNull,
        priority: notification.priority || 'medium',
      })),
    });

    // Queue batch notification delivery
    await this.queueService.addBatchNotificationJob({
      userIds,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      priority: this.mapPriorityToEnum(notification.priority),
      channels: [NotificationChannel.IN_APP], // Default to in-app notifications
    });

    return { count: notifications.count };
  }

  private validateNotificationType(type: string): NotificationType {
    const validTypes = Object.values(NotificationType);
    if (validTypes.includes(type as NotificationType)) {
      return type as NotificationType;
    }
    return NotificationType.SYSTEM_UPDATE; // Use a valid enum value
  }

  private mapPriorityToEnum(priority: string | undefined): TypesNotificationPriority {
    if (!priority) {
      return TypesNotificationPriority.MEDIUM;
    }

    switch (priority.toUpperCase()) {
      case 'LOW':
        return TypesNotificationPriority.LOW;
      case 'HIGH':
        return TypesNotificationPriority.HIGH;
      case 'URGENT':
        return TypesNotificationPriority.URGENT;
      case 'MEDIUM':
      default:
        return TypesNotificationPriority.MEDIUM;
    }
  }

  private validateNotificationPriority(
    priority: string | undefined
  ): NotificationPriority | undefined {
    if (!priority) {
      return undefined;
    }
    const validPriorities = Object.values(NotificationPriority);
    if (validPriorities.includes(priority as NotificationPriority)) {
      return priority as NotificationPriority;
    }
    return NotificationPriority.MEDIUM;
  }
}
