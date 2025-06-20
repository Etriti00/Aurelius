import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { OpenAIService } from '../../ai-gateway/services/openai.service';
import { CacheService } from '../../cache/services/cache.service';
import { BusinessException } from '../../../common/exceptions';
import * as crypto from 'crypto';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly embeddingDimensions = 1536;
  private readonly maxBatchSize = 100;
  private readonly cacheEnabled: boolean;
  private readonly cacheTTL = 86400; // 24 hours

  constructor(
    private configService: ConfigService,
    private openAIService: OpenAIService,
    private cacheService: CacheService,
  ) {
    this.cacheEnabled = this.configService.get<boolean>('EMBEDDING_CACHE_ENABLED', true);
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Check cache first
      if (this.cacheEnabled) {
        const cached = await this.getCachedEmbedding(text);
        if (cached) {
          return cached;
        }
      }

      // Preprocess text
      const processedText = this.preprocessText(text);

      // Generate embedding
      const embedding = await this.openAIService.generateEmbedding(processedText);

      // Validate embedding
      this.validateEmbedding(embedding);

      // Cache the result
      if (this.cacheEnabled) {
        await this.cacheEmbedding(text, embedding);
      }

      return embedding;
    } catch (error: any) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw new BusinessException(
        'Failed to generate embedding',
        'EMBEDDING_GENERATION_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (texts.length === 0) {
        return [];
      }

      // Split into batches if necessary
      const batches: string[][] = [];
      for (let i = 0; i < texts.length; i += this.maxBatchSize) {
        batches.push(texts.slice(i, i + this.maxBatchSize));
      }

      const allEmbeddings: number[][] = [];

      for (const batch of batches) {
        // Check cache for each text
        const uncachedTexts: string[] = [];
        const cachedEmbeddings: Map<number, number[]> = new Map();

        if (this.cacheEnabled) {
          for (let i = 0; i < batch.length; i++) {
            const cached = await this.getCachedEmbedding(batch[i]);
            if (cached) {
              cachedEmbeddings.set(i, cached);
            } else {
              uncachedTexts.push(batch[i]);
            }
          }
        } else {
          uncachedTexts.push(...batch);
        }

        // Generate embeddings for uncached texts
        let newEmbeddings: number[][] = [];
        if (uncachedTexts.length > 0) {
          const processedTexts = uncachedTexts.map(text => this.preprocessText(text));
          newEmbeddings = await this.openAIService.generateBatchEmbeddings(processedTexts);

          // Cache new embeddings
          if (this.cacheEnabled) {
            for (let i = 0; i < uncachedTexts.length; i++) {
              await this.cacheEmbedding(uncachedTexts[i], newEmbeddings[i]);
            }
          }
        }

        // Merge cached and new embeddings in correct order
        const batchEmbeddings: number[][] = [];
        let newEmbeddingIndex = 0;
        
        for (let i = 0; i < batch.length; i++) {
          if (cachedEmbeddings.has(i)) {
            batchEmbeddings.push(cachedEmbeddings.get(i)!);
          } else {
            batchEmbeddings.push(newEmbeddings[newEmbeddingIndex++]);
          }
        }

        allEmbeddings.push(...batchEmbeddings);
      }

      return allEmbeddings;
    } catch (error: any) {
      this.logger.error(`Failed to generate batch embeddings: ${error.message}`);
      throw new BusinessException(
        'Failed to generate batch embeddings',
        'BATCH_EMBEDDING_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Find most similar embeddings
   */
  findMostSimilar(
    targetEmbedding: number[],
    embeddings: Array<{ id: string; embedding: number[] }>,
    topK: number = 10,
  ): Array<{ id: string; similarity: number }> {
    const similarities = embeddings.map(item => ({
      id: item.id,
      similarity: this.calculateSimilarity(targetEmbedding, item.embedding),
    }));

    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, topK);
  }

  /**
   * Preprocess text for embedding
   */
  private preprocessText(text: string): string {
    // Remove excess whitespace
    let processed = text.trim().replace(/\s+/g, ' ');

    // Limit length to avoid token limits (approximately 8k tokens)
    const maxLength = 30000; // characters
    if (processed.length > maxLength) {
      processed = processed.substring(0, maxLength) + '...';
    }

    return processed;
  }

  /**
   * Validate embedding dimensions
   */
  private validateEmbedding(embedding: number[]): void {
    if (!Array.isArray(embedding)) {
      throw new Error('Embedding must be an array');
    }

    if (embedding.length !== this.embeddingDimensions) {
      throw new Error(
        `Invalid embedding dimensions: expected ${this.embeddingDimensions}, got ${embedding.length}`,
      );
    }

    // Check for NaN or infinite values
    for (const value of embedding) {
      if (!Number.isFinite(value)) {
        throw new Error('Embedding contains invalid values');
      }
    }
  }

  /**
   * Get cached embedding
   */
  private async getCachedEmbedding(text: string): Promise<number[] | null> {
    const key = this.getEmbeddingCacheKey(text);
    return this.cacheService.get<number[]>(key);
  }

  /**
   * Cache embedding
   */
  private async cacheEmbedding(text: string, embedding: number[]): Promise<void> {
    const key = this.getEmbeddingCacheKey(text);
    await this.cacheService.set(key, embedding, this.cacheTTL);
  }

  /**
   * Generate cache key for embedding
   */
  private getEmbeddingCacheKey(text: string): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    return `embedding:${hash}`;
  }

  /**
   * Analyze text characteristics for embedding optimization
   */
  async analyzeText(text: string): Promise<{
    length: number;
    tokenEstimate: number;
    language?: string;
    complexity?: number;
  }> {
    const length = text.length;
    // Rough estimate: 1 token ≈ 4 characters
    const tokenEstimate = Math.ceil(length / 4);

    return {
      length,
      tokenEstimate,
      // Language detection and complexity analysis could be added
    };
  }

  /**
   * Optimize embeddings by reducing dimensions (PCA-like)
   */
  reduceEmbeddingDimensions(
    embedding: number[],
    targetDimensions: number,
  ): number[] {
    if (targetDimensions >= embedding.length) {
      return embedding;
    }

    // Simple dimension reduction by taking evenly spaced elements
    // In production, use proper PCA or other dimension reduction techniques
    const step = embedding.length / targetDimensions;
    const reduced: number[] = [];

    for (let i = 0; i < targetDimensions; i++) {
      const index = Math.floor(i * step);
      reduced.push(embedding[index]);
    }

    return reduced;
  }
}