import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { AIModelSelectorService } from './services/ai-model-selector.service';
import { AnthropicService } from './services/anthropic.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { AIServiceException, RateLimitException } from '../../common/exceptions/app.exception';

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

@Injectable()
export class AIGatewayService {
  private readonly logger = new Logger(AIGatewayService.name);

  constructor(
    private readonly modelSelector: AIModelSelectorService,
    private readonly anthropicService: AnthropicService,
    private readonly usageTracking: UsageTrackingService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
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
  }): Promise<{
    summary: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    sentiment: number;
    actionItems: string[];
    suggestedResponse?: string;
  }> {
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
      const analysis = JSON.parse(response.text);
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
  }): Promise<{ subject: string; body: string }> {
    const tone = request.tone || 'professional';
    
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

      const draft = JSON.parse(response.text);
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
        const cleanSuggestion = line.replace(/^\d+\.|\s*[-*•]\s*/, '').trim();
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
        baseConfidence = 0.7;
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

  async getUsageStats(userId: string): Promise<any> {
    return this.usageTracking.getUserUsageStats(userId);
  }

  async healthCheck(): Promise<{ healthy: boolean; services: Record<string, boolean> }> {
    const [anthropicHealthy] = await Promise.all([
      this.anthropicService.healthCheck(),
    ]);

    return {
      healthy: anthropicHealthy,
      services: {
        anthropic: anthropicHealthy,
      },
    };
  }
}