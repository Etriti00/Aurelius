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

interface MessageContent {
  type: 'text';
  text: string;
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

      // Use messages API with modern error handling
      const systemPrompt = request.systemPrompt || this.getDefaultSystemPrompt();

      const response = await this.anthropic.messages.create({
        model: request.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: content,
          },
        ],
      });

      const textContent = response.content[0].type === 'text' ? response.content[0].text : '';

      const result: AnthropicResponse = {
        text: textContent,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
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

      if (error instanceof Error && 'status' in error) {
        const apiError = error as { status?: number; message: string };
        if (apiError.status === 429) {
          throw new AIServiceException('Rate limit exceeded - please try again later');
        } else if (apiError.status === 401) {
          throw new AIServiceException('Invalid API key');
        } else if (typeof apiError.status === 'number' && apiError.status >= 500) {
          throw new AIServiceException('Anthropic service temporarily unavailable');
        } else {
          throw new AIServiceException(`AI request failed: ${apiError.message}`);
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
    throw new AIServiceException('Embedding generation not implemented for Anthropic');
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

  // API compatibility methods for Claude service
  async createMessage(params: {
    model: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    system?: string;
    max_tokens: number;
    temperature?: number;
    top_p?: number;
    stop_sequences?: string[];
  }): Promise<{
    content: Array<MessageContent>;
    usage: { input_tokens: number; output_tokens: number };
    id: string;
  }> {
    try {
      const response = await this.anthropic.messages.create({
        model: params.model,
        max_tokens: params.max_tokens,
        temperature: params.temperature || 0.7,
        system: params.system || this.getDefaultSystemPrompt(),
        messages: params.messages,
        top_p: params.top_p,
        stop_sequences: params.stop_sequences,
      });

      return {
        content: response.content.map(
          (c): MessageContent => ({
            type: 'text',
            text: c.type === 'text' ? c.text : '',
          })
        ),
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
        id: response.id,
      };
    } catch (error) {
      this.logger.error('Anthropic createMessage failed', error);
      throw new AIServiceException(
        `Message creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async createMessageStream(params: {
    model: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    system?: string;
    max_tokens: number;
    temperature?: number;
    top_p?: number;
    stop_sequences?: string[];
  }): Promise<AsyncIterable<Anthropic.MessageStreamEvent>> {
    try {
      const stream = await this.anthropic.messages.create({
        model: params.model,
        max_tokens: params.max_tokens,
        temperature: params.temperature || 0.7,
        system: params.system || this.getDefaultSystemPrompt(),
        messages: params.messages,
        top_p: params.top_p,
        stop_sequences: params.stop_sequences,
        stream: true,
      });

      return stream;
    } catch (error) {
      this.logger.error('Anthropic createMessageStream failed', error);
      throw new AIServiceException(
        `Message streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'ping',
          },
        ],
      });

      return !!response;
    } catch (error) {
      this.logger.error('Anthropic health check failed', error);
      return false;
    }
  }
}
