import { Injectable, Logger } from '@nestjs/common';
import { CalendarEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getEvents(userId: string, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    const where: Prisma.CalendarEventWhereInput = { userId, status: 'CONFIRMED' };

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

  async getUpcoming(userId: string, limit: number = 10): Promise<CalendarEvent[]> {
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

  async getToday(userId: string): Promise<CalendarEvent[]> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return this.getEvents(userId, startOfDay, endOfDay);
  }

  async createEvent(
    userId: string,
    eventData: {
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      location?: string;
      attendees?: string[];
    }
  ): Promise<{ id: string; title: string; startTime: Date; endTime: Date }> {
    this.logger.log(`Creating calendar event for user ${userId}: ${eventData.title}`);

    const event = await this.prisma.calendarEvent.create({
      data: {
        userId,
        title: eventData.title,
        description: eventData.description,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        location: eventData.location,
        attendees: eventData.attendees || [],
        status: 'confirmed',
      },
    });

    return {
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
    };
  }

  async getAnalytics(
    userId: string
  ): Promise<{ thisWeek: number; upcoming: number; avgDuration: number; busyDays: number }> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [thisWeek, upcoming, events] = await Promise.all([
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
      this.prisma.calendarEvent.findMany({
        where: {
          userId,
          startTime: { gte: weekAgo, lte: now },
          status: 'CONFIRMED',
        },
        select: {
          startTime: true,
          endTime: true,
        },
      }),
    ]);

    const avgDuration =
      events.length > 0
        ? events.reduce(
            (sum, event) => sum + (event.endTime.getTime() - event.startTime.getTime()),
            0
          ) /
          events.length /
          (1000 * 60)
        : 0;

    const uniqueDays = new Set(events.map(event => event.startTime.toDateString())).size;

    return {
      thisWeek,
      upcoming,
      avgDuration: Math.round(avgDuration),
      busyDays: uniqueDays,
    };
  }
}
