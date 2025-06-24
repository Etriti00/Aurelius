import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ModelType = 'claude-3-haiku' | 'claude-3-5-sonnet' | 'claude-3-opus';
type ComplexityLevel = 'simple' | 'medium' | 'complex';
type SubscriptionTier = 'PRO' | 'MAX' | 'TEAMS';

interface AIRequest {
  prompt: string;
  context?: string;
  user: {
    id: string;
    subscription: {
      tier: SubscriptionTier;
    };
  };
  metadata?: {
    urgency?: 'low' | 'normal' | 'high';
    type?: string;
  };
}

interface ModelSelection {
  model: ModelType;
  maxTokens: number;
  temperature: number;
  costPer1KTokens: number;
  reasoning: string;
}

@Injectable()
export class AIModelSelectorService {
  private readonly logger = new Logger(AIModelSelectorService.name);

  private readonly modelConfig = {
    'claude-3-haiku': {
      cost: 0.00025,
      maxTokens: 4096,
      temperature: 0.3,
      capabilities: ['simple queries', 'data extraction', 'basic classification'],
    },
    'claude-3-5-sonnet': {
      cost: 0.003,
      maxTokens: 8192,
      temperature: 0.7,
      capabilities: ['complex reasoning', 'content generation', 'analysis'],
    },
    'claude-3-opus': {
      cost: 0.015,
      maxTokens: 16384,
      temperature: 0.5,
      capabilities: ['critical decisions', 'complex workflows', 'strategic planning'],
    },
  };

  private readonly complexityPatterns = {
    simple: [
      /^(what|when|where|who|list|show|get|find)\b/i,
      /\b(simple|quick|basic)\b/i,
      /^.{1,50}$/,
    ],
    medium: [
      /^(how|why|analyze|compare|suggest|draft|create)\b/i,
      /\b(explain|describe|summarize)\b/i,
      /^.{51,200}$/,
    ],
    complex: [
      /^(strategize|plan|design|architect|optimize|integrate)\b/i,
      /\b(comprehensive|detailed|complex|advanced)\b/i,
      /^.{201,}$/,
    ],
  };

  constructor(private readonly configService: ConfigService) {
    this.logger.debug('AI Model Selector initialized with default model configurations');
  }

  selectModel(request: AIRequest): ModelSelection {
    const complexity = this.analyzeComplexity(request);
    const userTier = request.user.subscription.tier;
    const urgency = request.metadata?.urgency || 'normal';
    const requestType = request.metadata?.type || 'general';

    this.logger.debug(
      `Model selection for user ${request.user.id}: complexity=${complexity}, tier=${userTier}, urgency=${urgency}, type=${requestType}`
    );

    // Get environment-specific model preferences
    const isDevelopment = this.configService.get('NODE_ENV') !== 'production';

    let selectedModel: ModelType;
    let reasoning: string;

    // Cost-optimized model selection logic
    if (complexity === 'simple' && urgency !== 'high') {
      selectedModel = 'claude-3-haiku';
      reasoning = `Simple query - using cost-efficient Haiku model${
        isDevelopment ? ' (dev mode)' : ''
      }`;
    } else if (complexity === 'medium' || userTier === 'PRO') {
      selectedModel = 'claude-3-5-sonnet';
      reasoning = 'Medium complexity or Pro tier - using balanced Sonnet model';
    } else if (userTier === 'MAX' && complexity === 'complex') {
      selectedModel = 'claude-3-opus';
      reasoning = 'Complex task for Max tier - using premium Opus model';
    } else if (userTier === 'TEAMS') {
      // Teams get access to better models for collaboration
      selectedModel = complexity === 'complex' ? 'claude-3-opus' : 'claude-3-5-sonnet';
      reasoning = 'Teams tier - using enhanced models for collaboration';
    } else {
      // Safe default
      selectedModel = 'claude-3-5-sonnet';
      reasoning = 'Default selection - balanced performance and cost';
    }

    // Override for specific request types
    if (requestType === 'voice-transcription' || requestType === 'quick-response') {
      selectedModel = 'claude-3-haiku';
      reasoning = 'Voice/quick response - optimized for speed and cost';
    } else if (requestType === 'strategic-planning' || requestType === 'workflow-design') {
      selectedModel = userTier === 'PRO' ? 'claude-3-5-sonnet' : 'claude-3-opus';
      reasoning = 'Strategic task - using premium model for quality';
    }

    const config = this.modelConfig[selectedModel];

    const selection: ModelSelection = {
      model: selectedModel,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      costPer1KTokens: config.cost,
      reasoning,
    };

    this.logger.debug(
      `Model selection for user ${request.user.id}: ${selectedModel} (${reasoning})`
    );

    return selection;
  }

  private analyzeComplexity(request: AIRequest): ComplexityLevel {
    const prompt = request.prompt.toLowerCase();
    const contextLength = (request.context || '').length;
    const totalLength = prompt.length + contextLength;

    // Check for complex patterns first
    if (this.complexityPatterns.complex.some(pattern => pattern.test(prompt))) {
      return 'complex';
    }

    // Check for simple patterns
    if (this.complexityPatterns.simple.some(pattern => pattern.test(prompt))) {
      // But upgrade to medium if there's significant context
      return contextLength > 500 ? 'medium' : 'simple';
    }

    // Check for medium patterns
    if (this.complexityPatterns.medium.some(pattern => pattern.test(prompt))) {
      return 'medium';
    }

    // Length-based fallback
    if (totalLength < 100) {
      return 'simple';
    } else if (totalLength > 500) {
      return 'complex';
    } else {
      return 'medium';
    }
  }

  getModelCapabilities(model: ModelType): string[] {
    return this.modelConfig[model].capabilities;
  }

  estimateCost(inputTokens: number, outputTokens: number, model: ModelType): number {
    const costPer1K = this.modelConfig[model].cost;
    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * costPer1K;
  }

  getOptimalModelForTask(taskType: string): ModelType {
    const taskModelMap: Record<string, ModelType> = {
      'email-classification': 'claude-3-haiku',
      'email-drafting': 'claude-3-5-sonnet',
      'task-prioritization': 'claude-3-haiku',
      'meeting-preparation': 'claude-3-5-sonnet',
      'strategic-analysis': 'claude-3-opus',
      'workflow-optimization': 'claude-3-opus',
      'quick-response': 'claude-3-haiku',
      'content-generation': 'claude-3-5-sonnet',
    };

    return taskModelMap[taskType] || 'claude-3-5-sonnet';
  }
}
