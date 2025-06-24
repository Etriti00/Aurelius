import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('calendar')
@Controller('calendar')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Get calendar events' })
  @ApiResponse({ status: 200, description: 'Calendar events retrieved successfully' })
  async getEvents(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<any> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.calendarService.getEvents(user.id, start, end);
  }

  @Get('today')
  @ApiOperation({ summary: "Get today's calendar events" })
  @ApiResponse({ status: 200, description: "Today's events retrieved successfully" })
  async getToday(@CurrentUser() user: any): Promise<any> {
    return this.calendarService.getToday(user.id);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming calendar events' })
  @ApiResponse({ status: 200, description: 'Upcoming events retrieved successfully' })
  async getUpcoming(@CurrentUser() user: any, @Query('limit') limit?: string): Promise<any> {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.calendarService.getUpcoming(user.id, limitNum);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get calendar analytics' })
  @ApiResponse({ status: 200, description: 'Calendar analytics retrieved successfully' })
  async getAnalytics(@CurrentUser() user: any): Promise<any> {
    return this.calendarService.getAnalytics(user.id);
  }
}
