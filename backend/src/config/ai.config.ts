import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  // Anthropic Claude Configuration
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet',
    maxRetries: parseInt(process.env.ANTHROPIC_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '60000', 10),
    organizationId: process.env.ANTHROPIC_ORG_ID,
  },
  
  // Model Configuration
  models: {
    'claude-3-haiku': {
      maxTokens: 4096,
      temperature: 0.3,
      costPer1kTokens: 0.00025, // $0.25 per million
      contextWindow: 200000,
      enabled: true,
    },
    'claude-3-5-sonnet': {
      maxTokens: 4096,
      temperature: 0.7,
      costPer1kTokens: 0.003, // $3 per million
      contextWindow: 200000,
      enabled: true,
    },
    'claude-3-opus': {
      maxTokens: 4096,
      temperature: 0.7,
      costPer1kTokens: 0.015, // $15 per million
      contextWindow: 200000,
      enabled: process.env.ENABLE_OPUS === 'true',
    },
  },
  
  // AI Cost Optimization
  costOptimization: {
    cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.AI_CACHE_TTL || '172800', 10), // 48 hours
    semanticCacheSimilarityThreshold: parseFloat(process.env.AI_SEMANTIC_THRESHOLD || '0.95'),
    batchingEnabled: process.env.AI_BATCHING_ENABLED !== 'false',
    batchingWindowMs: parseInt(process.env.AI_BATCH_WINDOW || '100', 10),
    maxBatchSize: parseInt(process.env.AI_MAX_BATCH_SIZE || '10', 10),
  },
  
  // Embeddings Configuration
  embeddings: {
    provider: process.env.EMBEDDINGS_PROVIDER || 'openai',
    model: process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small',
    dimensions: parseInt(process.env.EMBEDDINGS_DIMENSIONS || '1536', 10),
    batchSize: parseInt(process.env.EMBEDDINGS_BATCH_SIZE || '100', 10),
  },
  
  // Voice Configuration (ElevenLabs)
  voice: {
    provider: 'elevenlabs',
    apiKey: process.env.ELEVENLABS_API_KEY,
    defaultVoiceId: process.env.DEFAULT_VOICE_ID || 'rachel',
    model: process.env.VOICE_MODEL || 'eleven_monolingual_v1',
    stability: parseFloat(process.env.VOICE_STABILITY || '0.5'),
    similarityBoost: parseFloat(process.env.VOICE_SIMILARITY || '0.75'),
  },
  
  // Prompt Configuration
  prompts: {
    systemPrompt: process.env.AI_SYSTEM_PROMPT || 'You are Aurelius, The Wise Advisor - a calm, insightful, and reassuring AI assistant.',
    maxContextLength: parseInt(process.env.AI_MAX_CONTEXT || '100000', 10),
    includeUserPreferences: process.env.AI_INCLUDE_PREFERENCES !== 'false',
    includeMemory: process.env.AI_INCLUDE_MEMORY !== 'false',
  },
  
  // Rate Limiting
  rateLimiting: {
    maxRequestsPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MIN || '60', 10),
    maxRequestsPerHour: parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '1000', 10),
    burstLimit: parseInt(process.env.AI_BURST_LIMIT || '10', 10),
  },
  
  // Monitoring
  monitoring: {
    trackUsage: process.env.AI_TRACK_USAGE !== 'false',
    trackPerformance: process.env.AI_TRACK_PERFORMANCE !== 'false',
    alertOnHighCost: process.env.AI_ALERT_HIGH_COST === 'true',
    costAlertThreshold: parseFloat(process.env.AI_COST_ALERT_THRESHOLD || '100'),
  },
}));