export interface AICacheEntry {
  key: string;
  prompt: string;
  response: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  metadata: {
    userId: string;
    requestType: string;
    temperature: number;
    maxTokens: number;
  };
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  lastAccessedAt: Date;
}

export interface SemanticCacheOptions {
  similarityThreshold: number;
  maxResults: number;
  includeMetadata: boolean;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalSavings: number;
  averageResponseTime: number;
  topCachedPrompts: {
    prompt: string;
    hitCount: number;
    savings: number;
  }[];
}
