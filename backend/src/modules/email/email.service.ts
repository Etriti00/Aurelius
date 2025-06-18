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
        messages: {
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
        messages: {
          orderBy: { sentAt: 'asc' },
        },
      },
    });
  }

  async markAsRead(userId: string, threadId: string): Promise<any> {
    return this.prisma.emailThread.update({
      where: { id: threadId },
      data: { isRead: true },
    });
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