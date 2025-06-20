import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getEvents(userId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const where: any = { userId, status: 'CONFIRMED' };
    
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }

    return this.prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });
  }

  async getUpcoming(userId: string, limit: number = 10): Promise<any[]> {
    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: new Date() },
        status: 'CONFIRMED',
      },
      orderBy: { startTime: 'asc' },
      take: limit,
    });
  }

  async getToday(userId: string): Promise<any[]> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return this.getEvents(userId, startOfDay, endOfDay);
  }

  async getAnalytics(userId: string): Promise<any> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const [thisWeek, upcoming] = await Promise.all([
      this.prisma.calendarEvent.count({
        where: {
          userId,
          startTime: { gte: weekAgo, lte: now },
          status: 'CONFIRMED',
        },
      }),
      this.prisma.calendarEvent.count({
        where: {
          userId,
          startTime: { gte: now },
          status: 'CONFIRMED',
        },
      }),
    ]);

    return { thisWeek, upcoming };
  }
}