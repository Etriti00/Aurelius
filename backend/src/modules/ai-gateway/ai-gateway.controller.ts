import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AIGatewayService } from './ai-gateway.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProcessRequestDto } from './dto/process-request.dto';
import { GenerateSuggestionsDto } from './dto/generate-suggestions.dto';
import { AnalyzeEmailDto } from './dto/analyze-email.dto';
import { DraftEmailDto } from './dto/draft-email.dto';

@ApiTags('ai-gateway')
@Controller('ai-gateway')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class AIGatewayController {
  constructor(private readonly aiGatewayService: AIGatewayService) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process AI request with smart model selection' })
  @ApiResponse({ status: 200, description: 'Request processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
  async processRequest(
    @CurrentUser() user: any,
    @Body() processRequestDto: ProcessRequestDto
  ): Promise<any> {
    return this.aiGatewayService.processRequest({
      prompt: processRequestDto.prompt,
      context: processRequestDto.context,
      systemPrompt: processRequestDto.systemPrompt,
      userId: user.id,
      action: processRequestDto.action,
      userSubscription: user.subscription,
      metadata: processRequestDto.metadata,
    });
  }

  @Post('suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate proactive suggestions based on user context' })
  @ApiResponse({ status: 200, description: 'Suggestions generated successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async generateSuggestions(
    @CurrentUser() user: any,
    @Body() generateSuggestionsDto: GenerateSuggestionsDto
  ): Promise<{ suggestions: string[] }> {
    const suggestions = await this.aiGatewayService.generateSuggestions({
      userId: user.id,
      context: generateSuggestionsDto.context,
      userSubscription: user.subscription,
    });

    return { suggestions };
  }

  @Post('analyze-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze email thread for insights and action items' })
  @ApiResponse({ status: 200, description: 'Email analyzed successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  async analyzeEmail(
    @CurrentUser() user: any,
    @Body() analyzeEmailDto: AnalyzeEmailDto
  ): Promise<any> {
    return this.aiGatewayService.analyzeEmailThread({
      userId: user.id,
      emailContent: analyzeEmailDto.emailContent,
      userSubscription: user.subscription,
    });
  }

  @Post('draft-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Draft email based on context and purpose' })
  @ApiResponse({ status: 200, description: 'Email drafted successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async draftEmail(
    @CurrentUser() user: any,
    @Body() draftEmailDto: DraftEmailDto
  ): Promise<{ subject: string; body: string }> {
    return this.aiGatewayService.draftEmail({
      userId: user.id,
      context: draftEmailDto.context,
      recipient: draftEmailDto.recipient,
      purpose: draftEmailDto.purpose,
      tone: draftEmailDto.tone,
      userSubscription: user.subscription,
    });
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get AI usage statistics for current user' })
  @ApiResponse({ status: 200, description: 'Usage statistics retrieved successfully' })
  async getUsageStats(@CurrentUser() user: any): Promise<any> {
    return this.aiGatewayService.getUsageStats(user.id);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check AI gateway service health' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async healthCheck(): Promise<any> {
    return this.aiGatewayService.healthCheck();
  }
}