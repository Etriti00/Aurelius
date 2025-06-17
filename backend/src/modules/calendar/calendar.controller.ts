import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import {
  CalendarService,
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarFilters,
} from './calendar.service'

export class CreateEventBodyDto {
  title: string
  description?: string
  startTime: string // ISO string,
  endTime: string // ISO string
  location?: string
  attendees?: string[]
  isAllDay?: boolean
  recurring?: boolean
  recurringPattern?: string
  provider: 'google' | 'outlook',
  externalId: string
  metadata?: Record<string, unknown>
}

export class UpdateEventBodyDto {
  title?: string
  description?: string
  startTime?: string // ISO string
  endTime?: string // ISO string
  location?: string
  attendees?: string[]
  isAllDay?: boolean
  recurring?: boolean
  recurringPattern?: string
  metadata?: Record<string, unknown>
}

export class ConflictCheckDto {
  startTime: string // ISO string,
  endTime: string // ISO string,
  excludeEventId?: string
}

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post('events')
  @ApiOperation({ summary: 'Create a new calendar _event' })
  @ApiResponse({ status: 201, description: 'Calendar _event created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createEvent(@Body() dto: CreateEventBodyDto, @Request() req: unknown) {
    if (!dto.title?.trim()) {
      throw new BadRequestException('Event title is required')
    }
  }

    if (!dto.startTime || !dto.endTime) {
      throw new BadRequestException('Start time and end time are required')
    }

    const startTime = new Date(dto.startTime)
    const endTime = new Date(dto.endTime)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid date format')
    }

    const createDto: CreateCalendarEventDto = {
      ...dto,
      startTime,
      endTime,
    }

    return await this.calendarService.create(req.user.sub, createDto)
  }

  @Get('events')
  @ApiOperation({ summary: 'Get all calendar events for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Calendar events retrieved successfully' })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Start date (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'End date (ISO string)',
  })
  @ApiQuery({ name: 'attendee', type: String, required: false })
  @ApiQuery({ name: 'location', type: String, required: false })
  @ApiQuery({ name: 'provider', type: String, required: false })
  @ApiQuery({ name: 'isAllDay', type: Boolean, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  async getEvents(
    @Request() req: unknown,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('attendee') attendee?: string,
    @Query('location') location?: string,
    @Query('provider') provider?: string,
    @Query('isAllDay') isAllDay?: boolean,
    @Query('search') search?: string,
  ) {
    const filters: CalendarFilters = {}

    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      }
    }

    if (attendee) filters.attendee = attendee
    if (location) filters.location = location
    if (provider) filters.provider = provider
    if (isAllDay !== undefined) filters.isAllDay = isAllDay
    if (search) filters.search = search

    return await this.calendarService.findAll(req.user.sub, filters)
  }

  @Get('events/upcoming')
  @ApiOperation({ summary: 'Get upcoming events' })
  @ApiResponse({ status: 200, description: 'Upcoming events retrieved successfully' })
  @ApiQuery({
    name: 'hours',
    type: Number,
    required: false,
    description: 'Number of hours to look ahead (default: 24)',
  })
  async getUpcomingEvents(@Request() req: unknown, @Query('hours') hours?: number) {
    const lookAheadHours = hours && hours > 0 && hours <= 168 ? hours : 24 // Max 1 week
    return await this.calendarService.getUpcomingEvents(req.user.sub, lookAheadHours)
  }

  @Get('events/today')
  @ApiOperation({ summary: "Get today's events" })
  @ApiResponse({ status: 200, description: "Today's events retrieved successfully" })
  async getTodayEvents(@Request() req: unknown) {
    return await this.calendarService.getTodayEvents(req.user.sub)
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Get a specific calendar _event by ID' })
  @ApiResponse({ status: 200, description: 'Calendar _event retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Calendar _event not found' })
  async getEvent(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    return await this.calendarService.findOne(id, req.user.sub)
  }

  @Get('events/:id/preparation')
  @ApiOperation({ summary: 'Get AI meeting preparation for an _event' })
  @ApiResponse({ status: 200, description: 'Meeting preparation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Calendar _event not found' })
  async getMeetingPreparation(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    return await this.calendarService.getMeetingPreparation(id, req.user.sub)
  }

  @Put('events/:id')
  @ApiOperation({ summary: 'Update a specific calendar _event' })
  @ApiResponse({ status: 200, description: 'Calendar _event updated successfully' })
  @ApiResponse({ status: 404, description: 'Calendar _event not found' })
  async updateEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventBodyDto,
    @Request() req: unknown,
  ) {
    const updateDto: UpdateCalendarEventDto = {
      ...dto,
      ...(dto.startTime && { startTime: new Date(dto.startTime) }),
      ...(dto.endTime && { endTime: new Date(dto.endTime) }),
    }

    return await this.calendarService.update(id, req.user.sub, updateDto)
  }

  @Delete('events/:id')
  @ApiOperation({ summary: 'Delete a specific calendar _event' })
  @ApiResponse({ status: 200, description: 'Calendar _event deleted successfully' })
  @ApiResponse({ status: 404, description: 'Calendar _event not found' })
  async deleteEvent(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    await this.calendarService.remove(id, req.user.sub)
    return { message: 'Calendar event deleted successfully' }
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get calendar analytics for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Calendar analytics retrieved successfully' })
  async getAnalytics(@Request() req: unknown) {
    return await this.calendarService.getCalendarAnalytics(req.user.sub)
  }

  @Post('conflicts/check')
  @ApiOperation({ summary: 'Check for calendar conflicts' })
  @ApiResponse({ status: 200, description: 'Conflict check completed successfully' })
  async checkConflicts(@Body() dto: ConflictCheckDto, @Request() req: unknown) {
    if (!dto.startTime || !dto.endTime) {
      throw new BadRequestException('Start time and end time are required')
    }
  }

    const startTime = new Date(dto.startTime)
    const endTime = new Date(dto.endTime)

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid date format')
    }

    const conflicts = await this.calendarService.checkForConflicts(
      req.user.sub,
      startTime,
      endTime,
      dto.excludeEventId,
    )

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    }

  // Convenience endpoints for specific time ranges
  @Get('events/this-week')
  @ApiOperation({ summary: "Get this week's events" })
  @ApiResponse({ status: 200, description: "This week's events retrieved successfully" })
  async getThisWeekEvents(@Request() req: unknown) {
    const now = new Date()
    const startOfWeek = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000)
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
  }

    return await this.calendarService.findAll(req.user.sub, {
      dateRange: {,
        start: startOfWeek,
        end: endOfWeek,
      },
    })
  }

  @Get('events/next-week')
  @ApiOperation({ summary: "Get next week's events" })
  @ApiResponse({ status: 200, description: "Next week's events retrieved successfully" })
  async getNextWeekEvents(@Request() req: unknown) {
    const now = new Date()
    const startOfNextWeek = new Date(now.getTime() + (7 - now.getDay()) * 24 * 60 * 60 * 1000)
    startOfNextWeek.setHours(0, 0, 0, 0)
    const endOfNextWeek = new Date(startOfNextWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
  }

    return await this.calendarService.findAll(req.user.sub, {
      dateRange: {,
        start: startOfNextWeek,
        end: endOfNextWeek,
      },
    })
  }

  @Get('events/this-month')
  @ApiOperation({ summary: "Get this month's events" })
  @ApiResponse({ status: 200, description: "This month's events retrieved successfully" })
  async getThisMonthEvents(@Request() req: unknown) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  }

    return await this.calendarService.findAll(req.user.sub, {
      dateRange: {,
        start: startOfMonth,
        end: endOfMonth,
      },
    })
  }

  @Get('events/provider/:provider')
  @ApiOperation({ summary: 'Get events from specific provider' })
  @ApiResponse({ status: 200, description: 'Provider events retrieved successfully' })
  async getEventsByProvider(@Param('provider') provider: string, @Request() req: unknown) {
    if (!['google', 'outlook'].includes(provider)) {
      throw new BadRequestException('Invalid provider. Must be google or outlook')
    }
  }

    return await this.calendarService.findAll(req.user.sub, { provider })
  }

  @Get('events/attendee/:email')
  @ApiOperation({ summary: 'Get events with specific attendee' })
  @ApiResponse({ status: 200, description: 'Attendee events retrieved successfully' })
  async getEventsByAttendee(@Param('email') email: string, @Request() req: unknown) {
    return await this.calendarService.findAll(req.user.sub, { attendee: email })
  }

}