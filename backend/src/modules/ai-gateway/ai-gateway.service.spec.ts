import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AIGatewayService } from './ai-gateway.service';
import { AIModelSelectorService } from './services/ai-model-selector.service';
import { AnthropicService } from './services/anthropic.service';
import { UsageTrackingService } from './services/usage-tracking.service';

describe('AIGatewayService', () => {
  let service: AIGatewayService;
  let modelSelector: AIModelSelectorService;
  let anthropicService: AnthropicService;
  let usageTracking: UsageTrackingService;

  const mockModelSelector = {
    selectModel: jest.fn(),
    estimateCost: jest.fn(),
  };

  const mockAnthropicService = {
    generateResponse: jest.fn(),
  };

  const mockUsageTracking = {
    checkUsageLimit: jest.fn(),
    recordUsage: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIGatewayService,
        {
          provide: AIModelSelectorService,
          useValue: mockModelSelector,
        },
        {
          provide: AnthropicService,
          useValue: mockAnthropicService,
        },
        {
          provide: UsageTrackingService,
          useValue: mockUsageTracking,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<AIGatewayService>(AIGatewayService);
    modelSelector = module.get<AIModelSelectorService>(AIModelSelectorService);
    anthropicService = module.get<AnthropicService>(AnthropicService);
    usageTracking = module.get<UsageTrackingService>(UsageTrackingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processRequest', () => {
    it('should process AI request successfully', async () => {
      const request = {
        prompt: 'What are my tasks for today?',
        userId: 'user-1',
        action: 'task-query',
        userSubscription: { tier: 'PRO' as const },
      };

      const mockModelSelection = {
        model: 'claude-3-5-sonnet' as const,
        maxTokens: 8192,
        temperature: 0.7,
        reasoning: 'Balanced model for task queries',
      };

      const mockAIResponse = {
        text: 'You have 3 tasks scheduled for today...',
        inputTokens: 150,
        outputTokens: 75,
        duration: 850,
        cacheHit: false,
        model: 'claude-3-5-sonnet',
      };

      mockUsageTracking.checkUsageLimit.mockResolvedValue(true);
      mockModelSelector.selectModel.mockReturnValue(mockModelSelection);
      mockAnthropicService.generateResponse.mockResolvedValue(mockAIResponse);
      mockModelSelector.estimateCost.mockReturnValue(0.000675);
      mockUsageTracking.recordUsage.mockResolvedValue(undefined);

      const result = await service.processRequest(request);

      expect(result).toEqual({
        text: mockAIResponse.text,
        model: mockModelSelection.model,
        confidence: expect.any(Number),
        suggestions: expect.any(Array),
        metadata: {
          inputTokens: mockAIResponse.inputTokens,
          outputTokens: mockAIResponse.outputTokens,
          duration: expect.any(Number),
          cost: 0.000675,
          cacheHit: false,
        },
      });

      expect(usageTracking.checkUsageLimit).toHaveBeenCalledWith(request.userId);
      expect(modelSelector.selectModel).toHaveBeenCalled();
      expect(anthropicService.generateResponse).toHaveBeenCalled();
      expect(usageTracking.recordUsage).toHaveBeenCalled();
    });

    it('should throw RateLimitException when usage limit exceeded', async () => {
      const request = {
        prompt: 'Test prompt',
        userId: 'user-1',
        action: 'test-action',
        userSubscription: { tier: 'PRO' as const },
      };

      mockUsageTracking.checkUsageLimit.mockResolvedValue(false);

      await expect(service.processRequest(request)).rejects.toThrow('Monthly AI action limit exceeded');
    });
  });

  describe('analyzeEmailThread', () => {
    it('should analyze email and return structured data', async () => {
      const request = {
        userId: 'user-1',
        emailContent: 'Subject: Project Update\nHi team, we need to discuss...',
        userSubscription: { tier: 'PRO' as const },
      };

      const mockAnalysis = {
        summary: 'Project discussion requiring team coordination',
        priority: 'HIGH' as const,
        sentiment: 0.2,
        actionItems: ['Schedule meeting', 'Prepare update'],
      };

      // Mock the processRequest call that happens internally
      jest.spyOn(service, 'processRequest').mockResolvedValue({
        text: JSON.stringify(mockAnalysis),
        model: 'claude-3-5-sonnet',
        confidence: 0.85,
        metadata: {
          inputTokens: 200,
          outputTokens: 100,
          duration: 1000,
          cost: 0.0009,
          cacheHit: false,
        },
      });

      const result = await service.analyzeEmailThread(request);

      expect(result).toEqual(mockAnalysis);
    });

    it('should return default analysis on parsing error', async () => {
      const request = {
        userId: 'user-1',
        emailContent: 'Test email content',
        userSubscription: { tier: 'PRO' as const },
      };

      jest.spyOn(service, 'processRequest').mockResolvedValue({
        text: 'Invalid JSON response',
        model: 'claude-3-5-sonnet',
        confidence: 0.85,
        metadata: {
          inputTokens: 200,
          outputTokens: 100,
          duration: 1000,
          cost: 0.0009,
          cacheHit: false,
        },
      });

      const result = await service.analyzeEmailThread(request);

      expect(result).toEqual({
        summary: 'Unable to analyze email content',
        priority: 'NORMAL',
        sentiment: 0,
        actionItems: [],
      });
    });
  });

  describe('draftEmail', () => {
    it('should draft email successfully', async () => {
      const request = {
        userId: 'user-1',
        context: 'Follow up on project meeting',
        recipient: 'alice@company.com',
        purpose: 'Confirm next steps',
        userSubscription: { tier: 'PRO' as const },
      };

      const mockDraft = {
        subject: 'Follow up on Project Meeting',
        body: 'Hi Alice,\n\nThank you for the productive meeting...',
      };

      jest.spyOn(service, 'processRequest').mockResolvedValue({
        text: JSON.stringify(mockDraft),
        model: 'claude-3-5-sonnet',
        confidence: 0.88,
        metadata: {
          inputTokens: 300,
          outputTokens: 150,
          duration: 1200,
          cost: 0.00135,
          cacheHit: false,
        },
      });

      const result = await service.draftEmail(request);

      expect(result).toEqual(mockDraft);
    });
  });
});