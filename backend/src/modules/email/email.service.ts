import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmailFilters,
  EmailResponse,
  EmailStats,
  SendEmailRequest,
  SendEmailResponse,
} from './interfaces/email.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getThreads(userId: string, filters?: EmailFilters): Promise<EmailResponse[]> {
    const whereClause: Prisma.EmailThreadWhereInput = { userId };

    if (filters) {
      if (filters.isRead !== undefined) whereClause.isRead = filters.isRead;
      if (filters.isImportant !== undefined) whereClause.isImportant = filters.isImportant;
      if (filters.isArchived !== undefined) whereClause.isArchived = filters.isArchived;
      if (filters.provider) whereClause.provider = filters.provider;
      if (filters.labels && filters.labels.length > 0) {
        whereClause.labels = { hasSome: filters.labels };
      }
      if (filters.fromDate || filters.toDate) {
        whereClause.lastMessageAt = {};
        if (filters.fromDate) whereClause.lastMessageAt.gte = filters.fromDate;
        if (filters.toDate) whereClause.lastMessageAt.lte = filters.toDate;
      }
      if (filters.search) {
        whereClause.OR = [
          { subject: { contains: filters.search, mode: 'insensitive' } },
          { participants: { hasSome: [filters.search] } },
        ];
      }
    }

    const threads = await this.prisma.emailThread.findMany({
      where: whereClause,
      include: {
        emails: {
          orderBy: { sentAt: 'asc' },
          take: 1, // Latest message for preview
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return threads.map(thread => ({
      id: thread.id,
      subject: thread.subject,
      threadId: thread.threadId,
      provider: thread.provider,
      lastMessageAt: thread.lastMessageAt,
      isRead: thread.isRead,
      isImportant: thread.isImportant,
      isArchived: thread.isArchived,
      labels: thread.labels,
      participants: thread.participants,
      messageCount: thread.messageCount,
      metadata: thread.metadata as Record<string, unknown>,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      emails: thread.emails.map(email => ({
        id: email.id,
        messageId: email.messageId,
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        body: email.body,
        bodyHtml: email.bodyHtml,
        status: email.status,
        isRead: email.isRead,
        isStarred: email.isStarred,
        isImportant: email.isImportant,
        aiDrafted: email.aiDrafted,
        aiSummary: email.aiSummary,
        aiCategory: email.aiCategory,
        aiPriority: email.aiPriority,
        sentiment: email.sentiment,
        sentAt: email.sentAt,
        receivedAt: email.receivedAt,
        attachments: email.attachments as unknown[],
        createdAt: email.createdAt,
        updatedAt: email.updatedAt,
        deletedAt: email.deletedAt,
      })),
    }));
  }

  async getThread(userId: string, threadId: string): Promise<EmailResponse | null> {
    const thread = await this.prisma.emailThread.findFirst({
      where: { id: threadId, userId },
      include: {
        emails: {
          orderBy: { sentAt: 'asc' },
        },
      },
    });

    if (!thread) {
      return null;
    }

    return {
      id: thread.id,
      subject: thread.subject,
      threadId: thread.threadId,
      provider: thread.provider,
      lastMessageAt: thread.lastMessageAt,
      isRead: thread.isRead,
      isImportant: thread.isImportant,
      isArchived: thread.isArchived,
      labels: thread.labels,
      participants: thread.participants,
      messageCount: thread.messageCount,
      metadata: thread.metadata as Record<string, unknown>,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      emails: thread.emails.map(email => ({
        id: email.id,
        messageId: email.messageId,
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        body: email.body,
        bodyHtml: email.bodyHtml,
        status: email.status,
        isRead: email.isRead,
        isStarred: email.isStarred,
        isImportant: email.isImportant,
        aiDrafted: email.aiDrafted,
        aiSummary: email.aiSummary,
        aiCategory: email.aiCategory,
        aiPriority: email.aiPriority,
        sentiment: email.sentiment,
        sentAt: email.sentAt,
        receivedAt: email.receivedAt,
        attachments: email.attachments as unknown[],
        createdAt: email.createdAt,
        updatedAt: email.updatedAt,
        deletedAt: email.deletedAt,
      })),
    };
  }

  async markAsRead(
    userId: string,
    threadId: string
  ): Promise<{ success: boolean; updated: number }> {
    const result = await this.prisma.emailThread.updateMany({
      where: { id: threadId, userId },
      data: { isRead: true },
    });

    return {
      success: result.count > 0,
      updated: result.count,
    };
  }

  async sendEmail(emailData: SendEmailRequest): Promise<SendEmailResponse> {
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
    this.logger.log(`Sending email from ${emailData.from} to ${recipients.join(', ')}`);

    // In a real implementation, this would integrate with an email service
    // like SendGrid, AWS SES, or similar
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: `email_${Date.now()}`,
      messageId,
      status: 'sent',
    };
  }

  async getStats(userId: string): Promise<EmailStats> {
    const [total, unread, important] = await Promise.all([
      this.prisma.emailThread.count({ where: { userId } }),
      this.prisma.emailThread.count({ where: { userId, isRead: false } }),
      this.prisma.emailThread.count({ where: { userId, isImportant: true } }),
    ]);

    return { total, unread, important };
  }
}
