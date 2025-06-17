/**
 * AI Gateway type definitions for Aurelius
 * Claude Sonnet 4 integration as per CLAUDE.md
 */

export interface AIRequest {
  prompt: string
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  messages?: AIMessage[]
  stream?: boolean
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export interface AIResponse {
  content: string
  model: string
  usage: AIUsage
  metadata?: {
    requestId: string
    latency: number
    cached?: boolean
  }
}

export interface AIUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost?: number
}

export interface AIStreamResponse {
  chunk: string
  done: boolean
  usage?: AIUsage
}

export interface AISuggestion {
  id: string
  type: 'task' | 'email' | 'calendar' | 'general'
  title: string
  description: string
  confidence: number
  reasoning?: string
  actions: AIAction[]
  metadata?: Record<string, unknown>
}

export interface AIAction {
  type: string
  label: string
  data: Record<string, unknown>
  confidence: number
}

export interface AIAnalysisRequest {
  content: string
  analysisType: 'sentiment' | 'summary' | 'extraction' | 'classification'
  options?: Record<string, unknown>
}

export interface AIAnalysisResult {
  type: string
  result: unknown
  confidence: number
  metadata?: Record<string, unknown>
}

export interface EmbeddingRequest {
  text: string
  model?: string
}

export interface EmbeddingResponse {
  embedding: number[]
  model: string
  dimensions: number
}

// TASA Loop types (Trigger → Analysis → Suggestion → Action)
export interface TASATrigger {
  id: string
  type: 'email' | 'calendar' | 'task' | 'time' | 'manual'
  data: Record<string, unknown>
  timestamp: Date
  userId: string
}

export interface TASAAnalysis {
  triggerId: string
  insights: string[]
  patterns: Pattern[]
  recommendations: string[]
  confidence: number
}

export interface Pattern {
  type: string
  description: string
  frequency: number
  lastOccurrence: Date
}

export interface TASASuggestion {
  analysisId: string
  suggestions: AISuggestion[]
  priority: 'urgent' | 'high' | 'medium' | 'low'
  expiresAt?: Date
}

export interface TASAAction {
  suggestionId: string
  actionType: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  result?: unknown
  error?: string
  startedAt?: Date
  completedAt?: Date
}
