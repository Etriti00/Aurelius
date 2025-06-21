import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  VectorDocument,
  SearchResult,
  VectorSearchOptions,
  IndexOptions,
  BulkIndexResult,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);
  private readonly defaultDimensions = 1536; // OpenAI embeddings dimension
  private readonly defaultMetric = 'cosine';

  constructor(
    private prisma: PrismaService,
  ) {}

  /**
   * Store a vector document
   */
  async indexDocument(doc: VectorDocument): Promise<void> {
    try {
      if (!doc.embedding || doc.embedding.length === 0) {
        throw new Error('Document must have embeddings');
      }

      await this.prisma.vectorEmbedding.upsert({
        where: { id: doc.id },
        update: {
          content: doc.content,
          embedding: doc.embedding,
          metadata: this.getMetadata(doc.metadata),
          contentType: this.getContentType(doc.type),
          lastAccessedAt: new Date(),
        },
        create: {
          id: doc.id,
          content: doc.content,
          embedding: doc.embedding,
          metadata: this.getMetadata(doc.metadata),
          contentType: this.getContentType(doc.type),
          contentId: doc.id,
          contentHash: this.generateContentHash(doc.content),
          model: 'text-embedding-3-small',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          user: {
            connect: { id: doc.userId }
          },
        },
      });

      this.logger.debug(`Indexed document ${doc.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to index document: ${errorMessage}`);
      throw new BusinessException(
        'Failed to index document',
        'VECTOR_INDEX_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(documents: VectorDocument[]): Promise<BulkIndexResult> {
    const result: BulkIndexResult = {
      indexed: 0,
      failed: 0,
      errors: [],
    };

    // Process in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      const promises = batch.map(async (doc) => {
        try {
          await this.indexDocument(doc);
          result.indexed++;
        } catch (error: any) {
          result.failed++;
          result.errors?.push({
            id: doc.id,
            error: error.message,
          });
        }
      });

      await Promise.all(promises);
    }

    this.logger.log(`Bulk indexed: ${result.indexed} success, ${result.failed} failed`);
    return result;
  }

  /**
   * Search for similar vectors
   */
  async searchSimilar(
    embedding: number[],
    options: VectorSearchOptions = {},
  ): Promise<SearchResult[]> {
    try {
      const limit = options.limit || 10;
      const threshold = options.threshold || 0.7;

      // Build the base query
      let query = `
        SELECT 
          id,
          content,
          metadata,
          type,
          "userId",
          "createdAt",
          "updatedAt",
          1 - (embedding <=> $1::vector) as similarity
        FROM "VectorEmbedding"
        WHERE 1 - (embedding <=> $1::vector) > $2
      `;

      const params: any[] = [`[${embedding.join(',')}]`, threshold];

      // Add filters
      if (options.filters && options.filters.length > 0) {
        const filterClauses = this.buildFilterClauses(options.filters, params);
        query += ` AND ${filterClauses}`;
      }

      // Add sorting
      query += ' ORDER BY similarity DESC';

      // Add limit and offset
      query += ` LIMIT $${params.length + 1}`;
      params.push(limit);

      if (options.offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }

      const results = await this.prisma.$queryRawUnsafe<any[]>(query, ...params);

      return results.map(row => ({
        id: row.id,
        score: row.similarity,
        distance: options.includeDistance ? 1 - row.similarity : undefined,
        data: {
          content: row.content,
          metadata: row.metadata,
          type: row.type,
          userId: row.userId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      }));
    } catch (error: any) {
      this.logger.error(`Vector search failed: ${error.message}`);
      throw new BusinessException(
        'Vector search failed',
        'VECTOR_SEARCH_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Find k-nearest neighbors
   */
  async findKNN(
    embedding: number[],
    k: number = 10,
    filters?: any,
  ): Promise<SearchResult[]> {
    try {
      let query = `
        SELECT 
          id,
          content,
          metadata,
          type,
          "userId",
          embedding <-> $1::vector as distance
        FROM "VectorEmbedding"
      `;

      const params: any[] = [`[${embedding.join(',')}]`];

      if (filters) {
        const filterClauses = this.buildPrismaFilters(filters, params);
        if (filterClauses) {
          query += ` WHERE ${filterClauses}`;
        }
      }

      query += ` ORDER BY embedding <-> $1::vector LIMIT $${params.length + 1}`;
      params.push(k);

      const results = await this.prisma.$queryRawUnsafe<any[]>(query, ...params);

      return results.map(row => ({
        id: row.id,
        score: 1 / (1 + row.distance), // Convert distance to similarity score
        distance: row.distance,
        data: {
          content: row.content,
          metadata: row.metadata,
          type: row.type,
          userId: row.userId,
        },
      }));
    } catch (error: any) {
      this.logger.error(`KNN search failed: ${error.message}`);
      throw new BusinessException(
        'KNN search failed',
        'KNN_SEARCH_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Delete a vector document
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await this.prisma.vectorEmbedding.delete({
        where: { id },
      });
    } catch (error: any) {
      this.logger.error(`Failed to delete document: ${error.message}`);
      throw new BusinessException(
        'Failed to delete document',
        'VECTOR_DELETE_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Delete documents by filter
   */
  async deleteByFilter(filter: any): Promise<number> {
    try {
      const result = await this.prisma.vectorEmbedding.deleteMany({
        where: filter,
      });
      return result.count;
    } catch (error: any) {
      this.logger.error(`Failed to delete documents: ${error.message}`);
      throw new BusinessException(
        'Failed to delete documents',
        'VECTOR_BULK_DELETE_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Create or update index
   */
  async createIndex(options: IndexOptions = {}): Promise<void> {
    try {
      const indexName = options.indexName || 'vector_embedding_idx';
      const metric = options.metric || this.defaultMetric;
      const lists = options.lists || 100;

      // Create IVFFlat index for better performance
      const indexQuery = `
        CREATE INDEX IF NOT EXISTS ${indexName} 
        ON "VectorEmbedding" 
        USING ivfflat (embedding vector_${metric}_ops)
        WITH (lists = ${lists})
      `;

      await this.prisma.$executeRawUnsafe(indexQuery);
      this.logger.log(`Created vector index: ${indexName}`);
    } catch (error: any) {
      this.logger.error(`Failed to create index: ${error.message}`);
      throw new BusinessException(
        'Failed to create vector index',
        'VECTOR_INDEX_CREATE_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<{
    totalDocuments: number;
    avgEmbeddingSize: number;
    indexSize: string;
  }> {
    try {
      const stats = await this.prisma.vectorEmbedding.aggregate({
        _count: true,
      });

      // Get index size
      const sizeQuery = `
        SELECT pg_size_pretty(pg_relation_size('vector_embedding_idx')) as size
      `;
      const sizeResult = await this.prisma.$queryRawUnsafe<any[]>(sizeQuery);

      return {
        totalDocuments: stats._count,
        avgEmbeddingSize: this.defaultDimensions,
        indexSize: sizeResult[0]?.size || '0 bytes',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get index stats: ${error.message}`);
      throw new BusinessException(
        'Failed to get index statistics',
        'VECTOR_STATS_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Build filter clauses for raw SQL
   */
  private buildFilterClauses(filters: any[], params: any[]): string {
    const clauses: string[] = [];

    for (const filter of filters) {
      const paramIndex = params.length + 1;
      
      switch (filter.operator) {
        case 'eq':
          clauses.push(`"${filter.field}" = $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'neq':
          clauses.push(`"${filter.field}" != $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'gt':
          clauses.push(`"${filter.field}" > $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'gte':
          clauses.push(`"${filter.field}" >= $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'lt':
          clauses.push(`"${filter.field}" < $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'lte':
          clauses.push(`"${filter.field}" <= $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'in':
          clauses.push(`"${filter.field}" = ANY($${paramIndex})`);
          params.push(filter.value);
          break;
        case 'contains':
          clauses.push(`"${filter.field}"::text ILIKE $${paramIndex}`);
          params.push(`%${filter.value}%`);
          break;
      }
    }

    return clauses.join(' AND ');
  }

  /**
   * Build Prisma-compatible filters
   */
  private buildPrismaFilters(filters: any, params: any[]): string | null {
    if (!filters || Object.keys(filters).length === 0) {
      return null;
    }

    const clauses: string[] = [];
    
    Object.entries(filters).forEach(([field, value]) => {
      const paramIndex = params.length + 1;
      clauses.push(`"${field}" = $${paramIndex}`);
      params.push(value);
    });

    return clauses.join(' AND ');
  }

  /**
   * Generate content hash for deduplication
   */
  private generateContentHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get metadata safely
   */
  private getMetadata(metadata: Record<string, any> | undefined): Record<string, any> {
    if (metadata) {
      return metadata;
    }
    return {};
  }

  /**
   * Get content type safely
   */
  private getContentType(type: string | undefined): string {
    if (type) {
      return type;
    }
    return 'document';
  }
}