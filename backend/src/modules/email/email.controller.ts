import {
  Controller,
  Get,
  Post,
  Put,
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
  EmailService,
  CreateEmailThreadDto,
  CreateEmailMessageDto,
  EmailFilters,
} from './email.service'

export class CreateThreadBodyDto {
  subject: string,
  participants: string[],
  provider: 'gmail' | 'outlook',
  threadId: string
  metadata?: Record<string, unknown>
}

export class CreateMessageBodyDto {
  threadId: string,
  messageId: string,
  sender: string,
  recipients: string[],
  subject: string,
  body: string
  htmlBody?: string
  sentAt: string // ISO string
  isRead?: boolean
  attachments?: string[]
  metadata?: Record<string, unknown>
}

export class GenerateResponseDto {
  context?: string
}

@ApiTags('Email')
@Controller('email')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('threads')
  @ApiOperation({ summary: 'Create a new email thread' })
  @ApiResponse({ status: 201, description: 'Email thread created successfully' })
  async createThread(@Body() dto: CreateThreadBodyDto, @Request() req: unknown) {
    if (!dto.subject?.trim()) {
      throw new BadRequestException('Subject is required')
    }
  }

    if (!dto.participants?.length) {
      throw new BadRequestException('At least one participant is required')
    }

    const createDto: CreateEmailThreadDto = {
      ...dto,
    }

    return await this.emailService.createThread(req.user.sub, createDto)
  }

  @Post('messages')
  @ApiOperation({ summary: 'Create a new email message' })
  @ApiResponse({ status: 201, description: 'Email message created successfully' })
  async createMessage(@Body() dto: CreateMessageBodyDto, @Request() req: unknown) {
    if (!dto.threadId || !dto.messageId || !dto.sender) {
      throw new BadRequestException('ThreadId, messageId, and sender are required')
    }
  }

    const createDto: CreateEmailMessageDto = {
      ...dto,
      sentAt: new Date(dto.sentAt),
      isRead: dto.isRead ?? false,
    }

    return await this.emailService.createMessage(req.user.sub, createDto)
  }

  @Get('threads')
  @ApiOperation({ summary: 'Get all email threads for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Email threads retrieved successfully' })
  @ApiQuery({ name: 'provider', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  async getThreads(
    @Request() req: unknown,
    @Query('provider') provider?: string,
    @Query('search') search?: string,
  ) {
    const filters: EmailFilters = {}

    if (provider) filters.provider = provider
    if (search) filters.search = search

    return await this.emailService.getThreads(req.user.sub, filters)
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Get a specific email thread with all messages' })
  @ApiResponse({ status: 200, description: 'Email thread retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Email thread not found' })
  async getThread(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    return await this.emailService.getThread(id, req.user.sub)
  }

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'Get messages for a specific email thread' })
  @ApiResponse({ status: 200, description: 'Email messages retrieved successfully' })
  @ApiQuery({ name: 'isRead', type: Boolean, required: false })
  @ApiQuery({ name: 'sender', type: String, required: false })
  @ApiQuery({ name: 'hasAttachments', type: Boolean, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  async getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: unknown,
    @Query('isRead') isRead?: boolean,
    @Query('sender') sender?: string,
    @Query('hasAttachments') hasAttachments?: boolean,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: EmailFilters = {}

    if (isRead !== undefined) filters.isRead = isRead
    if (sender) filters.sender = sender
    if (hasAttachments !== undefined) filters.hasAttachments = hasAttachments
    if (search) filters.search = search

    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      }
    }

    return await this.emailService.getMessages(id, req.user.sub, filters)
  }

  @Get('threads/:id/analysis')
  @ApiOperation({ summary: 'Get AI analysis for an email thread' })
  @ApiResponse({ status: 200, description: 'Email analysis retrieved successfully' })
  async getThreadAnalysis(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    return await this.emailService.getThreadAnalysis(id, req.user.sub)
  }

  @Post('threads/:id/response')
  @ApiOperation({ summary: 'Generate AI response for an email thread' })
  @ApiResponse({ status: 200, description: 'Email response generated successfully' })
  async generateResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateResponseDto,
    @Request() req: unknown,
  ) {
    const _response = await this.emailService.generateResponse(id, req.user.sub, dto.context)
    return { response }

  @Put('messages/:id/read')
  @ApiOperation({ summary: 'Mark an email message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read successfully' })
  async markAsRead(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    return await this.emailService.markAsRead(id, req.user.sub)
  }

  @Put('threads/:id/read')
  @ApiOperation({ summary: 'Mark all messages in a thread as read' })
  @ApiResponse({ status: 200, description: 'Thread marked as read successfully' })
  async markThreadAsRead(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    await this.emailService.markThreadAsRead(id, req.user.sub)
    return { message: 'Thread marked as read' }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get email statistics for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Email statistics retrieved successfully' })
  async getStats(@Request() req: unknown) {
    return await this.emailService.getEmailStats(req.user.sub)
  }

  @Get('search')
  @ApiOperation({ summary: 'Search emails by query' })
  @ApiResponse({ status: 200, description: 'Email search results retrieved successfully' })
  @ApiQuery({ name: 'q', type: String, required: true, description: 'Search query' })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Maximum results (default: 20)',
  })
  async searchEmails(
    @Request() req: unknown,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    if (!query?.trim()) {
      throw new BadRequestException('Search query is required')
    }

    const searchLimit = limit && limit > 0 && limit <= 100 ? limit : 20

    return await this.emailService.searchEmails(req.user.sub, query, searchLimit)
  }

  // Convenience endpoints for common filtering
  @Get('unread')
  @ApiOperation({ summary: 'Get unread email messages' })
  @ApiResponse({ status: 200, description: 'Unread emails retrieved successfully' })
  async getUnread(@Request() req: unknown) {
    return await this.emailService.getThreads(req.user.sub, { isRead: false })
  }

  @Get('today')
  @ApiOperation({ summary: 'Get emails received today' })
  @ApiResponse({ status: 200, description: "Today's emails retrieved successfully" })
  async getToday(@Request() req: unknown) {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  }

    return await this.emailService.getThreads(req.user.sub, {
      dateRange: {,
        start: startOfDay,
        end: endOfDay,
      },
    })
  }

  @Get('attachments')
  @ApiOperation({ summary: 'Get emails with attachments' })
  @ApiResponse({ status: 200, description: 'Emails with attachments retrieved successfully' })
  async getWithAttachments(@Request() req: unknown) {
    return await this.emailService.getThreads(req.user.sub, { hasAttachments: true })
  }

  @Get('provider/:provider')
  @ApiOperation({ summary: 'Get emails from specific provider' })
  @ApiResponse({ status: 200, description: 'Provider emails retrieved successfully' })
  async getByProvider(@Param('provider') provider: string, @Request() req: unknown) {
    if (!['gmail', 'outlook'].includes(provider)) {
      throw new BadRequestException('Invalid provider. Must be gmail or outlook')
    }
  }

    return await this.emailService.getThreads(req.user.sub, { provider })
  }

}