import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AIGatewayService } from './ai-gateway.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProcessRequestDto } from './dto/process-request.dto';
import { GenerateSuggestionsDto } from './dto/generate-suggestions.dto';
import { AnalyzeEmailDto } from './dto/analyze-email.dto';
import { DraftEmailDto } from './dto/draft-email.dto';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ErrorResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('ai-gateway')
@Controller('ai-gateway')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class AIGatewayController {
  constructor(private readonly aiGatewayService: AIGatewayService) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process AI request with smart model selection',
    description:
      'Process any AI request with intelligent model selection based on complexity, cost optimization, and user subscription tier. The system automatically chooses the most appropriate AI model and caches responses for efficiency.',
  })
  @ApiBody({
    type: ProcessRequestDto,
    description: 'AI processing request data',
    examples: {
      taskCreation: {
        summary: 'Create task from natural language',
        value: {
          prompt: 'Create a task to prepare the quarterly report by Friday',
          action: 'create_task',
          context: {
            userWorkspace: 'corporate',
            currentTasks: 3,
            availableTime: '2 hours',
          },
          metadata: {
            source: 'voice_command',
            priority: 'high',
          },
        },
      },
      emailAnalysis: {
        summary: 'Analyze email for action items',
        value: {
          prompt: 'Analyze this email thread and extract action items',
          action: 'analyze_email',
          systemPrompt: 'You are an expert email analyst focused on identifying actionable items',
          context: {
            emailContent: 'Meeting recap with client requirements...',
            participants: ['john@company.com', 'client@external.com'],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'AI request processed successfully',
    schema: {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          example:
            'I\'ve created the task "Prepare quarterly report" with high priority, due Friday at 5 PM.',
        },
        model: { type: 'string', example: 'claude-3-sonnet-20240229' },
        usage: {
          type: 'object',
          properties: {
            promptTokens: { type: 'number', example: 145 },
            completionTokens: { type: 'number', example: 67 },
            totalTokens: { type: 'number', example: 212 },
            cost: { type: 'number', example: 0.0032 },
          },
        },
        processingTime: { type: 'number', example: 850 },
        success: { type: 'boolean', example: true },
        actionTaken: { type: 'string', example: 'task_created' },
        actionId: { type: 'string', example: 'task-123e4567-e89b-12d3-a456-426614174000' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data - malformed prompt or unsupported action',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded - Too many AI requests',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'AI service temporarily unavailable',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Generate proactive suggestions based on user context',
    description:
      'Leverage AI to generate intelligent, contextual suggestions for productivity improvements, task optimization, and workflow automation based on current user activity, upcoming events, and historical patterns.',
  })
  @ApiBody({
    type: GenerateSuggestionsDto,
    description: 'Context for generating suggestions',
    examples: {
      morningRoutine: {
        summary: 'Morning productivity suggestions',
        value: {
          context: {
            timeOfDay: 'morning',
            upcomingEvents: 2,
            pendingTasks: 8,
            recentCompletions: ['email_review', 'calendar_check'],
            userPreferences: { workStyle: 'focused_blocks', preferredStartTime: '09:00' },
          },
          suggestionTypes: ['task_prioritization', 'schedule_optimization', 'focus_time'],
          maxSuggestions: 5,
        },
      },
      contextualWorkflow: {
        summary: 'Workflow optimization suggestions',
        value: {
          context: {
            currentProject: 'Q4 Planning',
            teamMembers: ['alice@company.com', 'bob@company.com'],
            upcomingDeadlines: ['2024-12-31'],
            recentIntegrations: ['slack', 'jira'],
          },
          suggestionTypes: ['automation', 'collaboration', 'deadline_management'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Proactive suggestions generated successfully',
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'suggestion-123' },
              type: { type: 'string', example: 'task_prioritization' },
              title: { type: 'string', example: 'Focus on high-priority tasks first' },
              description: {
                type: 'string',
                example:
                  'Based on your upcoming deadlines, I recommend prioritizing the quarterly report task.',
              },
              actionable: { type: 'boolean', example: true },
              action: {
                type: 'object',
                properties: {
                  type: { type: 'string', example: 'reorder_tasks' },
                  parameters: {
                    type: 'object',
                    example: { taskIds: ['task-1', 'task-2'], newOrder: [1, 0] },
                  },
                },
              },
              confidence: { type: 'number', example: 0.87 },
              impact: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
            },
          },
        },
        contextUsed: {
          type: 'object',
          example: {
            tasksAnalyzed: 8,
            eventsConsidered: 3,
            patternsIdentified: 2,
          },
        },
        generatedAt: { type: 'string', example: '2024-12-24T10:00:00Z' },
        validUntil: { type: 'string', example: '2024-12-24T14:00:00Z' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid context data provided',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded - Too many suggestion requests',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Analyze email thread for insights and action items',
    description:
      'Use AI to comprehensively analyze email threads, extract action items, identify key decisions, summarize important points, and suggest follow-up actions. Perfect for processing meeting recaps, client communications, and project updates.',
  })
  @ApiBody({
    type: AnalyzeEmailDto,
    description: 'Email analysis request data',
    examples: {
      meetingRecap: {
        summary: 'Analyze meeting recap email',
        value: {
          emailContent: {
            subject: 'Meeting Recap: Q4 Planning Session',
            from: 'manager@company.com',
            to: ['team@company.com'],
            body: 'Thanks everyone for the productive Q4 planning session. Key decisions: 1) Launch date moved to Jan 15th 2) Marketing budget approved 3) Need technical specs by Dec 30th. Action items: Alice - finalize designs, Bob - review technical requirements, Charlie - coordinate with legal team.',
            timestamp: '2024-12-24T15:30:00Z',
          },
          analysisType: 'action_items',
          extractTasks: true,
          identifyDecisions: true,
          generateSummary: true,
        },
      },
      clientCommunication: {
        summary: 'Analyze client email thread',
        value: {
          emailContent: {
            threadId: 'thread-123',
            messages: [
              {
                from: 'client@external.com',
                body: 'We need to discuss the project timeline...',
                timestamp: '2024-12-24T09:00:00Z',
              },
              {
                from: 'account@company.com',
                body: 'I understand your concerns about the timeline...',
                timestamp: '2024-12-24T10:30:00Z',
              },
            ],
          },
          analysisType: 'comprehensive',
          sentiment: true,
          urgency: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email analysis completed successfully',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          example:
            'Meeting recap discussing Q4 planning with 3 key decisions and 3 action items identified.',
        },
        actionItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              task: { type: 'string', example: 'Finalize designs' },
              assignee: { type: 'string', example: 'Alice' },
              dueDate: { type: 'string', example: '2024-12-30T17:00:00Z' },
              priority: { type: 'string', example: 'high' },
              confidence: { type: 'number', example: 0.92 },
            },
          },
        },
        keyDecisions: {
          type: 'array',
          items: { type: 'string' },
          example: ['Launch date moved to Jan 15th', 'Marketing budget approved'],
        },
        sentiment: {
          type: 'string',
          enum: ['positive', 'neutral', 'negative'],
          example: 'positive',
        },
        urgency: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], example: 'medium' },
        suggestedFollowUps: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Schedule check-in with Alice on design progress',
            'Set calendar reminder for Dec 30th technical specs deadline',
          ],
        },
        processingTime: { type: 'number', example: 1150 },
        tokensUsed: { type: 'number', example: 340 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email content or analysis parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded - Too many email analysis requests',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Draft email based on context and purpose',
    description:
      'Generate professional, contextually appropriate email drafts using AI. Supports various tones, purposes, and includes smart suggestions for subject lines, formatting, and follow-up actions. Perfect for client communications, internal updates, and follow-ups.',
  })
  @ApiBody({
    type: DraftEmailDto,
    description: 'Email drafting request data',
    examples: {
      clientFollowUp: {
        summary: 'Client follow-up email',
        value: {
          recipient: {
            email: 'client@external.com',
            name: 'John Smith',
            company: 'Acme Corp',
            relationship: 'client',
          },
          purpose: 'follow_up',
          context: {
            previousInteraction: 'project_meeting',
            meetingDate: '2024-12-23T14:00:00Z',
            keyPoints: ['Budget approval pending', 'Timeline discussion', 'Next milestone review'],
            actionItems: ['Send technical specifications', 'Schedule follow-up call'],
          },
          tone: 'professional',
          includeCalendarLink: true,
          attachments: ['technical-specs.pdf'],
        },
      },
      internalUpdate: {
        summary: 'Team status update',
        value: {
          recipient: {
            email: 'team@company.com',
            name: 'Development Team',
          },
          purpose: 'status_update',
          context: {
            project: 'Q4 Feature Release',
            progress: '75%',
            blockers: ['API integration pending', 'UI review needed'],
            nextSteps: ['Complete testing', 'Deploy to staging'],
          },
          tone: 'casual',
          format: 'bulleted',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email draft generated successfully',
    schema: {
      type: 'object',
      properties: {
        subject: { type: 'string', example: 'Follow-up: Q4 Planning Meeting - Next Steps' },
        body: {
          type: 'string',
          example:
            'Hi John,\n\nThank you for the productive meeting yesterday. As discussed, I wanted to follow up on the key points...',
        },
        suggestedSubjects: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Follow-up: Q4 Planning Meeting',
            "Next Steps from Yesterday's Discussion",
            'Q4 Project Timeline - Action Items',
          ],
        },
        tone: { type: 'string', example: 'professional' },
        estimatedReadTime: { type: 'string', example: '2 minutes' },
        suggestedActions: {
          type: 'array',
          items: { type: 'string' },
          example: ['schedule_followup', 'add_calendar_event', 'set_reminder'],
        },
        confidence: { type: 'number', example: 0.89 },
        wordCount: { type: 'number', example: 185 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email drafting parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded - Too many email drafting requests',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Get AI usage statistics for current user',
    description:
      'Retrieve comprehensive AI usage analytics including token consumption, cost tracking, request patterns, and subscription utilization. Essential for monitoring AI budget and optimizing usage patterns.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Time period for usage statistics',
    example: 'month',
    enum: ['day', 'week', 'month', 'quarter', 'year'],
  })
  @ApiQuery({
    name: 'includeBreakdown',
    required: false,
    description: 'Include detailed breakdown by model and action type',
    example: true,
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'AI usage statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string', example: 'month' },
        usage: {
          type: 'object',
          properties: {
            totalRequests: { type: 'number', example: 245 },
            totalTokens: { type: 'number', example: 125000 },
            totalCost: { type: 'number', example: 15.75 },
            averageCostPerRequest: { type: 'number', example: 0.064 },
            remainingQuota: { type: 'number', example: 755 },
          },
        },
        breakdown: {
          type: 'object',
          properties: {
            byModel: {
              type: 'object',
              example: {
                'claude-3-sonnet-20240229': { requests: 180, tokens: 95000, cost: 12.35 },
                'claude-3-haiku-20240307': { requests: 65, tokens: 30000, cost: 3.4 },
              },
            },
            byAction: {
              type: 'object',
              example: {
                process_request: 85,
                analyze_email: 60,
                draft_email: 45,
                generate_suggestions: 55,
              },
            },
            byDay: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', example: '2024-12-24' },
                  requests: { type: 'number', example: 12 },
                  cost: { type: 'number', example: 0.78 },
                },
              },
            },
          },
        },
        subscription: {
          type: 'object',
          properties: {
            plan: { type: 'string', example: 'pro' },
            monthlyQuota: { type: 'number', example: 1000 },
            quotaUsed: { type: 'number', example: 245 },
            quotaPercentage: { type: 'number', example: 24.5 },
            resetDate: { type: 'string', example: '2025-01-01T00:00:00Z' },
          },
        },
        insights: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Peak usage on Tuesdays',
            'Email analysis is your most used feature',
            'Consider upgrading for better model access',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  async getUsageStats(@CurrentUser() user: any): Promise<any> {
    return this.aiGatewayService.getUsageStats(user.id);
  }

  @Get('health')
  @ApiOperation({
    summary: 'Check AI gateway service health',
    description:
      'Perform comprehensive health check of AI gateway services including model availability, response times, error rates, and system resources. Used by monitoring systems and load balancers.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI gateway service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2024-12-24T10:00:00Z' },
        version: { type: 'string', example: '1.0.0' },
        uptime: { type: 'number', example: 86400 },
        services: {
          type: 'object',
          properties: {
            anthropic: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'operational' },
                responseTime: { type: 'number', example: 350 },
                lastChecked: { type: 'string', example: '2024-12-24T09:59:45Z' },
              },
            },
            cache: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'connected' },
                hitRate: { type: 'number', example: 0.76 },
                memoryUsage: { type: 'string', example: '45%' },
              },
            },
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'connected' },
                responseTime: { type: 'number', example: 15 },
                connectionPool: { type: 'string', example: '8/20' },
              },
            },
          },
        },
        metrics: {
          type: 'object',
          properties: {
            requestsPerMinute: { type: 'number', example: 12.5 },
            averageResponseTime: { type: 'number', example: 890 },
            errorRate: { type: 'number', example: 0.02 },
            cacheHitRate: { type: 'number', example: 0.76 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'AI gateway service is unhealthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'unhealthy' },
        timestamp: { type: 'string', example: '2024-12-24T10:00:00Z' },
        errors: {
          type: 'array',
          items: { type: 'string' },
          example: ['Anthropic API timeout', 'Redis connection failed'],
        },
        services: {
          type: 'object',
          example: {
            anthropic: { status: 'timeout', lastError: 'Connection timeout after 5000ms' },
            cache: { status: 'disconnected', lastError: 'Redis ECONNREFUSED' },
          },
        },
      },
    },
  })
  async healthCheck(): Promise<any> {
    return this.aiGatewayService.healthCheck();
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Interactive AI chat conversation',
    description:
      'Engage in interactive chat conversations with AI models. Supports conversation context, multiple models, and advanced parameters. Perfect for complex queries, brainstorming, and getting detailed assistance.',
  })
  @ApiBody({
    type: ChatRequestDto,
    description: 'Chat conversation request',
    examples: {
      simpleQuery: {
        summary: 'Simple question',
        value: {
          messages: [
            {
              role: 'user',
              content: 'How can I improve my daily productivity?',
              timestamp: '2024-12-24T10:00:00Z',
            },
          ],
          model: 'claude-3-sonnet-20240229',
          includeContext: true,
          suggestActions: true,
        },
      },
      contextualConversation: {
        summary: 'Conversation with context',
        value: {
          messages: [
            { role: 'user', content: 'Help me plan my week', timestamp: '2024-12-24T10:00:00Z' },
            {
              role: 'assistant',
              content:
                "I'd be happy to help you plan your week. Let me look at your upcoming tasks and calendar events.",
              timestamp: '2024-12-24T10:00:15Z',
            },
            {
              role: 'user',
              content: 'Focus on the most important tasks first',
              timestamp: '2024-12-24T10:01:00Z',
            },
          ],
          context: {
            tasks: [
              { id: 'task-1', title: 'Quarterly report', priority: 'high', dueDate: '2024-12-27' },
            ],
            events: [{ id: 'event-1', title: 'Team meeting', startTime: '2024-12-25T14:00:00Z' }],
            timezone: 'America/New_York',
          },
          conversationId: 'conv-123e4567-e89b-12d3-a456-426614174000',
          temperature: 0.8,
          maxTokens: 1500,
          suggestActions: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Chat response generated successfully',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid chat request - malformed messages or parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded - Too many chat requests',
    type: ErrorResponseDto,
  })
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  async chat(
    @CurrentUser() user: any,
    @Body() chatRequestDto: ChatRequestDto
  ): Promise<ChatResponseDto> {
    return this.aiGatewayService.chat({
      userId: user.id,
      messages: chatRequestDto.messages,
      model: chatRequestDto.model,
      temperature: chatRequestDto.temperature,
      maxTokens: chatRequestDto.maxTokens,
      context: chatRequestDto.context,
      includeContext: chatRequestDto.includeContext,
      suggestActions: chatRequestDto.suggestActions,
      conversationId: chatRequestDto.conversationId,
      systemPrompt: chatRequestDto.systemPrompt,
      userSubscription: user.subscription,
    });
  }
}
