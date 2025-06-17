import { jest } from '@jest/globals'

// Global test setup
beforeAll(() => {
  // Setup global mocks
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
})

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
})

afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks()
})

// Increase timeout for integration tests
jest.setTimeout(30000)

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test_jwt_secret'
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_chars_long'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'