// Basic search metadata structure
export interface SearchMetadata {
  contentType: string;
  contentId: string;
  userId: string;
  title?: string;
  description?: string;
  tags?: string[];
  priority?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  additionalData?: Record<string, string | number | boolean>;
}

// Generic search result with proper typing
export interface SearchResult<T = SearchableContent> {
  id: string;
  score: number;
  distance?: number;
  data: T;
  highlights?: string[];
  metadata?: SearchMetadata;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  threshold?: number;
  includeMetadata?: boolean;
  includeDistance?: boolean;
  filters?: SearchFilter[];
  sortBy?: SortOption[];
}

export interface SearchFilter {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | Date | string[] | number[];
}

export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  IN = 'in',
  NOT_IN = 'nin',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface VectorDocument {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: SearchMetadata;
  userId?: string;
  type?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VectorSearchOptions extends SearchOptions {
  useHybridSearch?: boolean;
  textWeight?: number;
  vectorWeight?: number;
  reranking?: boolean;
}

export interface IndexOptions {
  indexName?: string;
  dimensions?: number;
  metric?: 'euclidean' | 'cosine' | 'inner_product';
  lists?: number;
  probes?: number;
}

export interface SearchIndex {
  name: string;
  dimensions: number;
  metric: string;
  documentsCount: number;
  createdAt: Date;
  lastUpdated: Date;
}

export interface BulkIndexResult {
  indexed: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

export interface SearchQuery {
  query: string;
  type?: 'text' | 'vector' | 'hybrid';
  options?: SearchOptions;
}

export interface AggregationResult {
  field: string;
  values: Array<{
    value: string | number | boolean;
    count: number;
  }>;
}

export interface SearchFacet {
  field: string;
  type: 'terms' | 'range' | 'date_range';
  size?: number;
  ranges?: Array<{
    from?: string | number | Date;
    to?: string | number | Date;
    key?: string;
  }>;
}

export interface SearchResponse<T = SearchableContent> {
  results: SearchResult<T>[];
  total: number;
  took: number;
  facets?: Record<string, AggregationResult>;
  suggestions?: string[];
}

// Searchable content types based on Prisma models
export interface TaskContent {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailContent {
  id: string;
  subject: string;
  content: string;
  sender: string;
  recipients: string[];
  receivedAt: string;
  isRead: boolean;
}

export interface CalendarEventContent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  location?: string;
}

export interface NoteContent {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FileContent {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
}

export interface ContactContent {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

export interface MemoryContent {
  id: string;
  content: string;
  context: string;
  importance: number;
  createdAt: string;
  lastAccessedAt: string;
}

// Union type for all searchable content
export type SearchableContent =
  | TaskContent
  | EmailContent
  | CalendarEventContent
  | NoteContent
  | FileContent
  | ContactContent
  | MemoryContent;
