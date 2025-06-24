// AI and machine learning type definitions
// Professional implementation without shortcuts

export interface AIPromptContext {
  userId: string;
  conversationId?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model: AIModel;
}

export enum AIModel {
  CLAUDE_SONNET = 'claude-3-sonnet-20240229',
  CLAUDE_OPUS = 'claude-3-opus-20240229',
  GPT4 = 'gpt-4',
  GPT35_TURBO = 'gpt-3.5-turbo',
}

export interface AIResponse {
  id: string;
  content: string;
  model: AIModel;
  usage: TokenUsage;
  cached: boolean;
  processingTime: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface SemanticSearchRequest {
  query: string;
  contentType?: string;
  userId?: string;
  limit?: number;
  threshold?: number;
}

export interface SemanticSearchResult {
  id: string;
  content: string;
  contentType: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface AIUsageTracking {
  userId: string;
  action: string;
  model: AIModel;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  duration: number;
  cached: boolean;
  success: boolean;
  error?: string;
}

export interface AIQuota {
  userId: string;
  tier: SubscriptionTier;
  monthlyLimit: number;
  used: number;
  remaining: number;
  resetDate: Date;
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  MAX = 'MAX',
  TEAMS = 'TEAMS',
  ENTERPRISE = 'ENTERPRISE',
}

export interface AISuggestionContext {
  taskHistory: Array<{
    title: string;
    completed: boolean;
    completionTime?: number;
  }>;
  userPreferences: {
    workingHours: string[];
    preferredTaskDuration: number;
    focusAreas: string[];
  };
  currentContext: {
    timeOfDay: string;
    dayOfWeek: string;
    upcomingEvents: number;
    currentWorkload: number;
  };
}
