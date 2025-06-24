import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Tasks E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    prismaService = app.get<PrismaService>(PrismaService);

    // Clean up test database
    await prismaService.cleanDatabase();

    await app.init();

    // Create a test user and get auth token
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'tasktest@example.com',
      password: 'TaskPassword123!',
      name: 'Task Test User',
    });

    accessToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await prismaService.cleanDatabase();
    await app.close();
  });

  describe('Task CRUD Operations', () => {
    let taskId: string;

    it('should create a new task', async () => {
      const createTaskDto = {
        title: 'Complete project proposal',
        description: 'Write and submit the Q1 project proposal',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        labels: ['work', 'urgent'],
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createTaskDto)
        .expect(201);

      expect(response.body.title).toBe(createTaskDto.title);
      expect(response.body.description).toBe(createTaskDto.description);
      expect(response.body.priority).toBe(createTaskDto.priority);
      expect(response.body.status).toBe('pending');
      expect(response.body.userId).toBe(userId);
      expect(response.body.labels).toEqual(createTaskDto.labels);

      taskId = response.body.id;
    });

    it('should get all user tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe(taskId);
    });

    it('should get a specific task by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(taskId);
      expect(response.body.title).toBe('Complete project proposal');
    });

    it('should update a task', async () => {
      const updateTaskDto = {
        title: 'Complete updated project proposal',
        status: 'in_progress',
        priority: 'medium',
      };

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateTaskDto)
        .expect(200);

      expect(response.body.title).toBe(updateTaskDto.title);
      expect(response.body.status).toBe(updateTaskDto.status);
      expect(response.body.priority).toBe(updateTaskDto.priority);
    });

    it('should complete a task', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('completed');
      expect(response.body.completedAt).toBeDefined();
    });

    it('should delete a task', async () => {
      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify task is deleted (soft delete)
      const deletedTask = await prismaService.task.findUnique({
        where: { id: taskId },
      });

      expect(deletedTask).toBeDefined();
      if (deletedTask) {
        expect(deletedTask.deletedAt).toBeDefined();
      }
    });
  });

  describe('Task Filtering and Pagination', () => {
    beforeAll(async () => {
      // Create multiple test tasks
      const tasks = [
        {
          title: 'High priority task 1',
          priority: 'high',
          status: 'pending',
          labels: ['urgent', 'work'],
        },
        {
          title: 'Medium priority task 1',
          priority: 'medium',
          status: 'in_progress',
          labels: ['work'],
        },
        {
          title: 'Low priority task 1',
          priority: 'low',
          status: 'completed',
          labels: ['personal'],
          completedAt: new Date(),
        },
        {
          title: 'Another high priority task',
          priority: 'high',
          status: 'pending',
          labels: ['urgent'],
        },
      ];

      for (const task of tasks) {
        await prismaService.task.create({
          data: {
            ...task,
            userId,
          },
        });
      }
    });

    it('should filter tasks by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks?status=pending')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      response.body.data.forEach(
        (task: {
          status: string;
          priority: string;
          title: string;
          dueDate?: string;
          labels?: string[];
        }) => {
          expect(task.status).toBe('pending');
        }
      );
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks?priority=high')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      response.body.data.forEach(
        (task: {
          status: string;
          priority: string;
          title: string;
          dueDate?: string;
          labels?: string[];
        }) => {
          expect(task.priority).toBe('high');
        }
      );
    });

    it('should filter tasks by label', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks?labels=urgent')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      response.body.data.forEach(
        (task: {
          status: string;
          priority: string;
          title: string;
          dueDate?: string;
          labels?: string[];
        }) => {
          expect(task.labels).toContain('urgent');
        }
      );
    });

    it('should paginate tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBeGreaterThan(2);
    });

    it('should sort tasks by due date', async () => {
      // Add tasks with specific due dates
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prismaService.task.create({
        data: {
          title: 'Task due tomorrow',
          userId,
          dueDate: tomorrow,
          status: 'pending',
        },
      });

      await prismaService.task.create({
        data: {
          title: 'Task due next week',
          userId,
          dueDate: nextWeek,
          status: 'pending',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/tasks?sortBy=dueDate&sortOrder=asc')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const tasksWithDueDates = response.body.data.filter(
        (task: {
          status: string;
          priority: string;
          title: string;
          dueDate?: string;
          labels?: string[];
        }) => task.dueDate
      );
      expect(tasksWithDueDates.length).toBeGreaterThan(0);

      // Check if sorted correctly
      for (let i = 1; i < tasksWithDueDates.length; i++) {
        const prevDate = new Date(tasksWithDueDates[i - 1].dueDate);
        const currDate = new Date(tasksWithDueDates[i].dueDate);
        expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime());
      }
    });
  });

  describe('Task Validation', () => {
    it('should validate required fields', async () => {
      const invalidTask = {
        description: 'Task without title',
        priority: 'high',
      };

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidTask)
        .expect(400);
    });

    it('should validate priority values', async () => {
      const invalidTask = {
        title: 'Task with invalid priority',
        priority: 'super-urgent', // Invalid priority
      };

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidTask)
        .expect(400);
    });

    it('should validate due date format', async () => {
      const invalidTask = {
        title: 'Task with invalid due date',
        dueDate: 'not-a-date',
      };

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidTask)
        .expect(400);
    });
  });

  describe('Task Security', () => {
    let otherUserToken: string;
    let taskId: string;

    beforeAll(async () => {
      // Create another user
      const otherUserResponse = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'othertaskuser@example.com',
        password: 'OtherPassword123!',
        name: 'Other Task User',
      });

      otherUserToken = otherUserResponse.body.accessToken;

      // Create a task for the first user
      const taskResponse = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Private task',
          description: 'This should not be accessible by other users',
        });

      taskId = taskResponse.body.id;
    });

    it('should not allow access to other users tasks', async () => {
      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404); // Not found (not authorized to see it)
    });

    it('should not allow updating other users tasks', async () => {
      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ title: 'Hacked task' })
        .expect(404);
    });

    it('should not allow deleting other users tasks', async () => {
      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);
    });

    it('should require authentication for all task operations', async () => {
      // Test without token
      await request(app.getHttpServer()).get('/tasks').expect(401);

      await request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 'Unauthorized task' })
        .expect(401);

      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .send({ title: 'Unauthorized update' })
        .expect(401);

      await request(app.getHttpServer()).delete(`/tasks/${taskId}`).expect(401);
    });
  });

  describe('AI-Enhanced Task Features', () => {
    it('should create AI-suggested task', async () => {
      const aiTaskDto = {
        title: 'Review quarterly reports',
        description: 'AI suggested this based on your calendar',
        aiSuggested: true,
        aiReason: 'You have a board meeting next week and typically review reports beforehand',
        aiConfidence: 0.85,
        smartScheduled: true,
      };

      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(aiTaskDto)
        .expect(201);

      expect(response.body.aiSuggested).toBe(true);
      expect(response.body.aiReason).toBe(aiTaskDto.aiReason);
      expect(response.body.aiConfidence).toBe(aiTaskDto.aiConfidence);
      expect(response.body.smartScheduled).toBe(true);
    });

    it('should get AI task insights', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalTasks');
      expect(response.body).toHaveProperty('completionRate');
      expect(response.body).toHaveProperty('averageCompletionTime');
      expect(response.body).toHaveProperty('productivityTrends');
    });
  });
});
