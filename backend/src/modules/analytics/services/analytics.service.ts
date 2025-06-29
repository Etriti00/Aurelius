import { Injectable } from '@nestjs/common';
import { Prisma, Usage, UsageHistory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/services/cache.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import {
  UsageAnalytics,
  UsageSummary,
  PerformanceMetrics,
  Insight,
  ActivityTimelineItem,
  IntegrationAnalytics,
} from '../interfaces/analytics.interface';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService
  ) {}

  async getUserUsageAnalytics(userId: string, query: AnalyticsQueryDto): Promise<UsageAnalytics> {
    const cacheKey = this.cacheService.generateHashKey(`analytics:usage:${userId}`, query);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = query.endDate || new Date();

        const [usage, history] = await Promise.all([
          this.prisma.usage.findUnique({
            where: { userId },
          }),
          this.prisma.usageHistory.findMany({
            where: {
              userId,
              periodStart: {
                gte: startDate,
                lte: endDate,
              },
            },
            orderBy: { periodStart: 'desc' },
          }),
        ]);

        return {
          current: usage,
          history,
          summary: this.calculateUsageSummary(history),
        };
      },
      300
    ); // Cache for 5 minutes
  }

  async getCurrentPeriodUsage(userId: string): Promise<Usage | null> {
    return this.prisma.usage.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            subscription: true,
          },
        },
      },
    });
  }

  async getPerformanceMetrics(
    userId: string,
    query: AnalyticsQueryDto
  ): Promise<PerformanceMetrics> {
    const cacheKey = this.cacheService.generateHashKey(`analytics:performance:${userId}`, query);

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endDate = query.endDate || new Date();

        const actionLogs = await this.prisma.actionLog.findMany({
          where: {
            userId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            type: true,
            category: true,
            duration: true,
            fromCache: true,
            status: true,
            createdAt: true,
          },
        });

        return {
          averageResponseTime: this.calculateAverageResponseTime(actionLogs),
          cacheHitRate: this.calculateCacheHitRate(actionLogs),
          successRate: this.calculateSuccessRate(actionLogs),
          actionsByType: this.groupActionsByType(actionLogs),
          performanceByHour: this.groupPerformanceByHour(actionLogs),
        };
      },
      300
    );
  }

  async generateInsights(userId: string): Promise<Insight[]> {
    // Generate AI-powered insights based on user data
    const [taskStats, emailStats, usageStats] = await Promise.all([
      this.prisma.task.aggregate({
        where: { userId },
        _count: { id: true },
        _avg: { actualMinutes: true },
      }),
      this.prisma.email.aggregate({
        where: { userId },
        _count: { id: true },
      }),
      this.prisma.aIUsageLog.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { totalCost: true },
      }),
    ]);

    const insights: Insight[] = [];

    // Task completion insights
    if (taskStats._count.id > 10) {
      const avgTime = taskStats._avg.actualMinutes || 0;
      insights.push({
        type: 'productivity_pattern',
        title: 'Task Completion Analysis',
        description: `You've completed ${
          taskStats._count.id
        } tasks with an average duration of ${Math.round(avgTime)} minutes`,
        priority: 'medium',
      });
    }

    // Email management insights
    if (emailStats._count.id > 20) {
      insights.push({
        type: 'communication_pattern',
        title: 'Email Activity',
        description: `You've processed ${emailStats._count.id} emails. Consider setting up automated filters for better efficiency`,
        priority: 'medium',
      });
    }

    // Cost optimization insights
    if (usageStats._sum.totalCost && usageStats._sum.totalCost.toNumber() > 5) {
      insights.push({
        type: 'cost_optimization',
        title: 'AI Usage Optimization',
        description: `Current AI usage cost: $${usageStats._sum.totalCost
          .toNumber()
          .toFixed(2)}. Enable caching to reduce costs`,
        priority: 'high',
      });
    }

    return insights;
  }

  async getActivityTimeline(
    userId: string,
    query: AnalyticsQueryDto
  ): Promise<ActivityTimelineItem[]> {
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const activities = await this.prisma.actionLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        category: true,
        status: true,
        createdAt: true,
        metadata: true,
      },
    });

    // Group activities by date and transform to timeline items
    const groupedByDate = activities.reduce(
      (acc, activity) => {
        const dateKey = activity.createdAt.toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            activityCount: 0,
            actions: [] as Array<{ type: string; count: number }>,
          };
        }
        acc[dateKey].activityCount++;

        const existingAction = acc[dateKey].actions.find(a => a.type === activity.type);
        if (existingAction) {
          existingAction.count++;
        } else {
          acc[dateKey].actions.push({ type: activity.type, count: 1 });
        }

        return acc;
      },
      {} as Record<string, ActivityTimelineItem>
    );

    return Object.values(groupedByDate);
  }

  async getIntegrationAnalytics(
    userId: string,
    provider: string,
    query: AnalyticsQueryDto
  ): Promise<IntegrationAnalytics> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Apply query filters
    const whereClause: Prisma.ActionLogWhereInput = {
      userId,
      category: 'integration',
    };

    // Apply date range from query
    if (query.startDate || query.endDate) {
      whereClause.createdAt = {};
      if (query.startDate) whereClause.createdAt.gte = new Date(query.startDate);
      if (query.endDate) whereClause.createdAt.lte = new Date(query.endDate);
    }

    const actionLogs = await this.prisma.actionLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: query.limit || 100,
      skip: query.offset || 0,
    });

    // Filter by provider in metadata
    const providerLogs = actionLogs.filter(log => {
      const metadata = log.metadata as Record<string, string>;
      return metadata && metadata.provider === provider;
    });

    const syncHistory = providerLogs.filter(log => log.type === 'integration_sync');
    const successfulSyncs = syncHistory.filter(log => log.status === 'success');
    const errors = providerLogs
      .filter(log => log.status === 'error')
      .map(log => {
        const metadata = log.metadata as Record<string, string>;
        return metadata?.error || 'Sync error occurred';
      });

    return {
      provider,
      totalSyncs: syncHistory.length,
      successRate:
        syncHistory.length > 0
          ? Math.round((successfulSyncs.length / syncHistory.length) * 100)
          : 100,
      lastSync: integration.lastSyncAt,
      errors,
    };
  }

  // Private helper methods
  private calculateUsageSummary(history: UsageHistory[]): UsageSummary {
    if (!history.length) {
      return {
        totalActions: 0,
        averageDaily: 0,
        peakDay: null,
        growth: 0,
      };
    }

    const totalActions = history.reduce((sum, h) => sum + h.actionsUsed, 0);
    const averageDaily = totalActions / history.length;

    // Find peak day
    const peakRecord = history.reduce((peak, current) =>
      current.actionsUsed > peak.actionsUsed ? current : peak
    );

    // Calculate growth (compare first and last periods)
    const growth =
      history.length > 1
        ? ((history[0].actionsUsed - history[history.length - 1].actionsUsed) /
            history[history.length - 1].actionsUsed) *
          100
        : 0;

    return {
      totalActions,
      averageDaily,
      peakDay: peakRecord.periodStart,
      growth: Math.round(growth),
    };
  }

  private calculateAverageResponseTime(logs: Array<{ duration: number | null }>): number {
    const logsWithDuration = logs.filter(log => log.duration !== null);
    if (!logsWithDuration.length) return 0;

    const totalDuration = logsWithDuration.reduce((sum, log) => sum + (log.duration || 0), 0);
    return Math.round(totalDuration / logsWithDuration.length);
  }

  private calculateCacheHitRate(logs: Array<{ fromCache: boolean }>): number {
    if (!logs.length) return 0;
    const cacheHits = logs.filter(log => log.fromCache).length;
    return Math.round((cacheHits / logs.length) * 100);
  }

  private calculateSuccessRate(logs: Array<{ status: string }>): number {
    if (!logs.length) return 100;
    const successful = logs.filter(log => log.status === 'success').length;
    return Math.round((successful / logs.length) * 100);
  }

  private groupActionsByType(logs: Array<{ type: string }>): Record<string, number> {
    return logs.reduce(
      (acc, log) => {
        acc[log.type] = (acc[log.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private groupPerformanceByHour(
    logs: Array<{ createdAt: Date; duration: number | null }>
  ): Array<{ hour: number; avgResponseTime: number; requestCount: number }> {
    const hourlyData = new Array(24).fill(null).map((_, hour) => ({
      hour,
      count: 0,
      avgDuration: 0,
      durations: [] as number[],
    }));

    logs.forEach(log => {
      const hour = new Date(log.createdAt).getHours();
      hourlyData[hour].count++;
      if (log.duration) {
        hourlyData[hour].durations.push(log.duration);
      }
    });

    return hourlyData.map(data => ({
      hour: data.hour,
      avgResponseTime: data.durations.length
        ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
        : 0,
      requestCount: data.count,
    }));
  }
}
