import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VectorService } from './vector.service';
import { EmbeddingService } from './embedding.service';
import { CacheService } from '../../cache/services/cache.service';
import {
  SearchResult,
  VectorSearchOptions,
  SearchResponse,
  VectorDocument,
  SearchFilter,
  FilterOperator,
  SearchMetadata,
  MemoryContent,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';

interface SemanticSearchContext {
  userId?: string;
  type?: string;
  filters?: Record<string, string | number | boolean | Date | string[] | number[]>;
  includeMetadata?: boolean;
  rerank?: boolean;
}

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);
  private readonly defaultSearchLimit = 20;
  private readonly hybridSearchWeight = 0.7; // 70% semantic, 30% keyword

  constructor(
    private prisma: PrismaService,
    private vectorService: VectorService,
    private embeddingService: EmbeddingService,
    private cacheService: CacheService
  ) {}

  /**
   * Perform semantic search
   */
  async search(
    query: string,
    context: SemanticSearchContext = {},
    options: VectorSearchOptions = {}
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query, context, options);
      const cached = await this.cacheService.get<SearchResponse>(cacheKey);
      if (cached) {
        return { ...cached, took: Date.now() - startTime };
      }

      // Generate embedding for query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Build filters
      const filters = this.buildFilters(context);

      // Perform vector search
      const searchOptions: VectorSearchOptions = {
        ...options,
        limit: options.limit || this.defaultSearchLimit,
        filters,
        includeMetadata: context.includeMetadata,
      };

      let results: SearchResult[];

      if (options.useHybridSearch) {
        results = await this.hybridSearch(query, queryEmbedding, searchOptions);
      } else {
        results = await this.vectorService.searchSimilar(queryEmbedding, searchOptions);
      }

      // Rerank results if requested
      if (context.rerank && results.length > 0) {
        results = await this.rerankResults(results);
      }

      // Get total count
      const total = await this.getTotalCount(filters);

      const response: SearchResponse = {
        results,
        total,
        took: Date.now() - startTime,
      };

      // Cache the response
      await this.cacheService.set(cacheKey, response, 300); // 5 minutes

      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Semantic search failed: ${errorMessage}`);
      throw new BusinessException(
        'Semantic search failed',
        'SEMANTIC_SEARCH_FAILED',
        undefined,
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : {
              message: 'Unknown error occurred',
              error: String(error),
            }
      );
    }
  }

  /**
   * Index content for semantic search
   */
  async indexContent(
    id: string,
    content: string,
    metadata: Record<string, unknown> = {},
    userId?: string,
    type?: string
  ): Promise<void> {
    try {
      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Convert metadata to SearchMetadata format
      const searchMetadata: SearchMetadata = {
        contentType:
          (typeof metadata.contentType === 'string' ? metadata.contentType : type) || 'document',
        contentId: id,
        userId: userId || 'unknown',
        title: typeof metadata.title === 'string' ? metadata.title : undefined,
        description: typeof metadata.description === 'string' ? metadata.description : undefined,
        tags: Array.isArray(metadata.tags)
          ? (metadata.tags.filter(tag => typeof tag === 'string') as string[])
          : undefined,
        priority: typeof metadata.priority === 'string' ? metadata.priority : undefined,
        status: typeof metadata.status === 'string' ? metadata.status : undefined,
        createdAt: typeof metadata.createdAt === 'string' ? metadata.createdAt : undefined,
        updatedAt: typeof metadata.updatedAt === 'string' ? metadata.updatedAt : undefined,
        additionalData: Object.fromEntries(
          Object.entries(metadata)
            .filter(
              ([key]) =>
                ![
                  'contentType',
                  'contentId',
                  'userId',
                  'title',
                  'description',
                  'tags',
                  'priority',
                  'status',
                  'createdAt',
                  'updatedAt',
                ].includes(key)
            )
            .filter(
              ([, value]) =>
                typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            )
        ) as Record<string, string | number | boolean>,
      };

      // Create vector document
      const document: VectorDocument = {
        id,
        content,
        embedding,
        metadata: searchMetadata,
        userId,
        type,
      };

      // Index in vector store
      await this.vectorService.indexDocument(document);

      // Invalidate relevant caches
      await this.invalidateSearchCaches(userId, type);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to index content: ${errorMessage}`);
      throw new BusinessException(
        'Failed to index content',
        'CONTENT_INDEX_FAILED',
        undefined,
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : {
              message: 'Unknown error occurred',
              error: String(error),
            }
      );
    }
  }

  /**
   * Batch index multiple documents
   */
  async batchIndex(
    documents: Array<{
      id: string;
      content: string;
      metadata?: Record<string, unknown>;
      userId?: string;
      type?: string;
    }>
  ): Promise<void> {
    try {
      // Generate embeddings in batch
      const contents = documents.map(doc => doc.content);
      const embeddings = await this.embeddingService.generateBatchEmbeddings(contents);

      // Create vector documents with proper metadata conversion
      const vectorDocs: VectorDocument[] = documents.map((doc, index) => {
        const metadata = doc.metadata || {};
        const searchMetadata: SearchMetadata = {
          contentType:
            (typeof metadata.contentType === 'string' ? metadata.contentType : doc.type) ||
            'document',
          contentId: doc.id,
          userId: doc.userId || 'unknown',
          title: typeof metadata.title === 'string' ? metadata.title : undefined,
          description: typeof metadata.description === 'string' ? metadata.description : undefined,
          tags: Array.isArray(metadata.tags)
            ? (metadata.tags.filter(tag => typeof tag === 'string') as string[])
            : undefined,
          priority: typeof metadata.priority === 'string' ? metadata.priority : undefined,
          status: typeof metadata.status === 'string' ? metadata.status : undefined,
          createdAt: typeof metadata.createdAt === 'string' ? metadata.createdAt : undefined,
          updatedAt: typeof metadata.updatedAt === 'string' ? metadata.updatedAt : undefined,
          additionalData: Object.fromEntries(
            Object.entries(metadata)
              .filter(
                ([key]) =>
                  ![
                    'contentType',
                    'contentId',
                    'userId',
                    'title',
                    'description',
                    'tags',
                    'priority',
                    'status',
                    'createdAt',
                    'updatedAt',
                  ].includes(key)
              )
              .filter(
                ([, value]) =>
                  typeof value === 'string' ||
                  typeof value === 'number' ||
                  typeof value === 'boolean'
              )
          ) as Record<string, string | number | boolean>,
        };

        return {
          id: doc.id,
          content: doc.content,
          embedding: embeddings[index],
          metadata: searchMetadata,
          userId: doc.userId,
          type: doc.type,
        };
      });

      // Bulk index
      const result = await this.vectorService.bulkIndex(vectorDocs);

      if (result.failed > 0) {
        this.logger.warn(`Failed to index ${result.failed} documents`);
      }

      // Invalidate caches
      const uniqueUsers = [...new Set(documents.map(d => d.userId).filter(Boolean))];
      const uniqueTypes = [...new Set(documents.map(d => d.type).filter(Boolean))];

      for (const userId of uniqueUsers) {
        for (const type of uniqueTypes) {
          if (userId && type) {
            await this.invalidateSearchCaches(userId, type);
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Batch indexing failed: ${errorMessage}`);
      throw new BusinessException(
        'Batch indexing failed',
        'BATCH_INDEX_FAILED',
        undefined,
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : {
              message: 'Unknown error occurred',
              error: String(error),
            }
      );
    }
  }

  /**
   * Find similar documents
   */
  async findSimilar(documentId: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      // Get the document
      const document = await this.prisma.vectorEmbedding.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Search for similar documents
      const results = await this.vectorService.searchSimilar(document.embedding as number[], {
        limit: limit + 1, // +1 to exclude self
        filters: [{ field: 'id', operator: FilterOperator.NOT_EQUALS, value: documentId }],
      });

      return results.filter(r => r.id !== documentId).slice(0, limit);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Find similar failed: ${errorMessage}`);
      throw new BusinessException(
        'Failed to find similar documents',
        'FIND_SIMILAR_FAILED',
        undefined,
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : {
              message: 'Unknown error occurred',
              error: String(error),
            }
      );
    }
  }

  /**
   * Hybrid search combining vector and keyword search
   */
  private async hybridSearch(
    query: string,
    embedding: number[],
    options: VectorSearchOptions
  ): Promise<SearchResult[]> {
    // Perform vector search
    const vectorResults = await this.vectorService.searchSimilar(embedding, {
      ...options,
      limit: (options.limit || 10) * 2, // Get more results for merging
    });

    // Perform keyword search
    const keywordResults = await this.keywordSearch(query, options);

    // Merge and score results
    const mergedResults = this.mergeSearchResults(
      vectorResults,
      keywordResults,
      options.vectorWeight || this.hybridSearchWeight
    );

    return mergedResults.slice(0, options.limit || this.defaultSearchLimit);
  }

  /**
   * Keyword search using PostgreSQL full-text search
   */
  private async keywordSearch(
    query: string,
    options: VectorSearchOptions
  ): Promise<SearchResult[]> {
    try {
      const searchQuery = `
        SELECT 
          id,
          content,
          metadata,
          type,
          "userId",
          ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) as rank
        FROM "VectorEmbedding"
        WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
      `;

      const params: (string | number | boolean | Array<string | number>)[] = [query];

      // Add filters using safe method
      let filterQuery = searchQuery;
      if (options.filters && options.filters.length > 0) {
        const filterClauses = this.buildSafeFilterClauses(
          options.filters.map(filter => ({
            field: filter.field,
            operator: filter.operator.toString(),
            value: filter.value,
          })),
          params
        );
        if (filterClauses) {
          filterQuery += ` AND ${filterClauses}`;
        }
      }

      filterQuery += ` ORDER BY rank DESC LIMIT $${params.length + 1}`;
      params.push((options.limit || 10) * 2);

      const results = await this.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          content: string;
          metadata: Record<string, unknown>;
          type: string;
          userId: string;
          rank: number;
        }>
      >(filterQuery, ...params);

      return results.map(row => ({
        id: row.id,
        score: row.rank,
        data: {
          id: row.id,
          content: row.content,
          context: row.type,
          importance: 1,
          createdAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
        } as MemoryContent,
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Keyword search failed: ${errorMessage}`);
      return []; // Return empty array on error
    }
  }

  /**
   * Merge vector and keyword search results
   */
  private mergeSearchResults(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
    vectorWeight: number
  ): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();
    const keywordWeight = 1 - vectorWeight;

    // Add vector results
    for (const result of vectorResults) {
      resultMap.set(result.id, {
        ...result,
        score: result.score * vectorWeight,
      });
    }

    // Merge keyword results
    for (const result of keywordResults) {
      const existing = resultMap.get(result.id);
      if (existing) {
        existing.score += result.score * keywordWeight;
      } else {
        resultMap.set(result.id, {
          ...result,
          score: result.score * keywordWeight,
        });
      }
    }

    // Sort by combined score
    return Array.from(resultMap.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Rerank results using a more sophisticated model
   */
  private async rerankResults(results: SearchResult[]): Promise<SearchResult[]> {
    // In a production system, this would use a specialized reranking model
    // For now, we'll just ensure the most relevant results are at the top
    // based on additional factors like recency, user interaction, etc.

    return results.sort((a, b) => {
      // Prioritize by score
      let scoreA = a.score;
      let scoreB = b.score;

      // Boost recent content
      const aUpdatedAt = 'updatedAt' in a.data ? a.data.updatedAt : null;
      const bUpdatedAt = 'updatedAt' in b.data ? b.data.updatedAt : null;

      if (aUpdatedAt && bUpdatedAt) {
        const daysSinceA = (Date.now() - new Date(aUpdatedAt).getTime()) / (1000 * 60 * 60 * 24);
        const daysSinceB = (Date.now() - new Date(bUpdatedAt).getTime()) / (1000 * 60 * 60 * 24);

        // Boost recent content (within 7 days)
        if (daysSinceA < 7) scoreA *= 1.1;
        if (daysSinceB < 7) scoreB *= 1.1;
      }

      return scoreB - scoreA;
    });
  }

  /**
   * Build filters from context
   */
  private buildFilters(context: SemanticSearchContext): SearchFilter[] {
    const filters: SearchFilter[] = [];

    if (context.userId) {
      filters.push({
        field: 'userId',
        operator: FilterOperator.EQUALS,
        value: context.userId,
      });
    }

    if (context.type) {
      filters.push({
        field: 'type',
        operator: FilterOperator.EQUALS,
        value: context.type,
      });
    }

    if (context.filters) {
      Object.entries(context.filters).forEach(([field, value]) => {
        filters.push({
          field,
          operator: FilterOperator.EQUALS,
          value,
        });
      });
    }

    return filters;
  }

  /**
   * Get total count of documents matching filters
   */
  private async getTotalCount(filters: SearchFilter[]): Promise<number> {
    const where: Record<string, unknown> = {};

    for (const filter of filters) {
      if (filter.operator === FilterOperator.EQUALS && typeof filter.field === 'string') {
        where[filter.field] = filter.value;
      }
    }

    return this.prisma.vectorEmbedding.count({ where });
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(
    query: string,
    context: SemanticSearchContext,
    options: VectorSearchOptions
  ): string {
    const key = {
      query,
      userId: context.userId,
      type: context.type,
      filters: context.filters,
      limit: options.limit,
      offset: options.offset,
    };

    return `search:${JSON.stringify(key)}`;
  }

  /**
   * Invalidate search caches
   */
  private async invalidateSearchCaches(userId?: string, type?: string): Promise<void> {
    const patterns: string[] = ['search:*'];

    if (userId) {
      patterns.push(`search:*"userId":"${userId}"*`);
    }

    if (type) {
      patterns.push(`search:*"type":"${type}"*`);
    }

    // Delete matching cache keys
    for (const pattern of patterns) {
      await this.cacheService.delByPattern(pattern);
    }
  }

  /**
   * Build safe filter clauses for SQL queries
   */
  private buildSafeFilterClauses(
    filters: Array<{
      field: string;
      operator: string;
      value: string | number | boolean | Date | string[] | number[];
    }>,
    params: (string | number | boolean | Array<string | number>)[]
  ): string | null {
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
          params.push(filter.value instanceof Date ? filter.value.toISOString() : filter.value);
          break;
        case 'neq':
          clauses.push(`${field} != $${paramIndex}`);
          params.push(filter.value instanceof Date ? filter.value.toISOString() : filter.value);
          break;
        case 'gt':
          clauses.push(`${field} > $${paramIndex}`);
          params.push(filter.value instanceof Date ? filter.value.toISOString() : filter.value);
          break;
        case 'gte':
          clauses.push(`${field} >= $${paramIndex}`);
          params.push(filter.value instanceof Date ? filter.value.toISOString() : filter.value);
          break;
        case 'lt':
          clauses.push(`${field} < $${paramIndex}`);
          params.push(filter.value instanceof Date ? filter.value.toISOString() : filter.value);
          break;
        case 'lte':
          clauses.push(`${field} <= $${paramIndex}`);
          params.push(filter.value instanceof Date ? filter.value.toISOString() : filter.value);
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

    return clauses.length > 0 ? clauses.join(' AND ') : null;
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
}
