import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  async trackPerformance(
    userId: string,
    actionId: string,
    metrics: {
      duration: number;
      queueTime?: number;
      processingTime?: number;
      fromCache: boolean;
    },
  ) {
    await this.prisma.actionLog.update({
      where: { id: actionId },
      data: {
        duration: metrics.duration,
        queueTime: metrics.queueTime,
        processingTime: metrics.processingTime,
        fromCache: metrics.fromCache,
      },
    });

    // Update average response time in usage
    await this.updateAverageResponseTime(userId);
  }

  async updateCacheHitRate(userId: string) {
    const recentActions = await this.prisma.actionLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      select: {
        fromCache: true,
      },
    });

    if (recentActions.length === 0) return;

    const cacheHits = recentActions.filter(a => a.fromCache).length;
    const hitRate = (cacheHits / recentActions.length) * 100;

    await this.prisma.usage.updateMany({
      where: { userId },
      data: {
        cacheHitRate: Math.round(hitRate),
      },
    });
  }

  private async updateAverageResponseTime(userId: string) {
    const recentActions = await this.prisma.actionLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        duration: {
          not: null,
        },
      },
      select: {
        duration: true,
      },
    });

    if (recentActions.length === 0) return;

    const totalDuration = recentActions.reduce(
      (sum, action) => sum + (action.duration || 0),
      0,
    );
    const avgDuration = Math.round(totalDuration / recentActions.length);

    await this.prisma.usage.updateMany({
      where: { userId },
      data: {
        averageResponseTime: avgDuration,
      },
    });
  }
}