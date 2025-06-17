import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from './redis.service'
import { AiGatewayService } from '../../modules/ai-gateway/ai-gateway.service'
import { Prisma } from '@prisma/client'
import {
  VectorEmbedding,
  VectorSearchOptions,
  VectorSearchResult,
  VectorMetadata,
  EmbeddingDocument,
  SearchResult,
  EMBEDDING_DIMENSIONS,
} from '../types'
import * as crypto from 'crypto'

interface SimilaritySearchOptions {
  limit?: number
  threshold?: number
  entityTypes?: string[]
}

type PrismaVectorEmbedding = {
  id: string,
  userId: string
  entityType: string,
  entityId: string
  metadata: Prisma.JsonValue,
  content: string
  createdAt: Date,
  updatedAt: Date
}

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name)

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private aiGateway: AiGatewayService,
  ) {}

  async createEmbedding(document: EmbeddingDocument): Promise<VectorEmbedding> {
    try {
      // Generate embedding with AI Gateway
      const vector = await this.aiGateway.generateEmbedding(document.text)

      // Validate vector dimensions
      if (vector.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${vector.length}`,
        )
      }

      const metadata: VectorMetadata = {,
        entityType: document.entityType,
        entityId: document.entityId,
        userId: document.userId,
        source: 'claude-sonnet-4',
        version: 1,
        tags: [],
        contentHash: this.generateContentHash(document.text),
      }

      // Store in database using raw SQL for pgvector compatibility
      const embeddingId = this.generateEmbeddingId(document)
      await this.prisma.$executeRaw`
        INSERT INTO vector_embeddings (id, "userId", "entityType", "entityId", embedding, metadata, content, "createdAt", "updatedAt")
        VALUES (${embeddingId}, ${document.userId}, ${document.entityType}, ${document.entityId}, ${vector}::vector, ${JSON.stringify(metadata)}::jsonb, ${document.text}, NOW(), NOW())
      `

      // Retrieve the created record
      const embedding = await this.prisma.vectorEmbedding.findUnique({
        where: { id: embeddingId },
      })

      if (!embedding) {
        throw new Error('Failed to create embedding')
      }

      // Cache the embedding for quick retrieval
      await this.redis.setData(
        `embedding:${embedding.id}`,
        this.mapPrismaEmbedding(embedding),
        3600, // 1 hour cache
      )

      return this.mapPrismaEmbedding(embedding)
    } catch (error) {
      this.logger.error('Error creating embedding:', error)
      throw new Error(`Failed to create embedding: ${(error as Error).message}`)
    }
  }

  async updateEmbedding(
    embeddingId: string,
    document: EmbeddingDocument,
  ): Promise<VectorEmbedding> {
    try {
      // Generate new embedding
      const vector = await this.aiGateway.generateEmbedding(document.text)

      const metadata: VectorMetadata = {,
        entityType: document.entityType,
        entityId: document.entityId,
        userId: document.userId,
        source: 'claude-sonnet-4',
        version: 1,
        tags: [],
        contentHash: this.generateContentHash(document.text),
      }

      // Update using raw SQL for pgvector compatibility
      await this.prisma.$executeRaw`
        UPDATE vector_embeddings 
        SET embedding = ${vector}::vector, 
            metadata = ${JSON.stringify(metadata)}::jsonb, 
            content = ${document.text},
            "updatedAt" = NOW()
        WHERE id = ${embeddingId}
      `

      // Retrieve the updated record
      const embedding = await this.prisma.vectorEmbedding.findUnique({
        where: { id: embeddingId },
      })

      if (!embedding) {
        throw new Error('Embedding not found after update')
      }

      // Invalidate cache
      await this.redis.deleteData(`embedding:${embeddingId}`)

      return this.mapPrismaEmbedding(embedding)
    } catch (error) {
      this.logger.error('Error updating embedding:', error)
      throw new Error(`Failed to update embedding: ${(error as Error).message}`)
    }
  }

  async deleteEmbedding(embeddingId: string): Promise<void> {
    try {
      await this.prisma.vectorEmbedding.delete({
        where: { id: embeddingId },
      })

      // Remove from cache
      await this.redis.deleteData(`embedding:${embeddingId}`)

      this.logger.debug(`Deleted embedding: ${embeddingId}`)
    } catch (error) {
      this.logger.error('Error deleting embedding:', error)
      throw new Error(`Failed to delete embedding: ${(error as Error).message}`)
    }
  }

  async deleteEmbeddingsByEntity(
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<void> {
    try {
      const result = await this.prisma.vectorEmbedding.deleteMany({
        where: {
          entityType,
          entityId,
          userId,
        },
      })

      this.logger.debug(
        `Deleted ${result.count} embeddings for entity: ${entityType}:${entityId} (user: ${userId})`,
      )
    } catch (error) {
      this.logger.error('Error deleting embeddings by entity:', error)
      throw new Error(`Failed to delete embeddings: ${(error as Error).message}`)
    }
  }

  async searchSimilar(
    userId: string,
    queryText: string,
    options: VectorSearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    try {
      // Check cache first
      const cacheKey = `search:${userId}:${this.generateContentHash(queryText)}:${JSON.stringify(options)}`
      const cached = await this.redis.getData<VectorSearchResult[]>(cacheKey)
      if (cached) {
        return cached
      }

      // Generate query embedding
      const queryVector = await this.aiGateway.generateEmbedding(queryText)

      const limit = options.limit || 10
      const threshold = options.threshold || 0.5

      // Build filter conditions
      const whereConditions: string[] = [`userId = $1`]
      const params: unknown[] = [userId]
      let paramIndex = 2

      if (options.filter?.entityTypes && options.filter.entityTypes.length > 0) {
        whereConditions.push(`entityType = ANY($${paramIndex}::text[])`)
        params.push(options.filter.entityTypes)
        paramIndex++
      }

      if (options.filter?.dateRange) {
        whereConditions.push(`createdAt >= $${paramIndex}`)
        params.push(options.filter.dateRange.start)
        paramIndex++

        whereConditions.push(`createdAt <= $${paramIndex}`)
        params.push(options.filter.dateRange.end)
        paramIndex++
      }

      // Execute vector similarity search using pgvector
      const query = `
        SELECT 
          id,
          1 - (embedding <=> $${paramIndex}::vector) as score,
          metadata,
          content,
          entityType,
          entityId
        FROM "VectorEmbedding"
        WHERE ${whereConditions.join(' AND ')}
          AND 1 - (embedding <=> $${paramIndex}::vector) > $${paramIndex + 1}
        ORDER BY embedding <=> $${paramIndex}::vector
        LIMIT $${paramIndex + 2}
      `

      params.push(queryVector, threshold, limit)

      const results = await this.prisma.$queryRawUnsafe<
        Array<{
          id: string,
          score: number
          metadata: Prisma.JsonValue,
          content: string
          entityType: string,
          entityId: string
        }>
      >(query, ...params)

      const searchResults: VectorSearchResult[] = results.map(result => ({,
        id: result.id,
        score: result.score,
        metadata: result.metadata as unknown as VectorMetadata,
        highlight: this.generateHighlight(queryText, result.content),
        content: options.includeContent ? result.content : undefined,
        relatedEntities: [], // Could be populated with related data
      }))

      // Cache results for 5 minutes
      await this.redis.setData(cacheKey, searchResults, 300)

      return searchResults
    } catch (error) {
      this.logger.error('Error searching similar embeddings:', error)
      throw new Error(`Failed to perform semantic search: ${(error as Error).message}`)
    }
  }

  async findSimilarDocuments(documentId: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      // Get the document's embedding
      const document = await this.prisma.vectorEmbedding.findUnique({
        where: { id: documentId },
      })

      if (!document) {
        throw new Error('Document not found')
      }

      // Find similar documents using pgvector
      const results = await this.prisma.$queryRaw<
        Array<{
          id: string,
          score: number
          metadata: Prisma.JsonValue,
          content: string
          entityType: string,
          entityId: string
          userId: string
        }>
      >`
        SELECT 
          id,
          1 - (embedding <=> (SELECT embedding FROM vector_embeddings WHERE id = ${documentId})::vector) as score,
          metadata,
          content,
          entityType,
          entityId,
          userId
        FROM vector_embeddings
        WHERE id != ${documentId}
          AND "userId" = ${document.userId}
        ORDER BY embedding <=> (SELECT embedding FROM vector_embeddings WHERE id = ${documentId})::vector
        LIMIT ${limit}
      `

      return results.map(result => ({
        id: result.id,
        score: result.score,
        entityType: result.entityType,
        entityId: result.entityId,
        userId: result.userId,
        content: result.content,
        metadata: result.metadata as unknown as Record<string, unknown>,
      }))
    } catch (error) {
      this.logger.error('Error finding similar documents:', error)
      throw new Error(`Failed to find similar documents: ${(error as Error).message}`)
    }
  }

  async getEmbeddingsByEntity(
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<VectorEmbedding[]> {
    try {
      const embeddings = await this.prisma.vectorEmbedding.findMany({
        where: {
          entityType,
          entityId,
          userId,
        },
        orderBy: { createdAt: 'desc' },
      })

      this.logger.debug(
        `Retrieved ${embeddings.length} embeddings for ${entityType}:${entityId} (user: ${userId})`,
      )

      return embeddings.map(this.mapPrismaEmbedding.bind(this))
    } catch (error) {
      this.logger.error('Error getting embeddings by entity:', error)
      throw new Error(`Failed to get embeddings: ${(error as Error).message}`)
    }
  }

  async semanticSearch(
    userId: string,
    query: string,
    options: SimilaritySearchOptions = {},
  ): Promise<SearchResult[]> {
    try {
      // Use the more comprehensive searchSimilar method
      const searchOptions: VectorSearchOptions = {,
        limit: options.limit,
        threshold: options.threshold,
        filter: options.entityTypes ? { entityTypes: options.entityTypes } : undefined,
        includeContent: true,
      }

      const results = await this.searchSimilar(userId, query, searchOptions)

      return results.map(result => ({
        id: result.id,
        score: result.score,
        entityType: result.metadata.entityType,
        entityId: result.metadata.entityId,
        userId: result.metadata.userId,
        content: result.content,
        metadata: result.metadata as unknown as Record<string, unknown>,
      }))
    } catch (error) {
      this.logger.error('Error performing semantic search:', error)
      throw new Error(`Failed to perform semantic search: ${(error as Error).message}`)
    }
  }

  // Helper methods
  private generateEmbeddingId(document: EmbeddingDocument): string {
    const hash = crypto.createHash('sha256')
    hash.update(`${document.entityType}:${document.entityId}:${document.userId}`)
    return hash.digest('hex')
  }

  private generateContentHash(content: string): string {
    const hash = crypto.createHash('sha256')
    hash.update(content)
    return hash.digest('hex').substring(0, 16)
  }

  private mapPrismaEmbedding(embedding: PrismaVectorEmbedding): VectorEmbedding {
    return {
      id: embedding.id,
      vector: [], // Vector data not exposed through Prisma for Unsupported types
      metadata: embedding.metadata as unknown as VectorMetadata,
      timestamp: embedding.createdAt,
    }
  }

  private generateHighlight(query: string, content: string): string {
    // Simple highlight generation - finds query terms in content
    const queryTerms = query.toLowerCase().split(/\s+/)
    const contentLower = content.toLowerCase()
    const snippetLength = 150

    // Find the first occurrence of any query term
    let bestPosition = -1
    for (const term of queryTerms) {
      const position = contentLower.indexOf(term)
      if (position !== -1 && (bestPosition === -1 || position < bestPosition)) {
        bestPosition = position
      }
    }

    if (bestPosition === -1) {
      // No match found, return beginning of content
      return content.substring(0, snippetLength) + (content.length > snippetLength ? '...' : '')
    }

    // Extract snippet around the match
    const start = Math.max(0, bestPosition - 50)
    const end = Math.min(content.length, bestPosition + 100)
    let snippet = content.substring(start, end)

    if (start > 0) snippet = '...' + snippet
    if (end < content.length) snippet = snippet + '...'

    return snippet
  }

  // Statistics and monitoring
  async getEmbeddingStats(userId: string): Promise<{,
    total: number
    byType: Record<string, number>
    storageSize: bigint
  }> {
    try {
      const stats = await this.prisma.vectorEmbedding.groupBy({
        by: ['entityType'],
        where: { userId },
        _count: true,
      })

      const total = stats.reduce((sum, stat) => sum + stat._count, 0)
      const byType = stats.reduce(
        (acc, stat) => {
          acc[stat.entityType] = stat._count
          return acc
        },
        {} as Record<string, number>,
      )

      // Estimate storage size (rough approximation)
      const storageSize = BigInt(total) * BigInt(EMBEDDING_DIMENSIONS * 4 + 1000) // 4 bytes per float + metadata

      return { total, byType, storageSize }
    } catch (error) {
      this.logger.error('Error getting embedding stats:', error)
      throw new Error(`Failed to get embedding stats: ${(error as Error).message}`)
    }
  }
}
