import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUsage(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user?.subscription) {
      return { error: 'No subscription found' };
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await this.prisma.aIUsageLog.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        totalCost: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      subscription: user.subscription,
      currentPeriod: {
        start: user.subscription.currentPeriodStart,
        end: user.subscription.currentPeriodEnd,
      },
      usage: {
        aiActions: usage._count.id || 0,
        aiActionsLimit: user.subscription.aiActionsPerMonth,
        totalCost: usage._sum.totalCost?.toNumber() || 0,
      },
    };
  }
}