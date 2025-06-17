/**
 * Database type definitions for Aurelius
 * Following Prisma patterns with type safety
 */

import { Prisma } from '@prisma/client'

export type DatabaseTransaction = Prisma.TransactionClient

export interface PaginationOptions {
  page: number,
  limit: number
  orderBy?: Record<string, 'asc' | 'desc'>
}

export interface PaginatedResult<T> {
  data: T[],
  pagination: {
    page: number,
    limit: number
    total: number,
    totalPages: number
    hasNext: boolean,
    hasPrevious: boolean
  }
}

export interface DatabaseError extends Error {
  code: string
  constraint?: string
  detail?: string
  table?: string
  column?: string
}

export type QueryOptions<T> = {
  where?: Partial<T>
  include?: Record<string, boolean | object>
  orderBy?: Record<string, 'asc' | 'desc'>
  skip?: number
  take?: number
  select?: Record<string, boolean>
}

export interface BatchOperationResult {
  success: number,
  failed: number
  errors: Array<{,
    item: unknown
    error: string
  }>
}

export interface SoftDeleteOptions {
  deletedAt: Date
  deletedBy?: string
  reason?: string
}

// Prisma-specific types
export type PrismaModel = keyof Omit<
  Prisma.TypeMap['meta']['modelProps'],
  'VectorEmbedding' | '_prisma'
>

export interface AuditLog {
  id: string,
  userId: string
  action: 'create' | 'update' | 'delete' | 'read',
  entityType: string
  entityId: string
  changes?: Record<string, unknown>
  metadata?: Record<string, unknown>
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}
