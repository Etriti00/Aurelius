import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './services/notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { Notification } from '@prisma/client';

// Interface for authenticated user in requests (consistent with tasks controller)
export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
}

// Interface for paginated notifications response
export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}

// Interface for unread count response
export interface UnreadCountResponse {
  unreadCount: number;
}

// Interface for notification preferences response
export interface NotificationPreferencesResponse {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notificationFrequency: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationQueryDto
  ): Promise<NotificationsResponse> {
    return this.notificationsService.getUserNotifications(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser): Promise<UnreadCountResponse> {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a notification (admin only)' })
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto
  ): Promise<Notification> {
    return this.notificationsService.create(createNotificationDto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ): Promise<{ count: number }> {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ): Promise<{ count: number }> {
    return this.notificationsService.delete(user.id, id);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() preferences: UpdateNotificationDto
  ): Promise<NotificationPreferencesResponse> {
    return this.notificationsService.updatePreferences(user.id, preferences);
  }
}
