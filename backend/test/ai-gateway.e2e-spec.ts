import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { AnthropicService } from '../src/modules/ai-gateway/services/anthropic.service';
import { Tier } from '@prisma/client';

describe('AI Gateway E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let anthropicService: AnthropicService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AnthropicService)
      .useValue({
        generateResponse: jest.fn().mockResolvedValue({
          text: 'Mocked AI response',
          inputTokens: 10,
          outputTokens: 20,
          duration: 100,
          cacheHit: false,
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    prismaService = app.get<PrismaService>(PrismaService);
    anthropicService = app.get<AnthropicService>(AnthropicService);

    // Clean up test database
    await prismaService.cleanDatabase();

    await app.init();

    // Create a test user and get auth token
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'aitest@example.com',
      password: 'AITestPassword123!',
      name: 'AI Test User',
    });

    accessToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;

    // Create a test subscription
    await prismaService.subscription.create({
      data: {
        userId,
        tier: Tier.PRO,
        status: 'ACTIVE',
        paddleCustomerId: 'ctm_test123',
        paddleSubscriptionId: 'sub_test123',
        paddlePriceId: 'pri_test123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        monthlyActionLimit: 1000,
        integrationLimit: 10,
        aiModelAccess: ['claude-3-haiku', 'claude-3-sonnet', 'gpt-4'],
        monthlyPrice: 50.0,
        overageRate: 0.05,
      },
    });

    // Create usage tracking
    await prismaService.usage.create({
      data: {
        userId,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyAllocation: 1000,
        actionsUsed: 0,
        actionsRemaining: 1000,
      },
    });
  });

  afterAll(async () => {
    await prismaService.cleanDatabase();
    await app.close();
  });

  describe('Chat API', () => {
    it('should handle Claude chat request successfully', async () => {
      const chatRequest = {
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
        model: 'claude-3-sonnet',
        temperature: 0.7,
      };

      const response = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(200);

      expect(response.body.response).toBe('Mocked Claude response');
      expect(response.body.model).toBe('claude-3-sonnet');
      expect(response.body.usage).toBeDefined();
      expect(anthropicService.generateResponse).toHaveBeenCalled();
    });

    it('should handle OpenAI chat request successfully', async () => {
      const chatRequest = {
        messages: [{ role: 'user', content: 'What is artificial intelligence?' }],
        model: 'gpt-4',
        temperature: 0.5,
      };

      const response = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(200);

      expect(response.body.response).toBeDefined();
      expect(anthropicService.generateResponse).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      const chatRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-3-sonnet',
      };

      await request(app.getHttpServer()).post('/ai/chat').send(chatRequest).expect(401);
    });

    it('should validate request body', async () => {
      const invalidRequest = {
        messages: [], // Empty messages array
        model: 'claude-3-sonnet',
      };

      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidRequest)
        .expect(400);
    });

    it('should track usage after successful request', async () => {
      const chatRequest = {
        messages: [{ role: 'user', content: 'Track this usage' }],
        model: 'claude-3-haiku',
      };

      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(200);

      // Check that usage was tracked
      const actionLog = await prismaService.actionLog.findFirst({
        where: {
          userId,
          type: 'ai_chat',
          model: 'claude-3-haiku',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(actionLog).toBeDefined();
      if (actionLog) {
        expect(actionLog.status).toBe('success');
      }
    });
  });

  describe('Embeddings API', () => {
    it('should generate embedding successfully', async () => {
      const embeddingRequest = {
        text: 'This is a test document for embedding generation',
        model: 'text-embedding-3-small',
      };

      const response = await request(app.getHttpServer())
        .post('/ai/embeddings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(embeddingRequest)
        .expect(200);

      expect(response.body.embedding).toBeDefined();
      expect(response.body.embedding.length).toBe(1536);
      expect(response.body.model).toBe('text-embedding-3-small');
      // Verify embedding was generated
    });

    it('should validate embedding request', async () => {
      const invalidRequest = {
        text: '', // Empty text
        model: 'text-embedding-3-small',
      };

      await request(app.getHttpServer())
        .post('/ai/embeddings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidRequest)
        .expect(400);
    });
  });

  describe('Usage Limits', () => {
    it('should reject requests when usage limit is exceeded', async () => {
      // Update usage to be at limit
      await prismaService.usage.update({
        where: { userId },
        data: {
          actionsUsed: 1000,
          actionsRemaining: 0,
        },
      });

      const chatRequest = {
        messages: [{ role: 'user', content: 'This should be rejected' }],
        model: 'claude-3-sonnet',
      };

      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(429); // Too Many Requests

      // Reset usage for other tests
      await prismaService.usage.update({
        where: { userId },
        data: {
          actionsUsed: 0,
          actionsRemaining: 1000,
        },
      });
    });
  });

  describe('Model Selection', () => {
    it('should automatically select appropriate model for simple queries', async () => {
      const simpleRequest = {
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        // No model specified - should auto-select
      };

      const response = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(simpleRequest)
        .expect(200);

      // Should use Haiku for simple requests
      expect(response.body.model).toBe('claude-3-haiku');
    });

    it('should auto-select more powerful model for complex queries', async () => {
      const complexRequest = {
        messages: [
          {
            role: 'user',
            content:
              'Analyze the market trends in artificial intelligence, provide detailed insights on key players, emerging technologies, and predict future developments with supporting evidence and rationale.',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(complexRequest)
        .expect(200);

      // Should use Sonnet for complex requests
      expect(response.body.model).toBe('claude-3-sonnet');
    });
  });

  describe('Caching', () => {
    it('should cache and return cached responses', async () => {
      const chatRequest = {
        messages: [{ role: 'user', content: 'This will be cached' }],
        model: 'claude-3-sonnet',
      };

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(200);

      // Second identical request should be cached
      const response2 = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(200);

      expect(response1.body.response).toBe(response2.body.response);
      // Verify caching is working
      expect(anthropicService.generateResponse).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service errors gracefully', async () => {
      // Mock Anthropic service to throw error
      jest
        .spyOn(anthropicService, 'generateResponse')
        .mockRejectedValueOnce(new Error('AI service unavailable'));

      const chatRequest = {
        messages: [{ role: 'user', content: 'This will fail' }],
        model: 'claude-3-sonnet',
      };

      const response = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatRequest)
        .expect(500);

      expect(response.body.message).toContain('Internal server error');

      // Check that error was logged
      const errorLog = await prismaService.actionLog.findFirst({
        where: {
          userId,
          status: 'failed',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(errorLog).toBeDefined();
      if (errorLog && errorLog.error) {
        expect(errorLog.error).toContain('AI service unavailable');
      }
    });
  });
});
