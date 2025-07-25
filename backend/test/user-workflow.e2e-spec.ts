import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { Tier } from '@prisma/client';
import { ClaudeService } from '../src/modules/ai-gateway/services/claude.service';

describe('Complete User Workflow E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  // User flow variables
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let taskId: string;
  let integrationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ClaudeService)
      .useValue({
        chat: jest.fn().mockResolvedValue({
          response: 'AI response for task management',
          model: 'claude-3-sonnet',
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    prismaService = app.get<PrismaService>(PrismaService);

    // Clean up test database
    await prismaService.cleanDatabase();

    await app.init();
  });

  afterAll(async () => {
    await prismaService.cleanDatabase();
    await app.close();
  });

  describe('1. User Registration and Authentication', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'workflow@example.com',
        password: 'WorkflowPassword123!',
        name: 'Workflow Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(registerDto.email);

      // Store tokens for subsequent tests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      userId = response.body.user.id;
    });

    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('workflow@example.com');
    });
  });

  describe('2. Subscription Management', () => {
    it('should create a paddle customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/billing/customer')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'workflow@example.com',
          name: 'Workflow Test User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('workflow@example.com');
    });

    it('should create a checkout session', async () => {
      const response = await request(app.getHttpServer())
        .post('/billing/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          priceId: 'pri_professional',
          successUrl: 'https://app.aurelius.plus/success',
          cancelUrl: 'https://app.aurelius.plus/cancel',
        })
        .expect(201);

      expect(response.body).toHaveProperty('customerId');
      expect(response.body).toHaveProperty('priceId');
      expect(response.body.priceId).toBe('pri_professional');
    });

    it('should simulate subscription creation via webhook', async () => {
      // Create subscription directly in database (simulating successful payment)
      await prismaService.subscription.create({
        data: {
          userId,
          tier: Tier.PRO,
          status: 'ACTIVE',
          paddleCustomerId: 'ctm_test_workflow',
          paddleSubscriptionId: 'sub_test_workflow',
          paddlePriceId: 'pri_professional',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          monthlyActionLimit: 1000,
          integrationLimit: 10,
          aiModelAccess: ['claude-3-haiku', 'claude-3-sonnet'],
          monthlyPrice: 50.0,
          overageRate: 0.05,
        },
      });

      // Store subscription ID for later use

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

    it('should get current subscription', async () => {
      const response = await request(app.getHttpServer())
        .get('/billing/subscription')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.tier).toBe(Tier.PRO);
      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.monthlyActionLimit).toBe(1000);
    });

    it('should get current usage', async () => {
      const response = await request(app.getHttpServer())
        .get('/billing/usage')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.monthlyAllocation).toBe(1000);
      expect(response.body.actionsUsed).toBe(0);
      expect(response.body.actionsRemaining).toBe(1000);
    });
  });

  describe('3. Task Management Workflow', () => {
    it('should create a new task', async () => {
      const createTaskDto = {
        title: 'Complete quarterly business review',
        description: 'Prepare slides and financial analysis for Q4 review meeting',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        labels: ['work', 'quarterly-review', 'presentations'],
        estimatedMinutes: 240,
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createTaskDto)
        .expect(201);

      expect(response.body.title).toBe(createTaskDto.title);
      expect(response.body.status).toBe('pending');
      expect(response.body.priority).toBe('high');
      expect(response.body.labels).toEqual(createTaskDto.labels);

      taskId = response.body.id;
    });

    it('should get all user tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(taskId);
      expect(response.body.pagination.total).toBe(1);
    });

    it('should update task status to in_progress', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'in_progress',
          startDate: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body.status).toBe('in_progress');
      expect(response.body.startDate).toBeDefined();
    });

    it('should complete the task', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('completed');
      expect(response.body.completedAt).toBeDefined();
      expect(response.body.actualMinutes).toBeDefined();
    });

    it('should get task insights', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalTasks');
      expect(response.body).toHaveProperty('completedTasks');
      expect(response.body).toHaveProperty('completionRate');
      expect(response.body.totalTasks).toBe(1);
      expect(response.body.completedTasks).toBe(1);
      expect(response.body.completionRate).toBe(100);
    });
  });

  describe('4. AI Integration Workflow', () => {
    it('should get AI task suggestions', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          messages: [
            {
              role: 'user',
              content:
                'Based on my completed quarterly review task, suggest 3 follow-up tasks for next quarter planning.',
            },
          ],
          model: 'claude-3-sonnet',
        })
        .expect(200);

      expect(response.body.response).toContain('AI response');
      expect(response.body.model).toBe('claude-3-sonnet');
      expect(response.body.usage).toBeDefined();
    });

    it('should create AI-suggested task', async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Prepare Q1 2024 budget proposal',
          description: 'AI suggested this task based on completed quarterly review',
          priority: 'medium',
          aiSuggested: true,
          aiReason: 'Follow-up task identified from quarterly review completion',
          aiConfidence: 0.85,
          labels: ['ai-suggested', 'planning', 'budget'],
        })
        .expect(201);

      expect(response.body.aiSuggested).toBe(true);
      expect(response.body.aiConfidence).toBe(0.85);
    });

    it('should verify usage tracking after AI interactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/billing/usage')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.actionsUsed).toBeGreaterThan(0);
      expect(response.body.actionsRemaining).toBeLessThan(1000);
    });
  });

  describe('5. Integration Setup Workflow', () => {
    it('should simulate Google OAuth callback', async () => {
      // Create integration directly (simulating OAuth flow completion)
      const integration = await prismaService.integration.create({
        data: {
          userId,
          provider: 'google-gmail',
          providerAccountId: 'google-workflow-123',
          accessToken: 'encrypted-access-token',
          refreshToken: 'encrypted-refresh-token',
          tokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
          tokenType: 'Bearer',
          status: 'active',
          scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
          permissions: { read: true, write: false },
          accountEmail: 'workflow@gmail.com',
          accountName: 'Workflow Gmail Account',
          syncEnabled: true,
          syncFrequency: 300,
        },
      });

      integrationId = integration.id;
    });

    it('should get all user integrations', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].provider).toBe('google-gmail');
      expect(response.body[0].status).toBe('active');
    });

    it('should test integration connection', async () => {
      const response = await request(app.getHttpServer())
        .post(`/integrations/${integrationId}/test`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    it('should sync integration', async () => {
      const response = await request(app.getHttpServer())
        .post(`/integrations/${integrationId}/sync`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
    });

    it('should update integration settings', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          syncFrequency: 600,
          settings: {
            syncLabels: ['INBOX', 'SENT', 'IMPORTANT'],
          },
        })
        .expect(200);

      expect(response.body.syncFrequency).toBe(600);
      expect(response.body.settings.syncLabels).toContain('IMPORTANT');
    });
  });

  describe('6. Analytics and Insights', () => {
    it('should get user analytics dashboard', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('aiUsage');
      expect(response.body).toHaveProperty('integrations');
      expect(response.body).toHaveProperty('productivity');
    });

    it('should get integration statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.totalIntegrations).toBe(1);
      expect(response.body.activeIntegrations).toBe(1);
      expect(response.body.providerBreakdown['google-gmail']).toBe(1);
    });
  });

  describe('7. Account Management', () => {
    it('should update user preferences', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          theme: 'dark',
          notifications: {
            email: true,
            push: false,
            frequency: 'daily',
          },
          dashboard: {
            layout: 'compact',
            widgets: ['tasks', 'calendar', 'ai-suggestions'],
          },
          ai: {
            autoSuggest: true,
            preferredModel: 'claude-3-sonnet',
            creativity: 0.7,
          },
        })
        .expect(200);

      expect(response.body.preferences.theme).toBe('dark');
      expect(response.body.preferences.ai.preferredModel).toBe('claude-3-sonnet');
    });

    it('should create billing portal session', async () => {
      const response = await request(app.getHttpServer())
        .post('/billing/portal')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          returnUrl: 'https://app.aurelius.plus/billing',
        })
        .expect(201);

      expect(response.body).toHaveProperty('url');
      expect(response.body.returnUrl).toBe('https://app.aurelius.plus/billing');
    });

    it('should get billing invoices', async () => {
      const response = await request(app.getHttpServer())
        .get('/billing/invoices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('8. Security and Session Management', () => {
    it('should refresh access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Update tokens for cleanup
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should get current user sessions', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('9. Cleanup and Account Deletion', () => {
    it('should delete integration', async () => {
      await request(app.getHttpServer())
        .delete(`/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify integration is deleted
      const response = await request(app.getHttpServer())
        .get('/integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should cancel subscription', async () => {
      const response = await request(app.getHttpServer())
        .post('/billing/subscription/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ immediate: false })
        .expect(200);

      expect(response.body.cancelAtPeriodEnd).toBe(true);
    });

    it('should revoke all sessions (logout everywhere)', async () => {
      await request(app.getHttpServer())
        .post('/auth/revoke-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify tokens are revoked
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('10. Workflow Verification', () => {
    it('should verify complete user journey data integrity', async () => {
      // Verify user exists
      const user = await prismaService.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true,
          currentUsage: true,
          tasks: true,
          integrations: true,
          actionLogs: true,
        },
      });

      expect(user).toBeDefined();
      if (!user) throw new Error('User not found');
      expect(user.email).toBe('workflow@example.com');
      expect(user.subscription).toBeDefined();
      if (!user.subscription) throw new Error('Subscription not found');
      expect(user.subscription.tier).toBe(Tier.PRO);
      expect(user.tasks.length).toBe(2); // Original task + AI suggested task
      expect(user.actionLogs.length).toBeGreaterThan(0); // AI usage logged
    });

    it('should verify analytics data consistency', async () => {
      // Check that all actions were properly tracked
      const actionLogs = await prismaService.actionLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      expect(actionLogs.length).toBeGreaterThan(0);

      const aiChatLogs = actionLogs.filter(log => log.type === 'ai_chat');
      expect(aiChatLogs.length).toBeGreaterThan(0);

      const taskLogs = actionLogs.filter(log => log.type.startsWith('task_'));
      expect(taskLogs.length).toBeGreaterThan(0);
    });
  });
});
