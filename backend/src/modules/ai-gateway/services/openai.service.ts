import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AIRequestOptions, AIResponse, AIStreamResponse } from '../interfaces';
import { AIException } from '../../../common/exceptions';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly client: OpenAI | null;
  private readonly defaultModel = 'gpt-4-turbo-preview';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      this.client = null;
      this.logger.warn('OpenAI API key not provided - OpenAI services will be disabled');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      throw new AIException('OpenAI client not initialized', 'embeddings');
    }

    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenAI embedding error: ${errorMessage}`, error);
      throw new AIException(
        `Failed to generate embedding: ${errorMessage}`,
        'text-embedding-3-small',
        { originalError: errorMessage }
      );
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new AIException('OpenAI client not initialized', 'embeddings');
    }

    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenAI batch embedding error: ${errorMessage}`, error);
      throw new AIException(
        `Failed to generate batch embeddings: ${errorMessage}`,
        'text-embedding-3-small',
        { originalError: errorMessage }
      );
    }
  }

  async generateResponse(prompt: string, options: AIRequestOptions = {}): Promise<AIResponse> {
    if (!this.client) {
      throw new AIException('OpenAI client not initialized', options.model);
    }

    const model = options.model || this.defaultModel;
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stop: options.stopSequences,
      });

      const processingTime = Date.now() - startTime;
      const usage = response.usage!;

      return {
        content: response.choices[0].message.content || '',
        model,
        usage: {
          model,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          cost: this.calculateCost(model, usage),
        },
        cached: false,
        requestId: response.id,
        processingTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenAI API error: ${errorMessage}`, error);
      throw new AIException(`Failed to generate response: ${errorMessage}`, model, {
        originalError: errorMessage,
      });
    }
  }

  async generateStream(prompt: string, options: AIRequestOptions = {}): Promise<AIStreamResponse> {
    if (!this.client) {
      throw new AIException('OpenAI client not initialized', options.model);
    }

    const model = options.model || this.defaultModel;

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        stream: true,
      });

      return {
        stream: this.wrapStream(stream),
        model,
        requestId: `stream-${Date.now()}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenAI streaming error: ${errorMessage}`, error);
      throw new AIException(`Failed to generate stream: ${errorMessage}`, model, {
        originalError: errorMessage,
      });
    }
  }

  private calculateCost(model: string, usage: any): number {
    // OpenAI pricing per 1M tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo-preview': { input: 10, output: 30 },
      'gpt-4': { input: 30, output: 60 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    };

    const modelPricing = pricing[model] || { input: 10, output: 30 };

    const inputCost = (usage.prompt_tokens / 1_000_000) * modelPricing.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * modelPricing.output;

    return Number((inputCost + outputCost).toFixed(6));
  }

  private async *wrapStream(stream: any): AsyncIterable<string> {
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        yield chunk.choices[0].delta.content;
      }
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }
}
