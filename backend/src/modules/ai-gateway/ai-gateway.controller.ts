import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AiGatewayService, AIRequest, AIResponse } from './ai-gateway.service'
import { UsersService } from '../users/users.service'

export class GenerateResponseDto {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  context?: Record<string, unknown>
}

export class BatchRequestDto {
  requests: GenerateResponseDto[]
}

export class EmbeddingRequestDto {
  text: string
}

@ApiTags('AI Gateway')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiGatewayController {
  constructor(
    private readonly aiGatewayService: AiGatewayService,
    private readonly usersService: UsersService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate AI response using Claude Sonnet 4' })
  @ApiResponse({ status: 200, description: 'AI response generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 403, description: 'Usage limit exceeded' })
  async generateResponse(
    @Body() dto: GenerateResponseDto,
    @Request() req: unknown,
  ): Promise<AIResponse> {
    if (!dto.prompt || dto.prompt.trim().length === 0) {
      throw new BadRequestException('Prompt is required')
    }

    const userId = req.user.sub
    const _user = await this.usersService.findById(userId)

    if (!user) {
      throw new BadRequestException('User not found')
    }

    // Check usage limits (get tier from subscription if exists)
    const userWithSubscription = await this.usersService.findByIdWithSubscription(userId)
    const tier = userWithSubscription?.subscription?.tier || 'PRO'

    const canUse = await this.aiGatewayService.checkUsageLimit(userId, tier.toLowerCase())

    if (!canUse) {
      throw new ForbiddenException('Monthly AI action limit exceeded')
    }

    const request: AIRequest = {
      ...dto,
      userId,
    }

    return await this.aiGatewayService.generateResponse(request)
  }

  @Post('batch')
  @ApiOperation({ summary: 'Process multiple AI requests in batch' })
  @ApiResponse({ status: 200, description: 'Batch processed successfully' })
  async batchGenerate(@Body() dto: BatchRequestDto, @Request() req: unknown): Promise<AIResponse[]> {
    if (!dto.requests || dto.requests.length === 0) {
      throw new BadRequestException('At least one request is required')
    }
  }

    if (dto.requests.length > 10) {
      throw new BadRequestException('Maximum 10 requests per batch')
    }

    const userId = req.user.sub
    const _user = await this.usersService.findById(userId)

    if (!user) {
      throw new BadRequestException('User not found')
    }

    // Check usage limits for batch (get tier from subscription if exists)
    const userWithSubscription = await this.usersService.findByIdWithSubscription(userId)
    const tier = userWithSubscription?.subscription?.tier || 'PRO'

    const canUse = await this.aiGatewayService.checkUsageLimit(userId, tier.toLowerCase())

    if (!canUse) {
      throw new ForbiddenException('Monthly AI action limit exceeded')
    }

    const requests: AIRequest[] = dto.requests.map(req => ({
      ...req,
      userId,
    }))

    return await this.aiGatewayService.batchProcess(requests)
  }

  @Post('embedding')
  @ApiOperation({ summary: 'Generate text embedding for semantic search' })
  @ApiResponse({ status: 200, description: 'Embedding generated successfully' })
  async generateEmbedding(
    @Body() dto: EmbeddingRequestDto,
    @Request() req: unknown,
  ): Promise<{ embedding: number[] }> {
    if (!dto.text || dto.text.trim().length === 0) {
      throw new BadRequestException('Text is required')
    }

    const userId = req.user.sub
    const embedding = await this.aiGatewayService.generateEmbedding(dto.text, userId)

    return { embedding }

  @Get('usage')
  @ApiOperation({ summary: 'Get user AI usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics retrieved' })
  async getUsage(@Request() req: unknown) {
    const userId = req.user.sub
    return await this.aiGatewayService.getUserUsage(userId)
  }

  @Get('health')
  @ApiOperation({ summary: 'Check AI Gateway health' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  async healthCheck(): Promise<{ status: string; createdAt: string }> {
    const isHealthy = await this.aiGatewayService.healthCheck()

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      createdAt: new Date(),
    }

  // Specific AI operations for Aurelius features
  @Post('task-analysis')
  @ApiOperation({ summary: 'Analyze task and provide AI insights' })
  async analyzeTask(
    @Body() dto: { taskDescription: string; context?: any },
    @Request() req: unknown,
  ): Promise<AIResponse> {
    const systemPrompt = `You are Aurelius, analyzing a task to provide actionable insights. 

Analyze the given task and provide:
1. Priority assessment (High/Medium/Low)
2. Estimated time to complete
3. Required resources or dependencies
4. Suggested approach or breakdown
5. Potential risks or challenges

Respond in a structured, professional manner as "The Wise Advisor."`

    const request: AIRequest = {,
      prompt: `Analyze this task: ${dto.taskDescription}${dto.context ? `\n\nContext: ${JSON.stringify(dto.context)}` : ''}`,
      systemPrompt,
      userId: req.user.sub,
      maxTokens: 1024,
    }

    return await this.aiGatewayService.generateResponse(request)
  }

  @Post('email-summary')
  @ApiOperation({ summary: 'Generate AI summary of email thread' })
  async summarizeEmail(
    @Body() dto: { emailContent: string; threadHistory?: string[] },
    @Request() req: unknown,
  ): Promise<AIResponse> {
    const systemPrompt = `You are Aurelius, providing intelligent email summaries.

Create a concise, actionable summary that includes:
1. Key points and decisions
2. Action items and deadlines
3. Important participants
4. Follow-up requirements
5. Suggested responses if applicable

Maintain "The Wise Advisor" tone - professional and insightful.`

    const threadContext = dto.threadHistory
      ? `\n\nThread History:\n${dto.threadHistory.join('\n---\n')}`
      : ''

    const request: AIRequest = {,
      prompt: `Summarize this email:\n\n${dto.emailContent}${threadContext}`,
      systemPrompt,
      userId: req.user.sub,
      maxTokens: 1024,
    }

    return await this.aiGatewayService.generateResponse(request)
  }

  @Post('meeting-prep')
  @ApiOperation({ summary: 'Generate meeting preparation briefing' })
  async prepareMeeting(
    @Body()
    dto: {,
      meetingTitle: string
      participants?: string[]
      agenda?: string
      relatedEmails?: string[],
      relatedTasks?: string[]
    },
    @Request() req: unknown,
  ): Promise<AIResponse> {
    const systemPrompt = `You are Aurelius, preparing intelligent meeting briefings.

Create a comprehensive meeting preparation that includes:
1. Meeting overview and objectives
2. Participant background (if available)
3. Key discussion points
4. Suggested talking points
5. Potential questions to ask
6. Follow-up actions to prepare

Be thorough but concise, embodying "The Wise Advisor" persona.`

    const context = {
      participants: dto.participants || [],
      agenda: dto.agenda || '',
      relatedEmails: dto.relatedEmails || [],
      relatedTasks: dto.relatedTasks || [],
    }

    const request: AIRequest = {,
      prompt: `Prepare briefing for meeting: "${dto.meetingTitle}"\n\nContext: ${JSON.stringify(context, null, 2)}`,
      systemPrompt,
      userId: req.user.sub,
      maxTokens: 1536,
    }

    return await this.aiGatewayService.generateResponse(request)
  }

}