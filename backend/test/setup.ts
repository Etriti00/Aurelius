// Test setup file

// Mock PrismaClient for tests
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $on: jest.fn(),
        $transaction: jest.fn(),
        user: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          count: jest.fn(),
        },
        session: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
        subscription: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        task: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        integration: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          upsert: jest.fn(),
        },
        actionLog: {
          create: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
        },
      };
    }),
  };
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/aurelius_test';

// Increase test timeout for integration tests
jest.setTimeout(30000);
