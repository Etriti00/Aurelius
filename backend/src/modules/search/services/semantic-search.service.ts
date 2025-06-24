import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VectorService } from './vector.service';
import { EmbeddingService } from './embedding.service';
import { CacheService } from '../../cache/services/cache.service';
import { SearchResult, VectorSearchOptions, SearchResponse, VectorDocument } from '../interfaces';
import { BusinessException } from '../../../common/exceptions';

interface SemanticSearchContext {
  userId?: string;
  type?: string;
  filters?: Record<string, any>;
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
    } catch (error: any) {
      this.logger.error(`Semantic search failed: ${error.message}`);
      throw new BusinessException(
        'Semantic search failed',
        'SEMANTIC_SEARCH_FAILED',
        undefined,
        error
      );
    }
  }

  /**
   * Index content for semantic search
   */
  async indexContent(
    id: string,
    content: string,
    metadata: Record<string, any> = {},
    userId?: string,
    type?: string
  ): Promise<void> {
    try {
      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Create vector document
      const document: VectorDocument = {
        id,
        content,
        embedding,
        metadata,
        userId,
        type,
      };

      // Index in vector store
      await this.vectorService.indexDocument(document);

      // Invalidate relevant caches
      await this.invalidateSearchCaches(userId, type);
    } catch (error: any) {
      this.logger.error(`Failed to index content: ${error.message}`);
      throw new BusinessException(
        'Failed to index content',
        'CONTENT_INDEX_FAILED',
        undefined,
        error
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
      metadata?: Record<string, any>;
      userId?: string;
      type?: string;
    }>
  ): Promise<void> {
    try {
      // Generate embeddings in batch
      const contents = documents.map(doc => doc.content);
      const embeddings = await this.embeddingService.generateBatchEmbeddings(contents);

      // Create vector documents
      const vectorDocs: VectorDocument[] = documents.map((doc, index) => ({
        id: doc.id,
        content: doc.content,
        embedding: embeddings[index],
        metadata: doc.metadata || {},
        userId: doc.userId,
        type: doc.type,
      }));

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
          await this.invalidateSearchCaches(userId!, type!);
        }
      }
    } catch (error: any) {
      this.logger.error(`Batch indexing failed: ${error.message}`);
      throw new BusinessException('Batch indexing failed', 'BATCH_INDEX_FAILED', undefined, error);
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
        filters: [{ field: 'id', operator: 'neq' as any, value: documentId }],
      });

      return results.filter(r => r.id !== documentId).slice(0, limit);
    } catch (error: any) {
      this.logger.error(`Find similar failed: ${error.message}`);
      throw new BusinessException(
        'Failed to find similar documents',
        'FIND_SIMILAR_FAILED',
        undefined,
        error
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
      limit: options.limit! * 2, // Get more results for merging
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

      const params: any[] = [query];

      // Add filters
      let filterQuery = searchQuery;
      if (options.filters && options.filters.length > 0) {
        const filterClauses = options.filters
          .map(filter => {
            params.push(filter.value);
            return `"${filter.field}" = $${params.length}`;
          })
          .join(' AND ');
        filterQuery += ` AND ${filterClauses}`;
      }

      filterQuery += ` ORDER BY rank DESC LIMIT $${params.length + 1}`;
      params.push(options.limit! * 2);

      const results = await this.prisma.$queryRawUnsafe<any[]>(filterQuery, ...params);

      return results.map(row => ({
        id: row.id,
        score: row.rank,
        data: {
          content: row.content,
          metadata: row.metadata,
          type: row.type,
          userId: row.userId,
        },
      }));
    } catch (error: any) {
      this.logger.error(`Keyword search failed: ${error.message}`);
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
      if (a.data.updatedAt && b.data.updatedAt) {
        const daysSinceA =
          (Date.now() - new Date(a.data.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        const daysSinceB =
          (Date.now() - new Date(b.data.updatedAt).getTime()) / (1000 * 60 * 60 * 24);

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
  private buildFilters(context: SemanticSearchContext): any[] {
    const filters: any[] = [];

    if (context.userId) {
      filters.push({
        field: 'userId',
        operator: 'eq',
        value: context.userId,
      });
    }

    if (context.type) {
      filters.push({
        field: 'type',
        operator: 'eq',
        value: context.type,
      });
    }

    if (context.filters) {
      Object.entries(context.filters).forEach(([field, value]) => {
        filters.push({
          field,
          operator: 'eq',
          value,
        });
      });
    }

    return filters;
  }

  /**
   * Get total count of documents matching filters
   */
  private async getTotalCount(filters: any[]): Promise<number> {
    const where: any = {};

    for (const filter of filters) {
      if (filter.operator === 'eq') {
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
}
