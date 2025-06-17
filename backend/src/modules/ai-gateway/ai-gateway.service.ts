import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RedisService } from '../../common/services/redis.service'
import { BillingService } from '../billing/billing.service'
import { UsersService } from '../users/users.service'
import Anthropic from '@anthropic-ai/sdk'
import * as crypto from 'crypto'

export interface AIRequest {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  userId?: string
  context?: Record<string, unknown>
}

export interface AIResponse {
  content: string,
  tokens: {,
    input: number,
    output: number,
    total: number
  },
    cost: number,
  cached: boolean,
  cacheKey?: string
}

export interface UsageStats {
  totalActions: number,
  totalCost: number,
  currentMonth: {,
    actions: number,
    cost: number
  }

import { Logger } from '@nestjs/common'

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name)
  private readonly anthropic: Anthropic
  private readonly COST_PER_1K_INPUT_TOKENS = 0.003 // Claude Sonnet 4
  private readonly COST_PER_1K_OUTPUT_TOKENS = 0.015
  private readonly DEFAULT_MAX_TOKENS = 4096
  private readonly DEFAULT_TEMPERATURE = 0.7

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => BillingService))
    private readonly billingService: BillingService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY')
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required')
    }

    this.anthropic = new Anthropic({
      apiKey,
    })
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    try {
    try {
      // Check usage limits before processing
      if (request.userId) {
        const canUse = await this.billingService.incrementAIUsage(request.userId)
        if (!canUse) {
          throw new Error(
            'AI usage limit exceeded. Please upgrade your subscription or wait for the next billing period.',
          )
        }
  }
      }

      // Generate cache key for semantic deduplication
      const cacheKey = this.generateCacheKey(request)

      // Check cache first
      const cachedResponse = await this.getCachedResponse(cacheKey)
      if (cachedResponse) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`)
        return {
          ...cachedResponse,
          cached: true,
          cacheKey,
        }
      }

      // Make API call to Claude Sonnet 4
      const startTime = Date.now()
      const _response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: request.maxTokens || this.DEFAULT_MAX_TOKENS,
        temperature: request.temperature || this.DEFAULT_TEMPERATURE,
        system: request.systemPrompt || this.getDefaultSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      })

      const duration = Date.now() - startTime
      this.logger.debug(`Claude API call completed in ${duration}ms`)

      // Calculate costs
      const inputTokens = response.usage.input_tokens
      const outputTokens = response.usage.output_tokens
      const totalTokens = inputTokens + outputTokens
      const cost = this.calculateCost(inputTokens, outputTokens)

      const aiResponse: AIResponse = {,
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        tokens: {,
          input: inputTokens,
          output: outputTokens,
          total: totalTokens,
        },
        cost,
        cached: false,
        cacheKey,
      }

      // Cache the response for 48-72 hours as per CLAUDE.md
      await this.cacheResponse(cacheKey, aiResponse, 72 * 3600) // 72 hours

      // Track usage metrics in Redis for analytics
      if (request.userId) {
        await this.trackUsageMetrics(request.userId, cost, 1)
      },

      return aiResponse
    }
    } catch (error) {
      this.logger.error('Error generating AI response:', error)
      throw new Error(`AI Gateway error: ${error.message}`)
    }

  async generateEmbedding(text: string, userId?: string): Promise<number[]> {
    try {
      // Generate cache key for embedding
      const cacheKey = this.generateEmbeddingCacheKey(text)
  }

      // Check cache first (embeddings can be cached longer)
      const cachedEmbedding = await this.redisService.getAIResult(cacheKey)
      if (cachedEmbedding) {
        this.logger.debug(`Embedding cache hit`)
        return cachedEmbedding as number[]
      }

      // Note: Anthropic doesn't provide embeddings directly
      // This would typically use OpenAI's text-embedding-ada-002
      // For now, return a placeholder that matches pgvector dimension (1536)
      const embedding = new Array(1536).fill(0).map(() => Math.random() - 0.5)

      // Cache embedding for 7 days
      await this.redisService.setAIResult(cacheKey, embedding, 7 * 24 * 3600)

      if (userId) {
        await this.trackUsageMetrics(userId, 0.0001, 0) // Minimal cost for embeddings
      },

      return embedding
    }
    catch (error) {
      console.error('Error in ai-gateway.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error generating embedding:', error)
      throw new Error(`Embedding generation error: ${error.message}`)
    }

  async batchProcess(requests: AIRequest[]): Promise<AIResponse[]> {
    // Process requests in batches to optimize API usage
    const batchSize = 5
    const results: AIResponse[] = []
  }

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize)
      const batchPromises = batch.map(request => this.generateResponse(request))
      const batchResults = await Promise.allSettled(batchPromises)
    }

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          this.logger.error(`Batch request ${i + index} failed:`, result.reason)
          results.push({
            content: 'Error processing request',
            tokens: { input: 0, output: 0, total: 0 },
            cost: 0,
            cached: false,
          })
        })
    },

    return results
  }

  async getUserUsage(userId: string): Promise<UsageStats> {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const monthlyUsage = await this.redisService.getUsage(userId, currentMonth)
  }

    // Get total usage across all months (simplified - in production would query database)
    const totalUsage = (await this.redisService.getData<{ actions: number; cost: number }>(
      `total-usage:${userId}`,
    )) || {
      actions: 0,
      cost: 0,
    }

    return {
      totalActions: totalUsage.actions,
      totalCost: totalUsage.cost,
      currentMonth: {,
        actions: monthlyUsage.total || 0,
        cost: monthlyUsage.totalCost || 0,
      },
    }

  async checkUsageLimit(userId: string, subscriptionTier: string): Promise<boolean> {
    const usage = await this.getUserUsage(userId)
    const limits = this.getSubscriptionLimits(subscriptionTier)
  }

    return usage.currentMonth.actions < limits.monthlyActions
  }

  private generateCacheKey(request: AIRequest): string {
    // Create semantic hash for cache deduplication
    const content = `${request.systemPrompt || ''}|${request.prompt}|${request.maxTokens || this.DEFAULT_MAX_TOKENS}|${request.temperature || this.DEFAULT_TEMPERATURE}`
    return `ai-response:${crypto.createHash('sha256').update(content).digest('hex')}`
  }

  private generateEmbeddingCacheKey(text: string): string {
    return `embedding:${crypto.createHash('sha256').update(text).digest('hex')}`
  }

  private async getCachedResponse(cacheKey: string): Promise<AIResponse | null> {
    return await this.redisService.getAIResult(cacheKey)
  }

  private async cacheResponse(cacheKey: string, response: AIResponse, ttl: number): Promise<void> {
    await this.redisService.setAIResult(cacheKey, response, ttl)
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * this.COST_PER_1K_INPUT_TOKENS
    const outputCost = (outputTokens / 1000) * this.COST_PER_1K_OUTPUT_TOKENS
    return Math.round((inputCost + outputCost) * 10000) / 10000 // Round to 4 decimal places
  }

  private async trackUsageMetrics(userId: string, cost: number, actions: number): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    // Update monthly usage
    await this.redisService.incrementUsage(userId, 'ai-actions', currentMonth)

    // Update cost tracking
    const monthlyUsage = await this.redisService.getUsage(userId, currentMonth)
    monthlyUsage.totalCost = (monthlyUsage.totalCost || 0) + cost
    await this.redisService.setData(`usage:${userId}:${currentMonth}`, monthlyUsage, 30 * 24 * 3600)

    // Update total usage (simplified)
    const totalUsage = (await this.redisService.getData<{ actions: number; cost: number }>(
      `total-usage:${userId}`,
    )) || {
      actions: 0,
      cost: 0,
    }
    totalUsage.actions += actions
    totalUsage.cost += cost
    await this.redisService.setData(`total-usage:${userId}`, totalUsage, 365 * 24 * 3600)
  }

  private getDefaultSystemPrompt(): string {
    return `You are Aurelius, an AI Personal Assistant that acts as a "digital chief of staff." You embody "The Wise Advisor" persona - calm, insightful, and reassuring. 

Your role is to:
- Proactively manage tasks and workflows
- Provide intelligent analysis and suggestions
- Maintain perfect memory of user interactions
- Execute tasks with precision and care
- Communicate with wisdom and clarity

Always respond in a helpful, professional manner that reflects your role as a trusted advisor.`
  }

  private getSubscriptionLimits(tier: string): { monthlyActions: number } {
    switch (tier.toLowerCase()) {
      case 'pro':
        return { monthlyActions: 1000 }
      case 'max':
        return { monthlyActions: 3000 }
      case 'teams':
        return { monthlyActions: 2000 },
    }
    default:
        return { monthlyActions: 0 } // Free tier or unknown
    }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check with minimal token usage
      const _response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'ping',
          },
        ],
      }),
      return !!response
    }
    catch (error) {
      console.error('Error in ai-gateway.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('AI Gateway health check failed:', error),
      return false
    }

}