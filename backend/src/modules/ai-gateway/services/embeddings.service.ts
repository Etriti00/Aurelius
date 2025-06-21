import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';

interface EmbeddingRequest {
  text: string;
  content: string; // Full content for storage
  contentType: 'email' | 'task' | 'document' | 'voice';
  contentId: string;
  userId: string;
  metadata?: Record<string, any>;
  tags?: string[];
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
          content: request.content.substring(0, 1000), // Truncate for storage
          contentSummary: request.content.length > 1000 ? request.content.substring(0, 200) + '...' : null,
          embedding: embedding,
          metadata: request.metadata || {},
          tags: request.tags || [],
          model: 'text-embedding-placeholder',
          dimensions: embedding.length,
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
      
      // Use queryEmbedding for similarity search
      // This is a simplified implementation - in production would use proper vector similarity
      const allEmbeddings = await this.prisma.vectorEmbedding.findMany({
        where: {
          userId: request.userId,
          contentType: request.contentTypes ? { in: request.contentTypes } : undefined,
          expiresAt: { gt: new Date() },
        },
        take: 100, // Get more candidates for similarity scoring
        orderBy: { createdAt: 'desc' },
      });
      
      // Calculate similarity scores and sort by relevance
      const scoredResults = allEmbeddings.map(embedding => {
        // Simple cosine similarity approximation using the hash-based vector
        const similarity = this.calculateSimilarity(queryEmbedding, embedding.embedding as number[]);
        return { ...embedding, similarity };
      });
      
      // Sort by similarity and take top results
      const results = scoredResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, request.limit || 10);

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
    // Placeholder implementation - generates deterministic vector based on text content
    // In production, this would use OpenAI embeddings API
    const dimensions = 1536;
    const hash = this.generateContentHash(text);
    
    // Generate deterministic vector from hash
    const vector = Array.from({ length: dimensions }, (_, i) => {
      const byte = parseInt(hash.slice((i * 2) % hash.length, (i * 2 + 2) % hash.length) || '00', 16);
      return (byte / 255.0) - 0.5; // Normalize to [-0.5, 0.5]
    });
    
    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }
  
  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    // Simple cosine similarity calculation
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
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