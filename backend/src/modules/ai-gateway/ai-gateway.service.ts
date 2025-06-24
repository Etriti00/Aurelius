import { Injectable, Logger } from '@nestjs/common';
import { getOrDefault } from '../../common/utils/type-guards';

import { AIModelSelectorService } from './services/ai-model-selector.service';
import { AnthropicService } from './services/anthropic.service';
import { AIUsageTrackingService } from './services/ai-usage-tracking.service';
import { AIServiceException, RateLimitException } from '../../common/exceptions/app.exception';
import { ChatMessageDto, AIModel } from './dto/chat-request.dto';
import { ChatResponseDto, AIUsageDto, SuggestedActionDto } from './dto/chat-response.dto';

interface AIProcessRequest {
  prompt: string;
  context?: string;
  systemPrompt?: string;
  userId: string;
  action: string;
  userSubscription: {
    tier: 'PRO' | 'MAX' | 'TEAMS';
  };
  metadata?: {
    urgency?: 'low' | 'normal' | 'high';
    type?: string;
    conversationId?: string;
    model?: AIModel;
    temperature?: number;
    maxTokens?: number;
  };
}

interface AIProcessResponse {
  text: string;
  model: string;
  confidence: number;
  suggestions?: string[];
  metadata: {
    inputTokens: number;
    outputTokens: number;
    duration: number;
    cost: number;
    cacheHit: boolean;
  };
}

interface EmailAnalysisResult {
  summary: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  sentiment: number;
  actionItems: string[];
  suggestedResponse?: string;
}

interface EmailDraftResult {
  subject: string;
  body: string;
}

interface ChatRequest {
  userId: string;
  messages: ChatMessageDto[];
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  context?: ChatContext;
  includeContext?: boolean;
  suggestActions?: boolean;
  conversationId?: string;
  systemPrompt?: string;
  userSubscription: { tier: 'PRO' | 'MAX' | 'TEAMS' };
}

interface ChatContext {
  tasks?: Array<{ title: string; status: string }>;
  events?: Array<{ title: string; startTime: string }>;
  emails?: Array<{ subject: string; from: string }>;
  location?: string;
  timezone?: string;
}

interface ActionParameters {
  title?: string;
  recipient?: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

interface HealthCheckResult {
  healthy: boolean;
  services: Record<string, boolean>;
}

interface UserUsageStats {
  userId: string;
  currentMonthUsage: number;
  monthlyLimit: number;
  remainingActions: number;
  usageByModel: Record<string, number>;
  totalCost: number;
  lastResetDate: Date;
}

@Injectable()
export class AIGatewayService {
  private readonly logger = new Logger(AIGatewayService.name);

  constructor(
    private readonly modelSelector: AIModelSelectorService,
    private readonly anthropicService: AnthropicService,
    private readonly usageTracking: AIUsageTrackingService
  ) {}

  async processRequest(request: AIProcessRequest): Promise<AIProcessResponse> {
    const startTime = Date.now();

    // Check usage limits
    const canProceed = await this.usageTracking.checkUsageLimit(request.userId);
    if (!canProceed) {
      throw new RateLimitException('Monthly AI action limit exceeded');
    }

    // Select optimal model
    const modelSelection = this.modelSelector.selectModel({
      prompt: request.prompt,
      context: request.context,
      user: {
        id: request.userId,
        subscription: request.userSubscription,
      },
      metadata: request.metadata,
    });

    this.logger.debug(
      `Selected model ${modelSelection.model} for user ${request.userId}: ${modelSelection.reasoning}`
    );

    try {
      // Make AI request
      const aiResponse = await this.anthropicService.generateResponse({
        prompt: request.prompt,
        model: modelSelection.model,
        maxTokens: modelSelection.maxTokens,
        temperature: modelSelection.temperature,
        systemPrompt: request.systemPrompt,
        context: request.context,
      });

      // Calculate cost
      const cost = this.modelSelector.estimateCost(
        aiResponse.inputTokens,
        aiResponse.outputTokens,
        modelSelection.model
      );

      // Record usage
      await this.usageTracking.recordUsage({
        userId: request.userId,
        model: modelSelection.model,
        action: request.action,
        inputTokens: aiResponse.inputTokens,
        outputTokens: aiResponse.outputTokens,
        totalCost: cost,
        duration: aiResponse.duration,
        cacheHit: aiResponse.cacheHit,
      });

      // Extract suggestions if the response contains actionable items
      const suggestions = this.extractSuggestions(aiResponse.text);

      const response: AIProcessResponse = {
        text: aiResponse.text,
        model: modelSelection.model,
        confidence: this.calculateConfidence(modelSelection.model, aiResponse.outputTokens),
        suggestions,
        metadata: {
          inputTokens: aiResponse.inputTokens,
          outputTokens: aiResponse.outputTokens,
          duration: Date.now() - startTime,
          cost,
          cacheHit: aiResponse.cacheHit,
        },
      };

      this.logger.debug(
        `AI request completed for user ${request.userId}: ` +
          `${response.metadata.duration}ms, $${cost.toFixed(6)}, ` +
          `cache: ${response.metadata.cacheHit}`
      );

      return response;
    } catch (error) {
      this.logger.error(`AI request failed for user ${request.userId}`, error);
      throw error;
    }
  }

  async generateSuggestions(request: {
    userId: string;
    context: string;
    userSubscription: { tier: 'PRO' | 'MAX' | 'TEAMS' };
  }): Promise<string[]> {
    const suggestionPrompt = `Based on the following user context, generate 3-5 actionable suggestions that would help improve productivity and workflow:

Context: ${request.context}

Provide suggestions that are:
- Specific and actionable
- Relevant to the user's current situation
- Time-sensitive if applicable
- Focused on automation or efficiency improvements

Format as a simple list.`;

    try {
      const response = await this.processRequest({
        prompt: suggestionPrompt,
        userId: request.userId,
        action: 'suggestion-generation',
        userSubscription: request.userSubscription,
        metadata: { type: 'suggestions' },
      });

      return this.extractSuggestions(response.text);
    } catch (error) {
      this.logger.error('Failed to generate suggestions', error);
      return [];
    }
  }

  async analyzeEmailThread(request: {
    userId: string;
    emailContent: string;
    userSubscription: { tier: 'PRO' | 'MAX' | 'TEAMS' };
  }): Promise<EmailAnalysisResult> {
    const analysisPrompt = `Analyze this email thread and provide:

1. A concise summary (2-3 sentences)
2. Priority level (LOW/NORMAL/HIGH/URGENT)
3. Sentiment score (-1 to 1, where -1 is negative, 0 is neutral, 1 is positive)
4. Action items extracted from the email
5. If appropriate, suggest a brief response

Email content:
${request.emailContent}

Respond in JSON format:
{
  "summary": "...",
  "priority": "...",
  "sentiment": 0.0,
  "actionItems": ["...", "..."],
  "suggestedResponse": "..." (optional)
}`;

    try {
      const response = await this.processRequest({
        prompt: analysisPrompt,
        userId: request.userId,
        action: 'email-analysis',
        userSubscription: request.userSubscription,
        metadata: { type: 'email-analysis' },
      });

      // Parse JSON response
      const analysis: EmailAnalysisResult = JSON.parse(response.text);
      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze email thread', error);
      // Return default analysis
      return {
        summary: 'Unable to analyze email content',
        priority: 'NORMAL',
        sentiment: 0,
        actionItems: [],
      };
    }
  }

  async draftEmail(request: {
    userId: string;
    context: string;
    recipient: string;
    purpose: string;
    tone?: 'formal' | 'casual' | 'friendly';
    userSubscription: { tier: 'PRO' | 'MAX' | 'TEAMS' };
  }): Promise<EmailDraftResult> {
    const tone = getOrDefault(request.tone, 'professional' as const);

    const draftPrompt = `Draft an email with the following details:

Recipient: ${request.recipient}
Purpose: ${request.purpose}
Tone: ${tone}
Context: ${request.context}

Requirements:
- Professional and well-structured
- Clear subject line
- Appropriate tone for the relationship and purpose
- Include relevant details from context
- Concise but complete

Respond in JSON format:
{
  "subject": "...",
  "body": "..."
}`;

    try {
      const response = await this.processRequest({
        prompt: draftPrompt,
        userId: request.userId,
        action: 'email-drafting',
        userSubscription: request.userSubscription,
        metadata: { type: 'email-drafting' },
      });

      const draft: EmailDraftResult = JSON.parse(response.text);
      return draft;
    } catch (error) {
      this.logger.error('Failed to draft email', error);
      throw new AIServiceException('Failed to generate email draft');
    }
  }

  private extractSuggestions(text: string): string[] {
    // Extract suggestions from AI response
    const lines = text.split('\n').filter(line => line.trim());
    const suggestions: string[] = [];

    for (const line of lines) {
      // Look for numbered lists, bullet points, or suggestion patterns
      if (
        /^\d+\./.test(line.trim()) ||
        /^[-*•]/.test(line.trim()) ||
        line.toLowerCase().includes('suggest') ||
        line.toLowerCase().includes('recommend')
      ) {
        const cleanSuggestion = line.replace(/^((\d+\.)|(\s*[-*•]\s*))/, '').trim();
        if (cleanSuggestion.length > 10) {
          suggestions.push(cleanSuggestion);
        }
      }
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  private calculateConfidence(model: string, outputTokens: number): number {
    // Calculate confidence based on model capability and response length
    let baseConfidence = 0.7;

    switch (model) {
      case 'claude-3-opus':
        baseConfidence = 0.9;
        break;
      case 'claude-3-5-sonnet':
        baseConfidence = 0.8;
        break;
      case 'claude-3-haiku':
        // Already initialized to 0.7
        break;
    }

    // Adjust based on response length (longer responses might be more detailed)
    if (outputTokens > 500) {
      baseConfidence += 0.05;
    } else if (outputTokens < 50) {
      baseConfidence -= 0.1;
    }

    return Math.min(0.95, Math.max(0.5, baseConfidence));
  }

  async getUsageStats(userId: string): Promise<UserUsageStats> {
    const stats = await this.usageTracking.getUserUsageStats(userId);

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // Transform UsageStats to UserUsageStats
    // TODO: Fetch actual monthly limit from user's subscription
    return {
      userId,
      currentMonthUsage: stats.totalActions,
      monthlyLimit: 1000, // Default PRO limit, should be fetched from subscription
      remainingActions: Math.max(0, 1000 - stats.totalActions),
      usageByModel: getOrDefault(stats.modelBreakdown, {}),
      totalCost: stats.totalCost,
      lastResetDate: currentMonth,
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const [anthropicHealthy] = await Promise.all([this.anthropicService.healthCheck()]);

    return {
      healthy: anthropicHealthy,
      services: {
        anthropic: anthropicHealthy,
      },
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponseDto> {
    const startTime = Date.now();

    try {
      // Build the conversation prompt from messages
      const conversationText = request.messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      // Add system prompt if provided
      let fullPrompt = conversationText;
      if (request.systemPrompt) {
        fullPrompt = `${request.systemPrompt}\n\n${conversationText}`;
      }

      // Add context if requested and available
      if (request.includeContext && request.context) {
        const contextText = this.formatContextForPrompt(request.context);
        fullPrompt = `Context: ${contextText}\n\n${fullPrompt}`;
      }

      // Process the chat request
      const response = await this.processRequest({
        prompt: fullPrompt,
        userId: request.userId,
        action: 'chat',
        userSubscription: request.userSubscription,
        metadata: {
          type: 'chat',
          conversationId: request.conversationId,
          model: request.model,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        },
      });

      // Generate suggested actions if requested
      let suggestedActions: SuggestedActionDto[] = [];
      if (request.suggestActions) {
        suggestedActions = this.extractSuggestedActions(response.text);
      }

      // Create usage information
      const usage = new AIUsageDto({
        promptTokens: response.metadata.inputTokens,
        completionTokens: response.metadata.outputTokens,
        totalTokens: response.metadata.inputTokens + response.metadata.outputTokens,
        cost: response.metadata.cost,
      });

      // Build the chat response
      const chatResponse = new ChatResponseDto({
        response: response.text,
        model: request.model ?? AIModel.CLAUDE_3_SONNET,
        usage,
        timestamp: new Date().toISOString(),
        conversationTurnId: this.generateTurnId(),
        conversationId: request.conversationId,
        suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
        processingTime: Date.now() - startTime,
        success: true,
      });

      return chatResponse;
    } catch (error) {
      this.logger.error('Failed to process chat request', error);

      // Return error response
      return new ChatResponseDto({
        response: '',
        model: request.model ?? AIModel.CLAUDE_3_SONNET,
        usage: new AIUsageDto({ promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 }),
        timestamp: new Date().toISOString(),
        conversationTurnId: this.generateTurnId(),
        conversationId: request.conversationId,
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  private formatContextForPrompt(context: ChatContext): string {
    const contextParts: string[] = [];

    if (context.tasks && context.tasks.length > 0) {
      contextParts.push(
        `Current tasks: ${context.tasks.map(t => `${t.title} (${t.status})`).join(', ')}`
      );
    }

    if (context.events && context.events.length > 0) {
      contextParts.push(
        `Upcoming events: ${context.events.map(e => `${e.title} at ${e.startTime}`).join(', ')}`
      );
    }

    if (context.emails && context.emails.length > 0) {
      contextParts.push(
        `Recent emails: ${context.emails.map(e => `"${e.subject}" from ${e.from}`).join(', ')}`
      );
    }

    if (context.location) {
      contextParts.push(`Location: ${context.location}`);
    }

    if (context.timezone) {
      contextParts.push(`Timezone: ${context.timezone}`);
    }

    return contextParts.join('. ');
  }

  private extractSuggestedActions(text: string): SuggestedActionDto[] {
    const actions: SuggestedActionDto[] = [];

    // Look for action-oriented phrases in the response
    const actionPatterns = [
      /create.*task/i,
      /schedule.*meeting/i,
      /send.*email/i,
      /set.*reminder/i,
      /add.*to.*calendar/i,
    ];

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    sentences.forEach((sentence, index) => {
      actionPatterns.forEach(pattern => {
        if (pattern.test(sentence)) {
          const actionType = this.determineActionType(sentence);
          if (actionType) {
            const rawParameters = this.extractActionParameters(sentence, actionType);
            // Filter out undefined values to match DTO type
            const parameters: Record<string, string | number | boolean | string[]> = {};
            Object.entries(rawParameters).forEach(([key, value]) => {
              if (value !== undefined) {
                parameters[key] = value;
              }
            });

            actions.push(
              new SuggestedActionDto({
                type: actionType,
                description: sentence.trim(),
                parameters,
                confidence: 0.7,
                id: `suggestion-${Date.now()}-${index}`,
              })
            );
          }
        }
      });
    });

    return actions.slice(0, 3); // Limit to 3 suggestions
  }

  private determineActionType(sentence: string): string | null {
    if (/create.*task/i.test(sentence)) return 'create_task';
    if (/schedule.*meeting/i.test(sentence)) return 'schedule_event';
    if (/send.*email/i.test(sentence)) return 'send_email';
    if (/set.*reminder/i.test(sentence)) return 'set_reminder';
    if (/add.*calendar/i.test(sentence)) return 'schedule_event';
    return null;
  }

  private extractActionParameters(sentence: string, actionType: string): ActionParameters {
    // Basic parameter extraction - could be enhanced with NLP
    const parameters: ActionParameters = {};

    switch (actionType) {
      case 'create_task':
        // Try to extract task title from quotes or after "create task"
        const taskMatch =
          sentence.match(/create.*task.*["']([^"']+)["']/i) ||
          sentence.match(/create.*task.*(?:to|for)\s+([^.!?]+)/i);
        if (taskMatch) {
          parameters.title = taskMatch[1].trim();
        }
        break;

      case 'schedule_event':
        // Try to extract event details
        const eventMatch = sentence.match(/schedule.*["']([^"']+)["']/i);
        if (eventMatch) {
          parameters.title = eventMatch[1].trim();
        }
        break;

      case 'send_email':
        // Try to extract recipient or subject
        const emailMatch =
          sentence.match(/send.*email.*to\s+([^.!?\s]+)/i) ||
          sentence.match(/email.*["']([^"']+)["']/i);
        if (emailMatch) {
          parameters.recipient = emailMatch[1].trim();
        }
        break;
    }

    return parameters;
  }

  private generateTurnId(): string {
    return `turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
