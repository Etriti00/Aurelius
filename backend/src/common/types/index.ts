// Core type definitions for Aurelius backend
// Professional implementation without shortcuts

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimestampedEntity extends BaseEntity {
  deletedAt: Date | null;
}

export interface UserOwnedEntity extends BaseEntity {
  userId: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// API Response types
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Service method return types
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Configuration types
export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

// Metadata types
export type MetadataValue = string | number | boolean | Date | null;

export interface Metadata {
  [key: string]: MetadataValue | Metadata | MetadataValue[];
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface BusinessError {
  code: string;
  message: string;
  statusCode: number;
  details?: ValidationError[];
}

// Queue job types
export interface QueueJobData<T> {
  id: string;
  type: string;
  payload: T;
  userId?: string;
  metadata?: Metadata;
}

export interface QueueJobResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime: number;
}

// Export all types
export * from './auth.types';
export * from './task.types';
export * from './ai.types';
export * from './integration.types';
export * from './notification.types';
export * from './workflow.types';
export * from './voice.types';
