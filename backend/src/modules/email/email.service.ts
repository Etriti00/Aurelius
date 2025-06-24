import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getThreads(userId: string, filters?: any): Promise<any[]> {
    return this.prisma.emailThread.findMany({
      where: {
        userId,
        ...filters,
      },
      include: {
        emails: {
          orderBy: { sentAt: 'asc' },
          take: 1, // Latest message for preview
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getThread(userId: string, threadId: string): Promise<any> {
    return this.prisma.emailThread.findFirst({
      where: { id: threadId, userId },
      include: {
        emails: {
          orderBy: { sentAt: 'asc' },
        },
      },
    });
  }

  async markAsRead(userId: string, threadId: string): Promise<any> {
    return this.prisma.emailThread.updateMany({
      where: { id: threadId, userId },
      data: { isRead: true },
    });
  }

  async sendEmail(emailData: {
    from: string;
    to: string;
    subject: string;
    content: string;
    html?: string;
  }): Promise<{ id: string; messageId: string; status: string }> {
    this.logger.log(`Sending email from ${emailData.from} to ${emailData.to}`);

    // In a real implementation, this would integrate with an email service
    // like SendGrid, AWS SES, or similar
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: `email_${Date.now()}`,
      messageId,
      status: 'sent',
    };
  }

  async getStats(userId: string): Promise<any> {
    const [total, unread, important] = await Promise.all([
      this.prisma.emailThread.count({ where: { userId } }),
      this.prisma.emailThread.count({ where: { userId, isRead: false } }),
      this.prisma.emailThread.count({ where: { userId, isImportant: true } }),
    ]);

    return { total, unread, important };
  }
}
