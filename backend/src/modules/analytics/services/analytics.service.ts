import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/services/cache.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService
  ) {}

  async getUserUsageAnalytics(userId: string, query: AnalyticsQueryDto) {
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

  async getCurrentPeriodUsage(userId: string) {
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

  async getPerformanceMetrics(userId: string, query: AnalyticsQueryDto) {
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

  async generateInsights(userId: string) {
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

    const insights = [];

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

    return { insights };
  }

  async getActivityTimeline(userId: string, query: AnalyticsQueryDto) {
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

    return {
      activities,
      hasMore: activities.length === limit,
    };
  }

  async getIntegrationAnalytics(userId: string, provider: string, query: AnalyticsQueryDto) {
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
    const whereClause: any = {
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

    return {
      integration,
      syncHistory: providerLogs.filter(log => log.type === 'integration_sync'),
      actionCount: providerLogs.length,
      lastSync: integration.lastSyncAt,
      nextSync: integration.nextSyncAt,
      queryApplied: {
        startDate: query.startDate,
        endDate: query.endDate,
        limit: query.limit,
        offset: query.offset,
      },
    };
  }

  // Private helper methods
  private calculateUsageSummary(history: any[]) {
    if (!history.length) return null;

    const totalActions = history.reduce((sum, h) => sum + h.actionsUsed, 0);
    const totalOverage = history.reduce((sum, h) => sum + h.overageActions, 0);
    const totalCost = history.reduce((sum, h) => sum + parseFloat(h.overageCost.toString()), 0);

    return {
      totalActions,
      totalOverage,
      totalCost,
      averageActionsPerPeriod: totalActions / history.length,
    };
  }

  private calculateAverageResponseTime(logs: any[]) {
    const logsWithDuration = logs.filter(log => log.duration);
    if (!logsWithDuration.length) return 0;

    const totalDuration = logsWithDuration.reduce((sum, log) => sum + log.duration, 0);
    return Math.round(totalDuration / logsWithDuration.length);
  }

  private calculateCacheHitRate(logs: any[]) {
    if (!logs.length) return 0;
    const cacheHits = logs.filter(log => log.fromCache).length;
    return Math.round((cacheHits / logs.length) * 100);
  }

  private calculateSuccessRate(logs: any[]) {
    if (!logs.length) return 100;
    const successful = logs.filter(log => log.status === 'success').length;
    return Math.round((successful / logs.length) * 100);
  }

  private groupActionsByType(logs: any[]) {
    const grouped = logs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => (b.count as number) - (a.count as number));
  }

  private groupPerformanceByHour(logs: any[]) {
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
      count: data.count,
      avgDuration: data.durations.length
        ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
        : 0,
    }));
  }
}
