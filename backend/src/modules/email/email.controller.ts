import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('email')
@Controller('email')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('threads')
  @ApiOperation({ summary: 'Get email threads' })
  @ApiResponse({ status: 200, description: 'Email threads retrieved successfully' })
  async getThreads(@CurrentUser() user: any, @Query() filters: any): Promise<any> {
    return this.emailService.getThreads(user.id, filters);
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Get email thread details' })
  @ApiResponse({ status: 200, description: 'Email thread retrieved successfully' })
  async getThread(@CurrentUser() user: any, @Param('id') id: string): Promise<any> {
    return this.emailService.getThread(user.id, id);
  }

  @Patch('threads/:id/read')
  @ApiOperation({ summary: 'Mark email thread as read' })
  @ApiResponse({ status: 200, description: 'Email thread marked as read' })
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string): Promise<any> {
    return this.emailService.markAsRead(user.id, id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get email statistics' })
  @ApiResponse({ status: 200, description: 'Email statistics retrieved successfully' })
  async getStats(@CurrentUser() user: any): Promise<any> {
    return this.emailService.getStats(user.id);
  }
}
