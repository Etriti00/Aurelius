import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { AnthropicService } from './anthropic.service';
import { AIRequestOptions, AIResponse, AIStreamResponse } from '../interfaces';
import { AIException } from '../../../common/exceptions';

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly defaultModel = 'claude-3-5-sonnet';

  constructor(
    private configService: ConfigService,
    private anthropicService: AnthropicService,
  ) {}

  async generateResponse(
    prompt: string,
    options: AIRequestOptions = {},
  ): Promise<AIResponse> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();
    
    try {
      const response = await this.anthropicService.createMessage({
        model: this.mapModelName(model),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: options.systemPrompt || this.getDefaultSystemPrompt(),
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        stop_sequences: options.stopSequences,
      });

      const processingTime = Date.now() - startTime;
      
      return {
        content: response.content[0].text,
        model,
        usage: {
          model,
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          cost: this.calculateCost(model, response.usage),
        },
        cached: false,
        requestId: response.id,
        processingTime,
      };
    } catch (error: any) {
      this.logger.error(`Claude API error: ${error.message}`, error.stack);
      throw new AIException(
        `Failed to generate response: ${error.message}`,
        model,
        { originalError: error.message },
      );
    }
  }

  async generateStream(
    prompt: string,
    options: AIRequestOptions = {},
  ): Promise<AIStreamResponse> {
    const model = options.model || this.defaultModel;
    
    try {
      const stream = await this.anthropicService.createMessageStream({
        model: this.mapModelName(model),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: options.systemPrompt || this.getDefaultSystemPrompt(),
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        stop_sequences: options.stopSequences,
      });

      return {
        stream: this.wrapStream(stream),
        model,
        requestId: `stream-${Date.now()}`,
      };
    } catch (error: any) {
      this.logger.error(`Claude streaming error: ${error.message}`, error.stack);
      throw new AIException(
        `Failed to generate stream: ${error.message}`,
        model,
        { originalError: error.message },
      );
    }
  }

  async analyzeConversation(
    messages: Array<{ role: string; content: string }>,
    options: AIRequestOptions = {},
  ): Promise<AIResponse> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();
    
    try {
      const response = await this.anthropicService.createMessage({
        model: this.mapModelName(model),
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        system: options.systemPrompt || this.getDefaultSystemPrompt(),
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
      });

      const processingTime = Date.now() - startTime;
      
      return {
        content: response.content[0].text,
        model,
        usage: {
          model,
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          cost: this.calculateCost(model, response.usage),
        },
        cached: false,
        requestId: response.id,
        processingTime,
      };
    } catch (error: any) {
      this.logger.error(`Claude conversation analysis error: ${error.message}`, error.stack);
      throw new AIException(
        `Failed to analyze conversation: ${error.message}`,
        model,
        { originalError: error.message },
      );
    }
  }

  private mapModelName(model: string): string {
    const modelMap: Record<string, string> = {
      'claude-3-haiku': 'claude-3-haiku-20240307',
      'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
      'claude-3-opus': 'claude-3-opus-20240229',
    };
    
    return modelMap[model] || model;
  }

  private calculateCost(model: string, usage: { input_tokens: number; output_tokens: number }): number {
    const costs = this.configService.get('ai.models') as Record<string, { costPer1kTokens: number }> | undefined;
    if (!costs) {
      this.logger.warn('AI model costs configuration not found');
      return 0;
    }
    const modelCost = costs[model];
    
    if (!modelCost) {
      this.logger.warn(`Cost calculation not available for model: ${model}`);
      return 0;
    }

    const inputCost = (usage.input_tokens / 1000) * modelCost.costPer1kTokens;
    const outputCost = (usage.output_tokens / 1000) * modelCost.costPer1kTokens * 3; // Output tokens typically 3x more expensive
    
    return Number((inputCost + outputCost).toFixed(6));
  }

  private getDefaultSystemPrompt(): string {
    return this.configService.get('ai.prompts.systemPrompt');
  }

  private async *wrapStream(stream: AsyncIterable<any>): AsyncIterable<string> {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        yield chunk.delta.text;
      }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.generateResponse('Hello, Claude!', {
        maxTokens: 10,
        model: 'claude-3-haiku',
      });
      return true;
    } catch (error) {
      this.logger.error('Claude connection test failed:', error);
      return false;
    }
  }
}