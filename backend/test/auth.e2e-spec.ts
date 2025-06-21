import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Authentication E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

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
  });

  afterAll(async () => {
    await prismaService.cleanDatabase();
    await app.close();
  });

  describe('User Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        name: 'New User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(registerDto.email);
      expect(response.body.user.name).toBe(registerDto.name);
    });

    it('should fail registration with existing email', async () => {
      const registerDto = {
        email: 'newuser@example.com', // Already registered
        password: 'StrongPassword123!',
        name: 'Another User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should fail registration with weak password', async () => {
      const registerDto = {
        email: 'weakpass@example.com',
        password: '123', // Too weak
        name: 'Weak Password User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('User Login Flow', () => {
    let userCredentials;

    beforeAll(async () => {
      // Create a test user
      userCredentials = {
        email: 'testlogin@example.com',
        password: 'TestPassword123!',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...userCredentials,
          name: 'Test Login User',
        });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(userCredentials)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(userCredentials.email);
    });

    it('should fail login with incorrect password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userCredentials.email,
          password: 'WrongPassword123!',
        })
        .expect(400);
    });

    it('should fail login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        })
        .expect(400);
    });
  });

  describe('Token Refresh Flow', () => {
    let tokens;

    beforeAll(async () => {
      // Get fresh tokens
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testlogin@example.com',
          password: 'TestPassword123!',
        });

      tokens = response.body;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toBe(tokens.accessToken);
    });

    it('should fail refresh with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    let accessToken;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testlogin@example.com',
          password: 'TestPassword123!',
        });

      accessToken = response.body.accessToken;
    });

    it('should access protected route with valid token', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should fail to access protected route without token', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .expect(401);
    });

    it('should fail to access protected route with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('OAuth Flow', () => {
    it('should initiate Google OAuth', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/google')
        .expect(302); // Redirect to Google

      expect(response.headers.location).toContain('accounts.google.com');
    });

    it('should initiate Microsoft OAuth', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/microsoft')
        .expect(302); // Redirect to Microsoft

      expect(response.headers.location).toContain('login.microsoftonline.com');
    });
  });

  describe('Session Management', () => {
    let accessToken;
    let userId;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testlogin@example.com',
          password: 'TestPassword123!',
        });

      accessToken = response.body.accessToken;
      userId = response.body.user.id;
    });

    it('should logout and revoke session', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Token should no longer work
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should revoke all sessions', async () => {
      // Get new tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testlogin@example.com',
          password: 'TestPassword123!',
        });

      const newToken = loginResponse.body.accessToken;

      // Revoke all sessions
      await request(app.getHttpServer())
        .post('/auth/revoke-all-sessions')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      // Check sessions are revoked
      const sessions = await prismaService.session.findMany({
        where: { userId },
      });

      expect(sessions.length).toBe(1); // Only current session remains
    });
  });
});