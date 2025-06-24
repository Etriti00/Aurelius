import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class UsageTrackingService {
  constructor(private prisma: PrismaService) {}

  async trackAction(userId: string, actionType: string, model?: string, cost?: number) {
    // Update current usage
    const usage = await this.prisma.usage.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            subscription: true,
          },
        },
      },
    });

    if (!usage) {
      throw new Error('Usage record not found');
    }

    const updateData: any = {
      actionsUsed: { increment: 1 },
    };

    // Update specific action type counter
    const actionTypeMap: Record<string, string> = {
      voice_command: 'voiceActions',
      text_command: 'textActions',
      email_draft: 'emailActions',
      calendar_action: 'calendarActions',
      workflow_action: 'workflowActions',
      integration_sync: 'integrationActions',
      ai_analysis: 'aiAnalysisActions',
    };

    const actionField = actionTypeMap[actionType];
    if (actionField) {
      updateData[actionField] = { increment: 1 };
    }

    // Update model usage
    if (model) {
      const modelMap: Record<string, string> = {
        'claude-3-haiku': 'haikuActions',
        'claude-3-5-sonnet': 'sonnetActions',
        'claude-3-opus': 'opusActions',
      };

      const modelField = modelMap[model];
      if (modelField) {
        updateData[modelField] = { increment: 1 };
      }
    }

    // Check if over allocation
    const newActionsUsed = usage.actionsUsed + 1;
    if (newActionsUsed > usage.monthlyAllocation) {
      updateData.overageActions = { increment: 1 };

      if (cost) {
        const overageRate = usage.user.subscription?.overageRate || 0.1;
        const overageCost = new Decimal(overageRate);
        updateData.overageCost = { increment: overageCost };
      }
    }

    // Update remaining actions
    updateData.actionsRemaining = Math.max(0, usage.monthlyAllocation - newActionsUsed);

    return await this.prisma.usage.update({
      where: { id: usage.id },
      data: updateData,
    });
  }

  async initializeUserUsage(userId: string, subscriptionTier: string) {
    const allocation = this.getAllocationByTier(subscriptionTier);
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return await this.prisma.usage.create({
      data: {
        userId,
        periodStart,
        periodEnd,
        monthlyAllocation: allocation,
        actionsRemaining: allocation,
      },
    });
  }

  async resetMonthlyUsage(userId: string) {
    const usage = await this.prisma.usage.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            subscription: true,
          },
        },
      },
    });

    if (!usage) return;

    // Archive current usage to history
    await this.prisma.usageHistory.create({
      data: {
        userId,
        periodStart: usage.periodStart,
        periodEnd: usage.periodEnd,
        actionsAlloted: usage.monthlyAllocation,
        actionsUsed: usage.actionsUsed,
        overageActions: usage.overageActions,
        overageCost: usage.overageCost,
        breakdown: {
          textActions: usage.textActions,
          voiceActions: usage.voiceActions,
          emailActions: usage.emailActions,
          calendarActions: usage.calendarActions,
          workflowActions: usage.workflowActions,
          integrationActions: usage.integrationActions,
          aiAnalysisActions: usage.aiAnalysisActions,
          haikuActions: usage.haikuActions,
          sonnetActions: usage.sonnetActions,
          opusActions: usage.opusActions,
        },
      },
    });

    // Reset for new period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const allocation = this.getAllocationByTier(usage.user.subscription?.tier || 'PROFESSIONAL');

    await this.prisma.usage.update({
      where: { id: usage.id },
      data: {
        periodStart,
        periodEnd,
        monthlyAllocation: allocation,
        actionsUsed: 0,
        actionsRemaining: allocation,
        overageActions: 0,
        overageCost: new Decimal(0),
        textActions: 0,
        voiceActions: 0,
        emailActions: 0,
        calendarActions: 0,
        workflowActions: 0,
        integrationActions: 0,
        aiAnalysisActions: 0,
        haikuActions: 0,
        sonnetActions: 0,
        opusActions: 0,
        cacheHitRate: 0,
        averageResponseTime: 0,
      },
    });
  }

  private getAllocationByTier(tier: string): number {
    const allocations: Record<string, number> = {
      PROFESSIONAL: 1000,
      TEAM: 1500,
      ENTERPRISE: 2000,
    };
    return allocations[tier] || 1000;
  }
}
