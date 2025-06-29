import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '../../common/exceptions/app.exception';
import { Tier } from '@prisma/client';
import {
  CreateUserData,
  UpdateUserData,
  UserWithRelations,
  UserProfileResponse,
  UserUsageStatsResponse,
  UserPreferences,
} from './interfaces/user-response.interface';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  private isUserPreferences(value: unknown): value is UserPreferences {
    return (
      typeof value === 'object' &&
      value !== null &&
      'workingHours' in value &&
      'communicationStyle' in value &&
      'priorities' in value &&
      'automationLevel' in value &&
      'notifications' in value
    );
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      workingHours: { start: '09:00', end: '17:00', timezone: 'UTC' },
      communicationStyle: 'casual',
      priorities: [],
      automationLevel: 'moderate',
      notifications: {},
    };
  }

  async findById(id: string): Promise<UserWithRelations> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        integrations: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            provider: true,
            status: true,
            lastSyncAt: true,
          },
        },
        _count: {
          select: {
            tasks: { where: { status: { not: 'ARCHIVED' } } },
            emailThreads: { where: { isRead: false } },
            events: {
              where: {
                startTime: { gte: new Date() },
                status: 'CONFIRMED',
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User');
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        subscription: true,
        integrations: true,
        _count: {
          select: {
            tasks: true,
            emailThreads: true,
            events: true,
          },
        },
      },
    });
  }

  async create(userData: CreateUserData): Promise<UserWithRelations> {
    try {
      // Check if user with email already exists
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const user = await this.prisma.user.create({
        data: {
          ...userData,
          lastActiveAt: new Date(),
          // Create default Pro subscription
          subscription: {
            create: {
              tier: Tier.PRO,
              status: 'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              monthlyActionLimit: 1000,
              integrationLimit: 10,
              stripeCustomerId: '',
              stripeSubscriptionId: '',
              stripePriceId: '',
              monthlyPrice: 50.0,
              overageRate: 0.06,
            },
          },
        },
        include: {
          subscription: true,
          integrations: true,
          _count: {
            select: {
              tasks: true,
              emailThreads: true,
              events: true,
            },
          },
        },
      });

      this.logger.log(`Created new user: ${user.email}`);
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error);
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('User with this email already exists');
      }
      throw error;
    }
  }

  async update(id: string, updateData: UpdateUserData): Promise<UserWithRelations> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: {
          subscription: true,
          integrations: {
            where: { status: 'active' },
            select: {
              id: true,
              provider: true,
              status: true,
              lastSyncAt: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              emailThreads: true,
              events: true,
            },
          },
        },
      });

      this.logger.log(`Updated user profile: ${id}`);
      return user;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new NotFoundException('User');
      }
      this.logger.error('Failed to update user', error);
      throw error;
    }
  }

  async updateLastActive(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { lastActiveAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Failed to update last active for user: ${id}`, error);
    }
  }

  async updatePreferences(id: string, preferences: UserPreferences): Promise<UserWithRelations> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          preferences,
          updatedAt: new Date(),
        },
        include: {
          subscription: true,
          integrations: true,
          _count: {
            select: {
              tasks: true,
              emailThreads: true,
              events: true,
            },
          },
        },
      });

      this.logger.log(`Updated preferences for user: ${id}`);
      return user;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new NotFoundException('User');
      }
      throw error;
    }
  }

  async getProfile(id: string): Promise<UserProfileResponse> {
    const user = await this.findById(id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      voiceId: user.voiceId,
      voiceSpeed: user.voiceSpeed,
      preferences: this.isUserPreferences(user.preferences)
        ? user.preferences
        : this.getDefaultPreferences(),
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt,
      subscription:
        user.subscription !== null && user.subscription !== undefined ? user.subscription : null,
      integrations: user.integrations,
      stats: {
        activeTasks: user._count.tasks,
        unreadEmails: user._count.emailThreads,
        upcomingEvents: user._count.events,
      },
    };
  }

  async getUsageStats(id: string): Promise<UserUsageStatsResponse> {
    const user = await this.findById(id);

    if (!user.subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Get current month AI usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const aiUsage = await this.prisma.aIUsageLog.aggregate({
      where: {
        userId: id,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        totalCost: true,
      },
      _count: {
        id: true,
      },
    });

    const totalCost = aiUsage._sum.totalCost?.toNumber() || 0;
    const actionCount = aiUsage._count.id || 0;

    return {
      subscription: {
        tier: user.subscription.tier,
        status: user.subscription.status,
        currentPeriodStart: user.subscription.currentPeriodStart,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
      },
      aiUsage: {
        actionsUsed: actionCount,
        actionsLimit: user.subscription.monthlyActionLimit,
        totalCost,
        inputTokens: aiUsage._sum.inputTokens || 0,
        outputTokens: aiUsage._sum.outputTokens || 0,
      },
      integrations: {
        active: user.integrations.length,
        limit: user.subscription.integrationLimit,
      },
    };
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
      this.logger.log(`Deleted user: ${id}`);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new NotFoundException('User');
      }
      throw error;
    }
  }
}
