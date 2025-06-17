module.exports = {
  displayName: 'Integration Tests',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/modules/integrations/__tests__/setup/test-setup.ts'],
  collectCoverageFrom: [
    'src/modules/integrations/**/*.ts',
    '!src/modules/integrations/**/*.spec.ts',
    '!src/modules/integrations/**/*.interface.ts',
    '!src/modules/integrations/__tests__/**/*'
  ],
  coverageDirectory: 'coverage/integration-tests',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  testTimeout: 30000,
  maxWorkers: 4,
  verbose: true
}