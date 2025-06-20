import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';

interface EmbeddingRequest {
  text: string;
  contentType: 'email' | 'task' | 'document' | 'voice';
  contentId: string;
  userId: string;
  metadata?: Record<string, any>;
}

interface SemanticSearchRequest {
  query: string;
  userId: string;
  contentTypes?: string[];
  limit?: number;
  threshold?: number;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async createEmbedding(request: EmbeddingRequest): Promise<string> {
    try {
      // Generate content hash for deduplication
      const contentHash = this.generateContentHash(request.text);
      
      // Check if embedding already exists
      const existing = await this.prisma.vectorEmbedding.findUnique({
        where: {
          contentHash_userId: {
            contentHash,
            userId: request.userId,
          },
        },
      });

      if (existing) {
        this.logger.debug(`Embedding already exists for content hash: ${contentHash}`);
        return existing.id;
      }

      // Generate embedding (placeholder - would use OpenAI or similar)
      const embedding = await this.generateEmbeddingVector(request.text);
      
      // Set expiration time (90 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      // Store in database
      const vectorEmbedding = await this.prisma.vectorEmbedding.create({
        data: {
          userId: request.userId,
          contentType: request.contentType,
          contentId: request.contentId,
          contentHash,
          embedding: embedding as any, // Cast for Prisma
          metadata: request.metadata || {},
          expiresAt,
        },
      });

      this.logger.debug(
        `Created embedding ${vectorEmbedding.id} for user ${request.userId}`
      );

      return vectorEmbedding.id;
    } catch (error) {
      this.logger.error('Failed to create embedding', error);
      throw error;
    }
  }

  async semanticSearch(request: SemanticSearchRequest): Promise<any[]> {
    try {
      const cacheKey = this.generateSearchCacheKey(request);
      
      // Check cache first
      const cached = await this.cacheManager.get<any[]>(cacheKey);
      if (cached) {
        this.logger.debug('Semantic search cache hit');
        return cached;
      }

      // Generate query embedding
      const queryEmbedding = await this.generateEmbeddingVector(request.query);
      
      // TODO: Use queryEmbedding for proper vector similarity search
      // Perform similarity search (simplified - would use proper vector similarity)
      // This is a placeholder implementation
      const results = await this.prisma.vectorEmbedding.findMany({
        where: {
          userId: request.userId,
          contentType: request.contentTypes ? { in: request.contentTypes } : undefined,
          expiresAt: { gt: new Date() },
        },
        take: request.limit || 10,
        orderBy: { createdAt: 'desc' },
      });

      // Cache results for 1 hour
      await this.cacheManager.set(cacheKey, results, 3600);

      return results;
    } catch (error) {
      this.logger.error('Semantic search failed', error);
      return [];
    }
  }

  async findSimilarContent(
    contentId: string,
    userId: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      // Get the embedding for the reference content
      const referenceEmbedding = await this.prisma.vectorEmbedding.findFirst({
        where: { contentId, userId },
      });

      if (!referenceEmbedding) {
        return [];
      }

      // Find similar content (simplified implementation)
      const similar = await this.prisma.vectorEmbedding.findMany({
        where: {
          userId,
          id: { not: referenceEmbedding.id },
          expiresAt: { gt: new Date() },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return similar;
    } catch (error) {
      this.logger.error('Failed to find similar content', error);
      return [];
    }
  }

  async deleteEmbedding(contentId: string, userId: string): Promise<void> {
    try {
      await this.prisma.vectorEmbedding.deleteMany({
        where: { contentId, userId },
      });
      
      this.logger.debug(`Deleted embeddings for content ${contentId}`);
    } catch (error) {
      this.logger.error('Failed to delete embedding', error);
    }
  }

  async cleanupExpiredEmbeddings(): Promise<number> {
    try {
      const result = await this.prisma.vectorEmbedding.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired embeddings`);
      }

      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup expired embeddings', error);
      return 0;
    }
  }

  private async generateEmbeddingVector(text: string): Promise<number[]> {
    // Placeholder implementation - would use OpenAI embeddings API
    // For now, return a dummy 1536-dimensional vector
    const dimensions = 1536;
    const vector = Array.from({ length: dimensions }, () => Math.random() - 0.5);
    
    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  private generateContentHash(text: string): string {
    return createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
  }

  private generateSearchCacheKey(request: SemanticSearchRequest): string {
    const keyData = {
      query: request.query,
      userId: request.userId,
      contentTypes: request.contentTypes,
      limit: request.limit,
      threshold: request.threshold,
    };
    
    const hash = createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex')
      .substring(0, 16);
    
    return `semantic-search:${hash}`;
  }

  async getEmbeddingStats(userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    oldestEmbedding: Date | null;
    newestEmbedding: Date | null;
  }> {
    try {
      const [total, byType, oldest, newest] = await Promise.all([
        this.prisma.vectorEmbedding.count({
          where: { userId, expiresAt: { gt: new Date() } },
        }),
        
        this.prisma.vectorEmbedding.groupBy({
          by: ['contentType'],
          where: { userId, expiresAt: { gt: new Date() } },
          _count: { contentType: true },
        }),
        
        this.prisma.vectorEmbedding.findFirst({
          where: { userId, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),
        
        this.prisma.vectorEmbedding.findFirst({
          where: { userId, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      const typeBreakdown = byType.reduce((acc, item) => {
        acc[item.contentType] = item._count.contentType;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        byType: typeBreakdown,
        oldestEmbedding: oldest?.createdAt || null,
        newestEmbedding: newest?.createdAt || null,
      };
    } catch (error) {
      this.logger.error('Failed to get embedding stats', error);
      return {
        total: 0,
        byType: {},
        oldestEmbedding: null,
        newestEmbedding: null,
      };
    }
  }
}