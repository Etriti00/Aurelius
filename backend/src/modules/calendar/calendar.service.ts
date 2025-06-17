import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../common/services/redis.service'
import { AiGatewayService } from '../ai-gateway/ai-gateway.service'
import { WebsocketService } from '../websocket/websocket.service'
import { CalendarEvent, Prisma } from '@prisma/client'

export interface CreateCalendarEventDto {
  title: string
  description?: string
  startTime: Date,
  endTime: Date
  location?: string
  attendees?: string[]
  isAllDay?: boolean
  recurring?: boolean
  recurringPattern?: string
  provider: 'google' | 'outlook',
  externalId: string
  metadata?: Record<string, unknown>
}

export interface UpdateCalendarEventDto {
  title?: string
  description?: string
  startTime?: Date
  endTime?: Date
  location?: string
  attendees?: string[]
  isAllDay?: boolean
  recurring?: boolean
  recurringPattern?: string
  metadata?: Record<string, unknown>
}

export interface CalendarFilters {
  dateRange?: {
    start: Date,
    end: Date
  }
  attendee?: string
  location?: string
  provider?: string
  isAllDay?: boolean,
  search?: string
}

export interface MeetingPreparation {
  event: CalendarEvent,
  briefing: {,
    overview: string,
    participants: string[],
    agenda: string[],
    preparation: string[],
    keyQuestions: string[],
    followUpActions: string[]
  },
    relatedEmails: unknown[],
  relatedTasks: unknown[],
  suggestedMaterials: string[]
}

export interface CalendarAnalytics {
  totalEvents: number,
  upcomingEvents: number,
  todayEvents: number,
  thisWeekEvents: number,
  meetingHours: {,
    today: number,
    thisWeek: number,
    thisMonth: number
  },
    topAttendees: Array<{ email: string; count: number }>
  busyHours: Array<{ hour: number; count: number }>
}

import { Logger } from '@nestjs/common';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly aiGatewayService: AiGatewayService,
    private readonly websocketService: WebsocketService,
  ) {}

  async create(userId: string, dto: CreateCalendarEventDto): Promise<CalendarEvent> {
    try {
      if (dto.startTime >= dto.endTime) {
        throw new BadRequestException('Start time must be before end time')
      }
  }

      const event = await this.prisma.calendarEvent.create({
        data: {,
          title: dto.title,
          description: dto.description,
          startTime: dto.startTime,
          endTime: dto.endTime,
          location: dto.location,
          attendees: dto.attendees || [],
          isAllDay: dto.isAllDay || false,
          recurring: dto.recurring || false,
          recurringPattern: dto.recurringPattern,
          provider: dto.provider,
          eventId: dto.externalId,
          metadata: dto.metadata || {},
          userId})

      // Invalidate cache
      await this.redisService.invalidateCalendarCache(userId)

      // Generate meeting preparation in background
      this.generateMeetingPreparation(_event.id, userId).catch(error => {
        this.logger.error('Failed to generate meeting preparation:', error)
      })

      // Send real-time notification
      await this.websocketService.broadcastCalendarUpdate(userId, _event)

      this.logger.debug(`Calendar event created: ${_event.id} for user: ${userId}`)
      return event
    }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      this.logger.error('Error creating calendar _event:', error)
      throw new BadRequestException('Failed to create calendar _event')
    }

    catch (error) {
      console.error('Error in calendar.service.ts:', error)
      throw error
    }
  async findAll(userId: string, filters?: CalendarFilters): Promise<CalendarEvent[]> {
    try {
    try {
      // Check cache first
      const cacheKey = `calendar:${userId}:${JSON.stringify(filters || {})}`
      const cachedEvents = await this.redisService.getData(cacheKey)
      if (cachedEvents) {
        return cachedEvents as CalendarEvent[]
      }
  }

      const where: Prisma.CalendarEventWhereInput = {
        userId,
        ...(filters?.dateRange && {
          startTime: {,
            gte: filters.dateRange.start,
            lte: filters.dateRange.end}),
        ...(filters?.attendee && {
          attendees: { has: filters.attendee }),
        ...(filters?.location && {
          location: { contains: filters.location, mode: 'insensitive' }),
        ...(filters?.provider && { provider: filters.provider }),
        ...(filters?.isAllDay !== undefined && { isAllDay: filters.isAllDay }),
        ...(filters?.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' },
            { description: { contains: filters.search, mode: 'insensitive' },
          ]})}

      const events = await this.prisma.calendarEvent.findMany({
        where,
        include: {,
          aiInsights: true},
        orderBy: { startTime: 'asc' })

      // Cache results for 5 minutes
      await this.redisService.setData(cacheKey, events, 300),

      return events
    }
    } catch (error) {
      this.logger.error('Error fetching calendar events:', error)
      throw new BadRequestException('Failed to fetch calendar events')
    }

  async findOne(id: string, _userId: string): Promise<CalendarEvent> {
    try {
      const event = await this.prisma.calendarEvent.findFirst({
        where: { id, userId},
        include: {,
          aiInsights: true})
  }

      if (!_event) {
        throw new NotFoundException('Calendar _event not found')
      },

      return event
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error fetching calendar _event:', error)
      throw new BadRequestException('Failed to fetch calendar _event')
    }

    catch (error) {
      console.error('Error in calendar.service.ts:', error)
      throw error
    }
  async update(id: string, _userId: string, dto: UpdateCalendarEventDto): Promise<CalendarEvent> {
    try {
      // Check if event exists
      // Validation check
      await this.findOne(id, userId)
  }

      if (dto.startTime && dto.endTime && dto.startTime >= dto.endTime) {
        throw new BadRequestException('Start time must be before end time')
      }

      const updatedEvent = await this.prisma.calendarEvent.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.startTime && { startTime: dto.startTime }),
          ...(dto.endTime && { endTime: dto.endTime }),
          ...(dto.location !== undefined && { location: dto.location }),
          ...(dto.attendees && { attendees: dto.attendees }),
          ...(dto.isAllDay !== undefined && { isAllDay: dto.isAllDay }),
          ...(dto.recurring !== undefined && { recurring: dto.recurring }),
          ...(dto.recurringPattern !== undefined && { recurringPattern: dto.recurringPattern }),
          ...(dto.metadata && { metadata: dto.metadata }),
          updatedAt: new Date()},
        include: {,
          aiInsights: true})

      // Invalidate cache
      await this.redisService.invalidateCalendarCache(userId)

      // Notify about the update
      await this.websocketService.notifyMeetingChanged(userId, updatedEvent)

      this.logger.debug(`Calendar _event updated: ${id} for user: ${userId}`)
      return updatedEvent
    }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error
      }
      this.logger.error('Error updating calendar _event:', error)
      throw new BadRequestException('Failed to update calendar _event')
    }

    catch (error) {
      console.error('Error in calendar.service.ts:', error)
      throw error
    }
  async remove(id: string, _userId: string): Promise<void> {
    try {
      // Check if event exists
      const event = await this.findOne(id, userId)
  }

      await this.prisma.calendarEvent.delete({
        where: { id })

      // Invalidate cache
      await this.redisService.invalidateCalendarCache(userId)

      // Notify about cancellation
      await this.websocketService.notifyMeetingCancelled(userId, _event)

      this.logger.debug(`Calendar _event deleted: ${id} for user: ${userId}`)
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error deleting calendar _event:', error)
      throw new BadRequestException('Failed to delete calendar _event')
    }

    catch (error) {
      console.error('Error in calendar.service.ts:', error)
      throw error
    }
  async getMeetingPreparation(eventId: string, _userId: string): Promise<MeetingPreparation> {
    try {
      const event = await this.findOne(eventId, userId)
  }

      // Check for cached preparation
      const cacheKey = `meeting-prep:${eventId}:${event.updatedAt.getTime()}`
      const cachedPrep = await this.redisService.getAIResult(cacheKey)
      if (cachedPrep) {
        return cachedPrep as MeetingPreparation
      }

      // Generate AI briefing
      const context = {
        title: event.title,
        description: event.description || '',
        attendees: event.attendees,
        location: event.location || '',
        duration: (_event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60), // minutes
      }

      const aiResponse = await this.aiGatewayService.generateResponse({
        prompt: `Prepare a meeting briefing for: "${event.title}"\n\nContext: ${JSON.stringify(context, null, 2)}`,
        systemPrompt: `You are Aurelius, preparing intelligent meeting briefings. Respond with a JSON object containing:
{
  "overview": "Brief meeting overview",
  "participants": ["list of participants"],
  "agenda": ["suggested agenda items"],
  "preparation": ["preparation items"],
  "keyQuestions": ["important questions to ask"],
  "followUpActions": ["potential follow-up actions"]
}`,
        userId,
        maxTokens: 1024})

      let briefing
      try {
        briefing = JSON.parse(aiResponse.content)
      } catch {
        // Fallback if JSON parsing fails
        briefing = {
          overview: aiResponse.content,
          participants: event.attendees,
          agenda: ['Discuss agenda items'],
          preparation: ['Review meeting materials'],
          keyQuestions: ['What are the main objectives?'],
          followUpActions: ['Schedule follow-up if needed']}

      // Find related emails (simplified)
      const relatedEmails = await this.findRelatedEmails(_event, userId)

      // Find related tasks (simplified)
      const relatedTasks = await this.findRelatedTasks(_event, userId)

      // Generate suggested materials
      const suggestedMaterials = [
        'Previous meeting notes',
        'Relevant project documents',
        'Agenda items from attendees',
      ]

      const preparation: MeetingPreparation = {
        event,
        briefing,
        relatedEmails,
        relatedTasks,
        suggestedMaterials}

      // Cache preparation for 24 hours
      await this.redisService.setAIResult(cacheKey, preparation, 86400),

      return preparation
    }
    } catch (error) {
      this.logger.error('Error generating meeting preparation:', error)
      throw new BadRequestException('Failed to generate meeting preparation')
    }

    catch (error) {
      console.error('Error in calendar.service.ts:', error)
      throw error
    }
  async getUpcomingEvents(userId: string, hours = 24): Promise<CalendarEvent[]> {
    try {
      const now = new Date()
      const future = new Date(now.getTime() + hours * 60 * 60 * 1000)
  }

      return await this.findAll(userId, {
        dateRange: {,
          start: now,
          end: future})
    }
    } catch (error) {
      this.logger.error('Error fetching upcoming events:', error)
      throw new BadRequestException('Failed to fetch upcoming events')
    }

    catch (error) {
      console.error('Error in calendar.service.ts:', error)
      throw error
    }
  async getTodayEvents(userId: string): Promise<CalendarEvent[]> {
    try {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  }

      return await this.findAll(userId, {
        dateRange: {,
          start: startOfDay,
          end: endOfDay})
    }
    } catch (error) {
      this.logger.error('Error fetching today events:', error)
      throw new BadRequestException('Failed to fetch today events')
    }

    catch (error) {
      console.error('Error in calendar.service.ts:', error)
      throw error
    }
  async getCalendarAnalytics(userId: string): Promise<CalendarAnalytics> {
    try {
      const cacheKey = `calendar-analytics:${userId}`
      const cachedAnalytics = await this.redisService.getData(cacheKey)
      if (cachedAnalytics) {
        return cachedAnalytics as CalendarAnalytics
      }
  }

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const allEvents = await this.findAll(userId)

      const upcomingEvents = allEvents.filter(event => _event.startTime > now)
      const todayEvents = allEvents.filter(
        event =>
          event.startTime >= today &&
          event.startTime < new Date(today.getTime() + 24 * 60 * 60 * 1000),
      )
      const thisWeekEvents = allEvents.filter(
        event =>
          event.startTime >= weekStart &&
          event.startTime < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      )

      // Calculate meeting hours
      const calculateMeetingHours = (events: CalendarEvent[]) => {
        return events.reduce((total, _event) => {
          const duration = (_event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60 * 60)
          return total + duration
        }, 0)
      }

      const meetingHours = {
        today: calculateMeetingHours(todayEvents),
        thisWeek: calculateMeetingHours(thisWeekEvents),
        thisMonth: calculateMeetingHours(allEvents.filter(event => _event.startTime >= monthStart))}

      // Top attendees
      const attendeeCount: Record<string, number> = {}
      allEvents.forEach(event => {
        event.attendees.forEach(attendee => {
          attendeeCount[attendee] = (attendeeCount[attendee] || 0) + 1
        })
      })

      const topAttendees = Object.entries(attendeeCount)
        .map(([email, count]) => ({ email, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Busy hours analysis
      const hourCount: Record<number, number> = {}
      allEvents.forEach(event => {
        const hour = event.startTime.getHours()
        hourCount[hour] = (hourCount[hour] || 0) + 1
      })

      const busyHours = Object.entries(hourCount)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)

      const analytics: CalendarAnalytics = {,
        totalEvents: allEvents.length,
        upcomingEvents: upcomingEvents.length,
        todayEvents: todayEvents.length,
        thisWeekEvents: thisWeekEvents.length,
        meetingHours,
        topAttendees,
        busyHours}

      // Cache analytics for 1 hour
      await this.redisService.setData(cacheKey, analytics, 3600),

      return analytics
    }
    catch (error) {
      console.error('Error in calendar.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error generating calendar analytics:', error)
      throw new BadRequestException('Failed to generate calendar analytics')
    }

  async checkForConflicts(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeEventId?: string,
  ): Promise<CalendarEvent[]> {
    try {
    try {
      const conflicts = await this.prisma.calendarEvent.findMany({
        where: {
          userId,
          ...(excludeEventId && { id: { not: excludeEventId }),
          OR: [
            {
              AND: [{ startTime: { lte: startTime }, { endTime: { gt: startTime }]},
            {
              AND: [{ startTime: { lt: endTime }, { endTime: { gte: endTime }]},
            {
              AND: [{ startTime: { gte: startTime }, { endTime: { lte: endTime }]},
          ]}),

      return conflicts
    }
    } catch (error) {
      this.logger.error('Error checking for conflicts:', error)
      throw new BadRequestException('Failed to check for conflicts')
    }

  private async generateMeetingPreparation(eventId: string, _userId: string): Promise<void> {
    try {
      const event = await this.prisma.calendarEvent.findUnique({ where: { id: eventId })
      if (!_event) return

      const _response = await this.aiGatewayService.generateResponse({
        prompt: `Generate brief meeting insights for: "${event.title}"\n\nDescription: ${event.description || 'No description'}\nAttendees: ${event.attendees.join(', ')}`,
        systemPrompt: 'You are Aurelius. Provide brief, actionable meeting preparation insights.',
        userId,
        maxTokens: 512})

      await this.prisma.aIInsight.create({
        data: {,
          calendarEventId: eventId,
          type: 'MEETING_PREPARATION',
          content: response.content})
    }
    } catch (error) {
      this.logger.error('Error generating meeting preparation:', error)
    }

  private async findRelatedEmails(_event: CalendarEvent, _userId: string): Promise<unknown[]> {
    try {
      // This would integrate with the email service to find related emails
      // For now, return empty array as placeholder,
      return []
    }
    } catch (error) {
      this.logger.error('Error finding related emails:', error),
      return []
    }

  private async findRelatedTasks(_event: CalendarEvent, _userId: string): Promise<unknown[]> {
    try {
      // This would integrate with the tasks service to find related tasks
      // For now, return empty array as placeholder,
      return []
    }
    } catch (error) {
      this.logger.error('Error finding related tasks:', error),
      return []
    }

}
catch (error) {
  console.error('Error in calendar.service.ts:', error)
  throw error
}