import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import OpenAI from 'openai';
import { AIServiceException } from '../../../common/exceptions/app.exception';

interface EmbeddingRequest {
  text: string;
  content: string; // Full content for storage
  contentType: 'email' | 'task' | 'document' | 'voice';
  contentId: string;
  userId: string;
  metadata?: Prisma.InputJsonValue;
  tags?: string[];
}

interface SemanticSearchRequest {
  query: string;
  userId: string;
  contentTypes?: string[];
  limit?: number;
  threshold?: number;
}

interface VectorEmbeddingWithScore {
  id: string;
  contentType: string;
  contentId: string;
  content: string;
  contentSummary: string | null;
  metadata: unknown;
  tags: string[];
  similarity: number;
  createdAt: Date;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly openai: OpenAI | null;
  private readonly embeddingModel = 'text-embedding-ada-002';
  private readonly embeddingDimensions = 1536;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI embeddings service initialized');
    } else {
      this.openai = null;
      this.logger.warn(
        'OpenAI API key not configured - embeddings will use fallback implementation'
      );
    }
  }

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

      // Generate embedding
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
          contentSummary:
            request.content.length > 1000 ? request.content.substring(0, 200) + '...' : null,
          embedding: embedding,
          metadata: request.metadata ?? Prisma.JsonNull,
          tags: request.tags || [],
          model: this.openai ? this.embeddingModel : 'fallback-hash-based',
          dimensions: this.embeddingDimensions,
          expiresAt,
        },
      });

      this.logger.debug(`Created embedding ${vectorEmbedding.id} for user ${request.userId}`);

      return vectorEmbedding.id;
    } catch (error) {
      this.logger.error('Failed to create embedding', error);
      throw new AIServiceException(
        `Failed to create embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async semanticSearch(request: SemanticSearchRequest): Promise<VectorEmbeddingWithScore[]> {
    try {
      const cacheKey = this.generateSearchCacheKey(request);

      // Check cache first
      const cached = await this.cacheManager.get<VectorEmbeddingWithScore[]>(cacheKey);
      if (cached) {
        this.logger.debug('Semantic search cache hit');
        return cached;
      }

      // Generate query embedding
      const queryEmbedding = await this.generateEmbeddingVector(request.query);

      // Fetch candidate embeddings
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
        const similarity = this.calculateSimilarity(
          queryEmbedding,
          embedding.embedding as number[]
        );
        return {
          id: embedding.id,
          contentType: embedding.contentType,
          contentId: embedding.contentId,
          content: embedding.content,
          contentSummary: embedding.contentSummary,
          metadata: embedding.metadata,
          tags: embedding.tags,
          similarity,
          createdAt: embedding.createdAt,
        };
      });

      // Filter by threshold and sort by similarity
      const threshold = request.threshold || 0.7;
      const results = scoredResults
        .filter(result => result.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, request.limit || 10);

      // Cache results for 1 hour
      await this.cacheManager.set(cacheKey, results, 3600);

      return results;
    } catch (error) {
      this.logger.error('Semantic search failed', error);
      throw new AIServiceException(
        `Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async findSimilarContent(
    contentId: string,
    userId: string,
    limit: number = 5
  ): Promise<VectorEmbeddingWithScore[]> {
    try {
      // Get the embedding for the reference content
      const referenceEmbedding = await this.prisma.vectorEmbedding.findFirst({
        where: { contentId, userId },
      });

      if (!referenceEmbedding) {
        return [];
      }

      // Find similar content
      const candidates = await this.prisma.vectorEmbedding.findMany({
        where: {
          userId,
          id: { not: referenceEmbedding.id },
          contentType: referenceEmbedding.contentType,
          expiresAt: { gt: new Date() },
        },
        take: limit * 3, // Get more candidates
        orderBy: { createdAt: 'desc' },
      });

      // Calculate similarity and return top results
      const scoredResults = candidates.map(embedding => {
        const similarity = this.calculateSimilarity(
          referenceEmbedding.embedding as number[],
          embedding.embedding as number[]
        );
        return {
          id: embedding.id,
          contentType: embedding.contentType,
          contentId: embedding.contentId,
          content: embedding.content,
          contentSummary: embedding.contentSummary,
          metadata: embedding.metadata,
          tags: embedding.tags,
          similarity,
          createdAt: embedding.createdAt,
        };
      });

      return scoredResults
        .filter(result => result.similarity >= 0.8) // Higher threshold for similar content
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
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
      throw new AIServiceException(
        `Failed to delete embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
    // Use OpenAI if available
    if (this.openai) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: text.trim(),
        });

        return response.data[0].embedding;
      } catch (error) {
        this.logger.error('OpenAI embedding generation failed, using fallback', error);
        // Fall through to fallback implementation
      }
    }

    // Fallback implementation - generates deterministic vector based on text content
    const dimensions = this.embeddingDimensions;
    const hash = this.generateContentHash(text);

    // Generate deterministic vector from hash
    const vector = Array.from({ length: dimensions }, (_, i) => {
      const byte = parseInt(
        hash.slice((i * 2) % hash.length, (i * 2 + 2) % hash.length) || '00',
        16
      );
      return byte / 255.0 - 0.5; // Normalize to [-0.5, 0.5]
    });

    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    // Cosine similarity calculation
    if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator > 0 ? dotProduct / denominator : 0;
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

      const typeBreakdown = byType.reduce(
        (acc: Record<string, number>, item) => {
          acc[item.contentType] = item._count.contentType;
          return acc;
        },
        {} as Record<string, number>
      );

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

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      // Fallback for batch embeddings
      return Promise.all(texts.map(text => this.generateEmbeddingVector(text)));
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: texts.map(t => t.trim()),
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      this.logger.error('OpenAI batch embedding generation failed', error);
      throw new AIServiceException(
        `Failed to generate batch embeddings: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}
