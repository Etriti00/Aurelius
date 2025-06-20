export interface AIModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai';
  contextWindow: number;
  maxTokens: number;
  costPer1kTokens: number;
  temperature: number;
  enabled: boolean;
}

export interface AIModelUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: AIModelUsage;
  cached: boolean;
  requestId: string;
  processingTime: number;
}

export interface AIStreamResponse {
  stream: AsyncIterable<string>;
  model: string;
  requestId: string;
}