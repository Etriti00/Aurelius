import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface UsageRecord {
  userId: string;
  model: string;
  action: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  duration: number;
  cacheHit: boolean;
}

interface UsageStats {
  totalActions: number;
  totalCost: number;
  totalTokens: number;
  cacheHitRate: number;
  avgDuration: number;
  modelBreakdown: Record<string, number>;
  actionBreakdown: Record<string, number>;
}

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordUsage(usage: UsageRecord): Promise<void> {
    try {
      await this.prisma.aIUsageLog.create({
        data: {
          userId: usage.userId,
          model: usage.model,
          action: usage.action,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalCost: usage.totalCost,
          duration: usage.duration,
          cacheHit: usage.cacheHit,
        },
      });

      // Update user's subscription usage counter
      await this.updateSubscriptionUsage(usage.userId);

      this.logger.debug(
        `Recorded AI usage for user ${usage.userId}: ${usage.model} - ${usage.action}`
      );
    } catch (error) {
      this.logger.error('Failed to record AI usage', error);
    }
  }

  async getUserUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<UsageStats> {
    const whereClause: any = { userId };
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const usageLogs = await this.prisma.aIUsageLog.findMany({
      where: whereClause,
    });

    if (usageLogs.length === 0) {
      return {
        totalActions: 0,
        totalCost: 0,
        totalTokens: 0,
        cacheHitRate: 0,
        avgDuration: 0,
        modelBreakdown: {},
        actionBreakdown: {},
      };
    }

    const totalActions = usageLogs.length;
    const totalCost = usageLogs.reduce((sum, log) => sum + log.totalCost.toNumber(), 0);
    const totalTokens = usageLogs.reduce(
      (sum, log) => sum + log.inputTokens + log.outputTokens,
      0
    );
    const cacheHits = usageLogs.filter(log => log.cacheHit).length;
    const cacheHitRate = (cacheHits / totalActions) * 100;
    const avgDuration = usageLogs.reduce((sum, log) => sum + log.duration, 0) / totalActions;

    const modelBreakdown: Record<string, number> = {};
    const actionBreakdown: Record<string, number> = {};

    usageLogs.forEach(log => {
      modelBreakdown[log.model] = (modelBreakdown[log.model] || 0) + 1;
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
    });

    return {
      totalActions,
      totalCost,
      totalTokens,
      cacheHitRate,
      avgDuration,
      modelBreakdown,
      actionBreakdown,
    };
  }

  async getCurrentMonthUsage(userId: string): Promise<{ actionsUsed: number; limit: number }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const actionsCount = await this.prisma.aIUsageLog.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    const limit = user?.subscription?.aiActionsPerMonth || 1000;

    return {
      actionsUsed: actionsCount,
      limit,
    };
  }

  async checkUsageLimit(userId: string): Promise<boolean> {
    const usage = await this.getCurrentMonthUsage(userId);
    return usage.actionsUsed < usage.limit;
  }

  async getSystemUsageStats(startDate?: Date, endDate?: Date): Promise<any> {
    const whereClause: any = {};
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [totalUsage, costByModel, topUsers] = await Promise.all([
      this.prisma.aIUsageLog.aggregate({
        where: whereClause,
        _sum: {
          totalCost: true,
          inputTokens: true,
          outputTokens: true,
        },
        _count: {
          id: true,
        },
        _avg: {
          duration: true,
        },
      }),

      this.prisma.aIUsageLog.groupBy({
        by: ['model'],
        where: whereClause,
        _sum: {
          totalCost: true,
        },
        _count: {
          id: true,
        },
      }),

      this.prisma.aIUsageLog.groupBy({
        by: ['userId'],
        where: whereClause,
        _sum: {
          totalCost: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            totalCost: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      overview: {
        totalActions: totalUsage._count.id || 0,
        totalCost: totalUsage._sum.totalCost?.toNumber() || 0,
        totalTokens: (totalUsage._sum.inputTokens || 0) + (totalUsage._sum.outputTokens || 0),
        avgDuration: totalUsage._avg.duration || 0,
      },
      costByModel,
      topUsers,
    };
  }

  private async updateSubscriptionUsage(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user?.subscription) {
        return;
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const currentMonthUsage = await this.prisma.aIUsageLog.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      });

      await this.prisma.subscription.update({
        where: { id: user.subscription.id },
        data: { aiActionsUsed: currentMonthUsage },
      });
    } catch (error) {
      this.logger.error('Failed to update subscription usage', error);
    }
  }

  async cleanupOldUsageLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const result = await this.prisma.aIUsageLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old usage logs`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup old usage logs', error);
      return 0;
    }
  }
}