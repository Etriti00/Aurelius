export interface SearchResult<T = any> {
  id: string;
  score: number;
  distance?: number;
  data: T;
  highlights?: string[];
  metadata?: Record<string, any>;
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
  value: any;
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
  metadata?: Record<string, any>;
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
    value: any;
    count: number;
  }>;
}

export interface SearchFacet {
  field: string;
  type: 'terms' | 'range' | 'date_range';
  size?: number;
  ranges?: Array<{
    from?: any;
    to?: any;
    key?: string;
  }>;
}

export interface SearchResponse<T = any> {
  results: SearchResult<T>[];
  total: number;
  took: number;
  facets?: Record<string, AggregationResult>;
  suggestions?: string[];
}
