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

interface VectorMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  source?: string;
  category?: string;
  importance?: number;
  lastModified?: Date;
  [key: string]: string | number | boolean | string[] | Date | undefined;
}

interface VectorSearchResult {
  id: string;
  content: string;
  metadata: VectorMetadata;
  type: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  similarity?: number;
  distance?: number;
}

interface IndexSizeResult {
  size: string;
}

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);
  private readonly defaultDimensions = 1536; // OpenAI embeddings dimension
  private readonly defaultMetric = 'cosine';

  constructor(private prisma: PrismaService) {}

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
            connect: { id: doc.userId },
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
        error
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

      const promises = batch.map(async doc => {
        try {
          await this.indexDocument(doc);
          result.indexed++;
        } catch (error) {
          result.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors?.push({
            id: doc.id,
            error: errorMessage,
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
    options: VectorSearchOptions = {}
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

      const params: Array<string | number | boolean | Array<string | number>> = [
        `[${embedding.join(',')}]`,
        threshold,
      ];

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

      const results = await this.prisma.$queryRawUnsafe<VectorSearchResult[]>(query, ...params);

      return results.map(row => ({
        id: row.id,
        score: row.similarity !== undefined && row.similarity !== null ? row.similarity : 0,
        distance:
          options.includeDistance && row.similarity !== undefined && row.similarity !== null
            ? 1 - row.similarity
            : undefined,
        data: {
          content: row.content,
          metadata: row.metadata,
          type: row.type,
          userId: row.userId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Vector search failed: ${errorMessage}`);
      throw new BusinessException('Vector search failed', 'VECTOR_SEARCH_FAILED', undefined, error);
    }
  }

  /**
   * Find k-nearest neighbors
   */
  async findKNN(embedding: number[], k: number = 10, filters?: any): Promise<SearchResult[]> {
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

      const params: Array<string | number | boolean | Array<string | number>> = [
        `[${embedding.join(',')}]`,
      ];

      if (filters) {
        const filterClauses = this.buildPrismaFilters(filters, params);
        if (filterClauses) {
          query += ` WHERE ${filterClauses}`;
        }
      }

      query += ` ORDER BY embedding <-> $1::vector LIMIT $${params.length + 1}`;
      params.push(k);

      const results = await this.prisma.$queryRawUnsafe<VectorSearchResult[]>(query, ...params);

      return results.map(row => ({
        id: row.id,
        score: row.distance !== undefined && row.distance !== null ? 1 / (1 + row.distance) : 0, // Convert distance to similarity score
        distance: row.distance !== undefined && row.distance !== null ? row.distance : 0,
        data: {
          content: row.content,
          metadata: row.metadata,
          type: row.type,
          userId: row.userId,
        },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`KNN search failed: ${errorMessage}`);
      throw new BusinessException('KNN search failed', 'KNN_SEARCH_FAILED', undefined, error);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete document: ${errorMessage}`);
      throw new BusinessException(
        'Failed to delete document',
        'VECTOR_DELETE_FAILED',
        undefined,
        error
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete documents: ${errorMessage}`);
      throw new BusinessException(
        'Failed to delete documents',
        'VECTOR_BULK_DELETE_FAILED',
        undefined,
        error
      );
    }
  }

  /**
   * Create or update index
   */
  async createIndex(options: IndexOptions = {}): Promise<void> {
    try {
      // Validate and sanitize inputs
      const indexName = this.validateIndexName(options.indexName || 'vector_embedding_idx');
      const metric = this.validateMetric(options.metric || this.defaultMetric);
      const lists = this.validateLists(options.lists || 100);

      // Use parameterized query for safety
      // Note: Index names cannot be parameterized in PostgreSQL, so we validate strictly
      const indexQuery = `
        CREATE INDEX IF NOT EXISTS ${indexName} 
        ON "VectorEmbedding" 
        USING ivfflat (embedding ${metric})
        WITH (lists = ${lists})
      `;

      await this.prisma.$executeRawUnsafe(indexQuery);
      this.logger.log(`Created vector index: ${indexName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create index: ${errorMessage}`);
      throw new BusinessException(
        'Failed to create vector index',
        'VECTOR_INDEX_CREATE_FAILED',
        undefined,
        error
      );
    }
  }

  /**
   * Validate index name to prevent SQL injection
   */
  private validateIndexName(name: string): string {
    // Allow only alphanumeric, underscore, and must start with letter
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) || name.length > 63) {
      throw new BusinessException('Invalid index name format', 'INVALID_INDEX_NAME', undefined, {
        name,
      });
    }
    return name;
  }

  /**
   * Validate metric type
   */
  private validateMetric(metric: string): string {
    const allowedMetrics = {
      cosine: 'vector_cosine_ops',
      l2: 'vector_l2_ops',
      ip: 'vector_ip_ops',
    };

    const metricOps = allowedMetrics[metric as keyof typeof allowedMetrics];
    if (!metricOps) {
      throw new BusinessException('Invalid metric type', 'INVALID_METRIC', undefined, {
        metric,
        allowed: Object.keys(allowedMetrics),
      });
    }

    return metricOps;
  }

  /**
   * Validate lists parameter
   */
  private validateLists(lists: number): number {
    if (!Number.isInteger(lists) || lists < 1 || lists > 10000) {
      throw new BusinessException('Invalid lists parameter', 'INVALID_LISTS', undefined, {
        lists,
        allowed: '1-10000',
      });
    }
    return lists;
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
      const sizeResult = await this.prisma.$queryRawUnsafe<IndexSizeResult[]>(sizeQuery);

      return {
        totalDocuments: stats._count,
        avgEmbeddingSize: this.defaultDimensions,
        indexSize: sizeResult.length > 0 && sizeResult[0] ? sizeResult[0].size : '0 bytes',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get index stats: ${errorMessage}`);
      throw new BusinessException(
        'Failed to get index statistics',
        'VECTOR_STATS_FAILED',
        undefined,
        error
      );
    }
  }

  /**
   * Build filter clauses for raw SQL
   */
  private buildFilterClauses(
    filters: Array<{
      field: string;
      operator: string;
      value: string | number | boolean | string[];
    }>,
    params: Array<string | number | boolean | Array<string | number>>
  ): string {
    const clauses: string[] = [];

    // Define allowed fields to prevent SQL injection
    const allowedFields = [
      'id',
      'userId',
      'contentType',
      'createdAt',
      'updatedAt',
      'metadata',
      'type',
    ];

    // Define allowed operators
    const allowedOperators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains'];

    for (const filter of filters) {
      // Validate field name against whitelist
      if (!allowedFields.includes(filter.field)) {
        this.logger.warn(`Attempted to filter on disallowed field: ${filter.field}`);
        continue;
      }

      // Validate operator
      if (!allowedOperators.includes(filter.operator)) {
        this.logger.warn(`Attempted to use disallowed operator: ${filter.operator}`);
        continue;
      }

      const paramIndex = params.length + 1;
      const field = this.escapeIdentifier(filter.field);

      switch (filter.operator) {
        case 'eq':
          clauses.push(`${field} = $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'neq':
          clauses.push(`${field} != $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'gt':
          clauses.push(`${field} > $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'gte':
          clauses.push(`${field} >= $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'lt':
          clauses.push(`${field} < $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'lte':
          clauses.push(`${field} <= $${paramIndex}`);
          params.push(filter.value);
          break;
        case 'in':
          if (!Array.isArray(filter.value)) {
            this.logger.warn('IN operator requires array value');
            continue;
          }
          clauses.push(`${field} = ANY($${paramIndex})`);
          params.push(filter.value);
          break;
        case 'contains':
          if (typeof filter.value !== 'string') {
            this.logger.warn('CONTAINS operator requires string value');
            continue;
          }
          clauses.push(`${field}::text ILIKE $${paramIndex}`);
          params.push(`%${filter.value}%`);
          break;
      }
    }

    return clauses.join(' AND ');
  }

  /**
   * Build Prisma-compatible filters
   */
  private buildPrismaFilters(
    filters: Record<string, string | number | boolean>,
    params: Array<string | number | boolean | Array<string | number>>
  ): string | null {
    if (!filters || Object.keys(filters).length === 0) {
      return null;
    }

    const clauses: string[] = [];

    // Define allowed fields
    const allowedFields = [
      'id',
      'userId',
      'contentType',
      'createdAt',
      'updatedAt',
      'metadata',
      'type',
    ];

    Object.entries(filters).forEach(([field, value]) => {
      // Validate field name against whitelist
      if (!allowedFields.includes(field)) {
        this.logger.warn(`Attempted to filter on disallowed field: ${field}`);
        return;
      }

      const paramIndex = params.length + 1;
      const escapedField = this.escapeIdentifier(field);
      clauses.push(`${escapedField} = $${paramIndex}`);
      params.push(value);
    });

    return clauses.join(' AND ');
  }

  /**
   * Safely escape SQL identifiers
   */
  private escapeIdentifier(identifier: string): string {
    // Validate identifier contains only alphanumeric characters and underscores
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new BusinessException('Invalid identifier format', 'INVALID_IDENTIFIER', undefined, {
        identifier,
      });
    }

    // Double-quote the identifier for PostgreSQL
    return `"${identifier}"`;
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
  private getMetadata(metadata: VectorMetadata | undefined): VectorMetadata {
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
