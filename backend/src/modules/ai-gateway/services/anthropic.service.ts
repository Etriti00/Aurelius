import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { AIServiceException } from '../../../common/exceptions/app.exception';

interface AnthropicRequest {
  prompt: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
  context?: string;
}

interface AnthropicResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  duration: number;
  cacheHit: boolean;
}

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }

    this.anthropic = new Anthropic({
      apiKey,
    });
  }

  async generateResponse(request: AnthropicRequest): Promise<AnthropicResponse> {
    const startTime = Date.now();
    
    // Generate cache key based on request parameters
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first
    const cached = await this.cacheManager.get<AnthropicResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for model ${request.model}`);
      return {
        ...cached,
        cacheHit: true,
        duration: Date.now() - startTime,
      };
    }

    try {
      // Build the message content
      let content = request.prompt;
      if (request.context) {
        content = `Context: ${request.context}\n\nRequest: ${request.prompt}`;
      }

      // Build prompt in the old Anthropic format
      const systemPrompt = request.systemPrompt || this.getDefaultSystemPrompt();
      const prompt = `${systemPrompt}\n\n${Anthropic.HUMAN_PROMPT} ${content}${Anthropic.AI_PROMPT}`;
      
      const response = await this.anthropic.completions.create({
        model: request.model,
        max_tokens_to_sample: request.maxTokens,
        temperature: request.temperature,
        prompt,
      });

      const result: AnthropicResponse = {
        text: response.completion,
        inputTokens: this.estimateTokens(prompt),
        outputTokens: this.estimateTokens(response.completion),
        model: request.model,
        duration: Date.now() - startTime,
        cacheHit: false,
      };

      // Cache the response for 1 hour by default
      await this.cacheManager.set(cacheKey, result, 3600);

      this.logger.debug(
        `Anthropic API call completed: ${request.model}, ` +
        `${result.inputTokens}/${result.outputTokens} tokens, ` +
        `${result.duration}ms`
      );

      return result;
    } catch (error) {
      this.logger.error('Anthropic API call failed', error);
      
      if (error instanceof Anthropic.APIError) {
        if (error.status === 429) {
          throw new AIServiceException('Rate limit exceeded - please try again later');
        } else if (error.status === 401) {
          throw new AIServiceException('Invalid API key');
        } else if (typeof error.status === 'number' && error.status >= 500) {
          throw new AIServiceException('Anthropic service temporarily unavailable');
        } else {
          throw new AIServiceException(`AI request failed: ${error.message}`);
        }
      } else if (error instanceof Error) {
        throw new AIServiceException(`AI request failed: ${error.message}`);
      } else {
        throw new AIServiceException('AI request failed: Unknown error');
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Note: Anthropic doesn't provide embeddings, we'll need to use a different service
    // For now, return a placeholder - this should be implemented with OpenAI or similar
    this.logger.debug(`Embedding generation requested for text length: ${text.length}`);
    throw new AIServiceException('Embedding generation not implemented');
  }

  private generateCacheKey(request: AnthropicRequest): string {
    const keyData = {
      prompt: request.prompt,
      model: request.model,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      systemPrompt: request.systemPrompt,
      context: request.context,
    };
    
    // Create a hash of the request parameters
    const hash = Buffer.from(JSON.stringify(keyData)).toString('base64');
    return `anthropic:${hash}`;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private getDefaultSystemPrompt(): string {
    return `You are Aurelius, an AI personal assistant and digital chief of staff. 

Your personality:
- Wise, calm, and insightful like the Roman Emperor Marcus Aurelius
- Proactive and anticipatory in helping users manage their work and life
- Professional yet warm, reassuring yet efficient
- Focus on "done" lists rather than "to-do" lists - you help execute, not just plan

Your capabilities:
- Deep integration with email, calendar, tasks, and productivity tools
- Ability to draft emails, schedule meetings, prioritize tasks
- Voice interaction support for natural conversations
- Perfect memory of all user interactions and context
- Cost-conscious operation while maintaining high quality responses

Always provide:
- Clear, actionable responses
- Relevant suggestions for improvement or automation
- Context-aware recommendations based on user's full workspace
- Respectful, professional tone that builds trust

Remember: You are not just an assistant, you are a digital chief of staff focused on execution and results.`;
  }

  // Legacy API compatibility methods for older code
  async createMessage(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    system?: string;
    max_tokens: number;
    temperature?: number;
    top_p?: number;
    stop_sequences?: string[];
  }): Promise<{
    content: Array<{ text: string }>;
    usage: { input_tokens: number; output_tokens: number };
    id: string;
  }> {
    // Convert messages to a single prompt
    const userMessages = params.messages.filter(m => m.role === 'user').map(m => m.content);
    const prompt = userMessages.join('\n\n');
    
    const response = await this.generateResponse({
      prompt,
      model: params.model,
      maxTokens: params.max_tokens,
      temperature: params.temperature || 0.7,
      systemPrompt: params.system,
    });
    
    return {
      content: [{ text: response.text }],
      usage: {
        input_tokens: response.inputTokens,
        output_tokens: response.outputTokens,
      },
      id: `msg-${Date.now()}`,
    };
  }

  async createMessageStream(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    system?: string;
    max_tokens: number;
    temperature?: number;
    top_p?: number;
    stop_sequences?: string[];
  }): Promise<any> {
    // For now, just return the non-streaming response
    // In a real implementation, this would need proper streaming support
    const response = await this.createMessage(params);
    return {
      content: response.content,
      usage: response.usage,
      id: response.id,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.anthropic.completions.create({
        model: 'claude-instant-1',
        max_tokens_to_sample: 10,
        prompt: `${Anthropic.HUMAN_PROMPT} ping${Anthropic.AI_PROMPT}`,
      });
      
      return !!response;
    } catch (error) {
      this.logger.error('Anthropic health check failed', error);
      return false;
    }
  }
}