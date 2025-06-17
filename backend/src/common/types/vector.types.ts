/**
 * Vector/Embedding type definitions for Aurelius
 * Supporting semantic search with pgvector as per CLAUDE.md
 */

export interface VectorEmbedding {
  id: string
  vector: number[]
  metadata: VectorMetadata
  timestamp: Date
}

export interface VectorMetadata extends Record<string, unknown> {
  entityType: 'task' | 'email' | 'calendar' | 'note' | 'document'
  entityId: string
  userId: string
  source?: string
  version?: number
  tags?: string[]
  integrationId?: string
  contentHash?: string
}

export interface VectorSearchOptions {
  limit?: number
  threshold?: number
  filter?: VectorFilter
  includeMetadata?: boolean
  includeContent?: boolean
}

export interface VectorFilter {
  entityTypes?: Array<'task' | 'email' | 'calendar' | 'note' | 'document'>
  userIds?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
  integrationIds?: string[]
}

export interface VectorSearchResult {
  id: string
  score: number
  metadata: VectorMetadata
  highlight?: string
  content?: string
  relatedEntities?: RelatedEntity[]
}

export interface RelatedEntity {
  id: string
  type: string
  title: string
  relevanceScore: number
}

export interface EmbeddingDocument {
  id: string
  text: string
  metadata: Record<string, unknown>
  entityType: 'task' | 'email' | 'calendar' | 'note'
  entityId: string
  userId: string
}

export interface SearchResult {
  id: string
  score: number
  entityType: string
  entityId: string
  userId: string
  content?: string
  metadata?: Record<string, unknown>
}

// Claude Sonnet 4 embedding dimensions
export const EMBEDDING_DIMENSIONS = 1536

export interface EmbeddingGenerationOptions {
  model?: string
  maxTokens?: number
  truncate?: boolean
}
