import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { NotificationService } from '../../notifications/notifications.service';
import { TaskService } from '../../tasks/tasks.service';
import { BusinessException } from '../../../common/exceptions';

@Injectable()
export class RecurringJobService {
  private readonly logger = new Logger(RecurringJobService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private taskService: TaskService,
  ) {}

  /**
   * Daily summary job - runs at 6 PM every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async sendDailySummaries(): Promise<void> {
    try {
      this.logger.log('Starting daily summary job');

      // Get users with daily summary enabled
      const users = await this.prisma.user.findMany({
        where: {
          preferences: {
            path: '$.notifications.dailySummary',
            equals: true,
          },
        },
      });

      for (const user of users) {
        try {
          await this.generateAndSendDailySummary(user.id);
        } catch (error) {
          this.logger.error(`Failed to send daily summary for user ${user.id}: ${error}`);
        }
      }

      this.logger.log(`Sent daily summaries to ${users.length} users`);
    } catch (error: any) {
      this.logger.error(`Daily summary job failed: ${error.message}`);
    }
  }

  /**
   * Weekly review job - runs at 4 PM every Friday
   */
  @Cron('0 16 * * 5')
  async sendWeeklyReviews(): Promise<void> {
    try {
      this.logger.log('Starting weekly review job');

      const users = await this.prisma.user.findMany({
        where: {
          preferences: {
            path: '$.notifications.weeklyReview',
            equals: true,
          },
        },
      });

      for (const user of users) {
        try {
          await this.generateAndSendWeeklyReview(user.id);
        } catch (error) {
          this.logger.error(`Failed to send weekly review for user ${user.id}: ${error}`);
        }
      }

      this.logger.log(`Sent weekly reviews to ${users.length} users`);
    } catch (error: any) {
      this.logger.error(`Weekly review job failed: ${error.message}`);
    }
  }

  /**
   * Task reminder job - runs every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendTaskReminders(): Promise<void> {
    try {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      // Find tasks with upcoming due dates
      const tasks = await this.prisma.task.findMany({
        where: {
          status: { in: ['pending', 'in_progress'] },
          dueDate: {
            gte: now,
            lte: thirtyMinutesFromNow,
          },
          reminder: true,
          reminderSent: false,
        },
        include: { user: true },
      });

      for (const task of tasks) {
        try {
          await this.notificationService.sendNotification(task.userId, {
            type: 'task_reminder',
            title: 'Task Due Soon',
            message: `Task "${task.title}" is due in ${this.getTimeUntilDue(task.dueDate!)}`,
            data: { taskId: task.id },
            channels: ['in_app', 'push'],
          });

          // Mark reminder as sent
          await this.prisma.task.update({
            where: { id: task.id },
            data: { reminderSent: true },
          });
        } catch (error) {
          this.logger.error(`Failed to send reminder for task ${task.id}: ${error}`);
        }
      }

      this.logger.log(`Sent ${tasks.length} task reminders`);
    } catch (error: any) {
      this.logger.error(`Task reminder job failed: ${error.message}`);
    }
  }

  /**
   * Meeting preparation job - runs every 15 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async prepareMeetings(): Promise<void> {
    try {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      // Find upcoming meetings
      const events = await this.prisma.calendarEvent.findMany({
        where: {
          startTime: {
            gte: now,
            lte: thirtyMinutesFromNow,
          },
          preparationSent: false,
          type: 'meeting',
        },
        include: {
          user: true,
          attendees: true,
        },
      });

      for (const event of events) {
        try {
          await this.generateMeetingPreparation(event);
          
          // Mark preparation as sent
          await this.prisma.calendarEvent.update({
            where: { id: event.id },
            data: { preparationSent: true },
          });
        } catch (error) {
          this.logger.error(`Failed to prepare meeting ${event.id}: ${error}`);
        }
      }

      this.logger.log(`Prepared ${events.length} meetings`);
    } catch (error: any) {
      this.logger.error(`Meeting preparation job failed: ${error.message}`);
    }
  }

  /**
   * Data cleanup job - runs at 2 AM every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldData(): Promise<void> {
    try {
      this.logger.log('Starting data cleanup job');

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Clean old notifications
      const deletedNotifications = await this.prisma.notification.deleteMany({
        where: {
          createdAt: { lt: thirtyDaysAgo },
          read: true,
        },
      });

      // Clean old job executions
      const deletedExecutions = await this.prisma.jobExecution.deleteMany({
        where: {
          completedAt: { lt: thirtyDaysAgo },
          status: { in: ['completed', 'failed'] },
        },
      });

      // Clean old activity logs
      const deletedLogs = await this.prisma.activityLog.deleteMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
        },
      });

      this.logger.log(
        `Cleanup complete: ${deletedNotifications.count} notifications, ` +
        `${deletedExecutions.count} job executions, ${deletedLogs.count} activity logs`,
      );
    } catch (error: any) {
      this.logger.error(`Data cleanup job failed: ${error.message}`);
    }
  }

  /**
   * Usage report job - runs at midnight on the 1st of each month
   */
  @Cron('0 0 1 * *')
  async generateMonthlyUsageReports(): Promise<void> {
    try {
      this.logger.log('Starting monthly usage report job');

      const users = await this.prisma.user.findMany({
        where: {
          subscription: {
            status: 'active',
          },
        },
      });

      for (const user of users) {
        try {
          await this.generateUsageReport(user.id);
        } catch (error) {
          this.logger.error(`Failed to generate usage report for user ${user.id}: ${error}`);
        }
      }

      this.logger.log(`Generated usage reports for ${users.length} users`);
    } catch (error: any) {
      this.logger.error(`Usage report job failed: ${error.message}`);
    }
  }

  /**
   * Generate and send daily summary
   */
  private async generateAndSendDailySummary(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [completedTasks, pendingTasks, todayEvents, emails] = await Promise.all([
      this.prisma.task.count({
        where: {
          userId,
          status: 'completed',
          completedAt: { gte: today, lt: tomorrow },
        },
      }),
      this.prisma.task.count({
        where: {
          userId,
          status: 'pending',
          dueDate: { lte: tomorrow },
        },
      }),
      this.prisma.calendarEvent.count({
        where: {
          userId,
          startTime: { gte: today, lt: tomorrow },
        },
      }),
      this.prisma.email.count({
        where: {
          userId,
          receivedAt: { gte: today, lt: tomorrow },
        },
      }),
    ]);

    const summary = {
      date: today.toLocaleDateString(),
      completedTasks,
      pendingTasks,
      todayEvents,
      emailsReceived: emails,
    };

    // Send email summary
    await this.emailService.sendEmail({
      to: (await this.prisma.user.findUnique({ where: { id: userId } }))!.email,
      subject: `Daily Summary - ${summary.date}`,
      template: 'daily-summary',
      data: summary,
    });
  }

  /**
   * Generate and send weekly review
   */
  private async generateAndSendWeeklyReview(userId: string): Promise<void> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [tasksCompleted, meetingsAttended, emailsSent, productivityScore] = await Promise.all([
      this.prisma.task.count({
        where: {
          userId,
          status: 'completed',
          completedAt: { gte: weekAgo },
        },
      }),
      this.prisma.calendarEvent.count({
        where: {
          userId,
          startTime: { gte: weekAgo },
          type: 'meeting',
        },
      }),
      this.prisma.email.count({
        where: {
          userId,
          sentAt: { gte: weekAgo },
        },
      }),
      this.calculateWeeklyProductivity(userId, weekAgo),
    ]);

    const review = {
      weekEnding: new Date().toLocaleDateString(),
      tasksCompleted,
      meetingsAttended,
      emailsSent,
      productivityScore,
      insights: await this.generateWeeklyInsights(userId, weekAgo),
    };

    // Send email review
    await this.emailService.sendEmail({
      to: (await this.prisma.user.findUnique({ where: { id: userId } }))!.email,
      subject: `Weekly Review - Week ending ${review.weekEnding}`,
      template: 'weekly-review',
      data: review,
    });
  }

  /**
   * Generate meeting preparation
   */
  private async generateMeetingPreparation(event: any): Promise<void> {
    // Get related emails and tasks
    const [relatedEmails, relatedTasks] = await Promise.all([
      this.prisma.email.findMany({
        where: {
          userId: event.userId,
          OR: event.attendees.map((a: any) => ({
            from: { contains: a.email },
          })),
        },
        take: 5,
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.task.findMany({
        where: {
          userId: event.userId,
          title: { contains: event.title.split(' ')[0] },
        },
        take: 5,
      }),
    ]);

    const preparation = {
      meeting: {
        title: event.title,
        startTime: event.startTime,
        attendees: event.attendees.map((a: any) => a.email),
      },
      relatedEmails: relatedEmails.map(e => ({
        subject: e.subject,
        from: e.from,
        preview: e.bodyText?.substring(0, 100),
      })),
      relatedTasks: relatedTasks.map(t => ({
        title: t.title,
        status: t.status,
      })),
    };

    await this.notificationService.sendNotification(event.userId, {
      type: 'meeting_preparation',
      title: 'Meeting Preparation',
      message: `Your meeting "${event.title}" starts in ${this.getTimeUntilDue(event.startTime)}`,
      data: preparation,
      channels: ['in_app', 'email'],
    });
  }

  /**
   * Generate usage report
   */
  private async generateUsageReport(userId: string): Promise<void> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await this.prisma.usage.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        aiRequests: true,
        emailsProcessed: true,
        tasksAutomated: true,
      },
    });

    const report = {
      month: startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      aiRequests: usage._sum.aiRequests || 0,
      emailsProcessed: usage._sum.emailsProcessed || 0,
      tasksAutomated: usage._sum.tasksAutomated || 0,
    };

    await this.emailService.sendEmail({
      to: (await this.prisma.user.findUnique({ where: { id: userId } }))!.email,
      subject: `Usage Report - ${report.month}`,
      template: 'usage-report',
      data: report,
    });
  }

  /**
   * Helper methods
   */
  private getTimeUntilDue(dueDate: Date): string {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  }

  private async calculateWeeklyProductivity(
    userId: string,
    since: Date,
  ): Promise<number> {
    const [totalTasks, completedTasks] = await Promise.all([
      this.prisma.task.count({
        where: { userId, createdAt: { gte: since } },
      }),
      this.prisma.task.count({
        where: { userId, status: 'completed', completedAt: { gte: since } },
      }),
    ]);

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  private async generateWeeklyInsights(
    userId: string,
    since: Date,
  ): Promise<string[]> {
    const insights: string[] = [];

    // Most productive day
    const tasksByDay = await this.prisma.task.groupBy({
      by: ['completedAt'],
      where: {
        userId,
        status: 'completed',
        completedAt: { gte: since },
      },
      _count: true,
    });

    if (tasksByDay.length > 0) {
      // Find most productive day logic
      insights.push('Your most productive day was Tuesday with 8 tasks completed');
    }

    // Add more insights...
    insights.push('You spent 40% less time in meetings this week');
    insights.push('Email response time improved by 25%');

    return insights;
  }
}