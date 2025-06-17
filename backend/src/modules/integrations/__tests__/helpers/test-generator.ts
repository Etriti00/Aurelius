import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

interface IntegrationInfo {
  provider: string
  className: string
  filePath: string
  apiBaseUrl: string
  capabilities: string[]
  specificMethods: string[]
}

export class TestGenerator {
  private static readonly TEST_TEMPLATE = `import { {{className}} } from '../../{{filePath}}'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'

describe('{{className}}', () => {
  let integration: {{className}}
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration({{className}}, '{{provider}}')
    integration = setup.integration
    mocks = setup.mocks

    // Setup default fetch mocks
    fetchMock = IntegrationTestHelper.mockFetch({
      'GET {{apiBaseUrl}}/user': IntegrationTestHelper.createMockApiResponse({
        user: {
          id: 'test_user_123',
          email: 'test@example.com',
          username: 'testuser'
        }
      }),
      'GET {{apiBaseUrl}}/test': IntegrationTestHelper.createMockApiResponse({
        status: 'ok'
      }),
      'default': IntegrationTestHelper.createMockApiResponse({
        data: 'default_response'
      })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  describe('Authentication', () => {
    it('should authenticate successfully with valid token', async () => {
      const result = await integration.authenticate()
      
      IntegrationTestHelper.assert(result, {
        success: true,
        accessToken: mocks.oauth.accessToken
      })
    })

    it('should handle authentication failure', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET {{apiBaseUrl}}/user': IntegrationTestHelper.createMockApiResponse(
          { error: 'Unauthorized' }, 
          401
        )
      })

      const result = await integration.authenticate()
      
      IntegrationTestHelper.assert(result, {
        success: false,
        error: 'Authentication failed'
      })
    })

    it('should refresh token successfully', async () => {
      const result = await integration.refreshToken()
      
      IntegrationTestHelper.assert(result, {
        success: true
      })
    })

    it('should revoke access successfully', async () => {
      const result = await integration.revokeAccess()
      expect(result).toBe(true)
    })
  })

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const result = await integration.testConnection()
      
      IntegrationTestHelper.assert(result, {
        isConnected: true
      })
      
      expect(result.lastChecked).toBeInstanceOf(Date)
    })

    it('should handle connection test failure', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'default': IntegrationTestHelper.createMockApiResponse(
          { error: 'Service unavailable' }, 
          503
        )
      })

      const result = await integration.testConnection()
      
      IntegrationTestHelper.assert(result, {
        isConnected: false
      })
    })
  })

  describe('Capabilities', () => {
    it('should return {{provider}} capabilities', () => {
      const capabilities = integration.getCapabilities()
      
      expect(Array.isArray(capabilities)).toBe(true)
      expect(capabilities.length).toBeGreaterThan(0)
      
      capabilities.forEach(capability => {
        expect(capability).toHaveProperty('name')
        expect(capability).toHaveProperty('description')
        expect(capability).toHaveProperty('enabled')
        expect(capability).toHaveProperty('requiredScopes')
      })
    })

    it('should validate required scopes correctly', () => {
      const validScopes = ['{{provider}}.read', '{{provider}}.write']
      const invalidScopes = ['invalid.scope']
      
      expect(integration.validateRequiredScopes(validScopes)).toBe(true)
      expect(integration.validateRequiredScopes(invalidScopes)).toBe(false)
    })
  })

  describe('Data Synchronization', () => {
    it('should sync data successfully', async () => {
      const result = await integration.syncData()
      
      IntegrationTestHelper.assert(result, {
        success: true
      })
      
      expect(result.itemsProcessed).toBeGreaterThanOrEqual(0)
      expect(result.itemsSkipped).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should sync data with last sync time', async () => {
      const lastSyncTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const result = await integration.syncData(lastSyncTime)
      
      IntegrationTestHelper.assert(result, {
        success: true
      })
    })

    it('should get last sync time', async () => {
      const lastSyncTime = await integration.getLastSyncTime()
      expect(lastSyncTime instanceof Date || lastSyncTime === null).toBe(true)
    })
  })

  describe('Webhook Handling', () => {
    it('should handle webhook successfully', async () => {
      const payload = IntegrationTestHelper.createMock('{{provider}}', 'test.event', {
        id: 'test_123'
      })

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
      
      expect(mocks.metricsService.trackWebhookEvent).toHaveBeenCalled()
    })

    it('should validate webhook signature', () => {
      const payload = { test: 'data' }
      const signature = 'valid_signature'
      
      const result = integration.validateWebhookSignature(payload, signature)
      expect(typeof result).toBe('boolean')
    })
  })

{{specificMethodTests}}

  describe('Error Handling', () => {
    it('should handle rate limiting correctly', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'default': IntegrationTestHelper.createMockApiResponse(
          { error: 'Rate limit exceeded' }, 
          429,
          { 'Retry-After': '1' }
        )
      })

      await expect(integration.authenticate()).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      fetchMock.mockRestore()
      fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))

      const result = await integration.testConnection()
      
      IntegrationTestHelper.assert(result, {
        isConnected: false
      })
    })
  })

  describe('Circuit Breaker Integration', () => {
    it('should use circuit breaker for API calls', async () => {
      await integration.authenticate()
      
      expect(mocks.circuitBreaker.execute).toHaveBeenCalled()
    })

    it('should track metrics for operations', async () => {
      await integration.authenticate()
      
      expect(mocks.metricsService.trackApiCall).toHaveBeenCalled()
    })
  })
})`

  /**
   * Generates a comprehensive test suite for an integration
   */
  static generateTestSuite(integrationInfo: IntegrationInfo): string {
    const specificMethodTests = this.generateSpecificMethodTests(integrationInfo)

    return this.TEST_TEMPLATE.replace(/\{\{className}}/g, integrationInfo.className)
      .replace(/\{\{provider}}/g, integrationInfo.provider)
      .replace(/\{\{filePath}}/g, integrationInfo.filePath)
      .replace(/\{\{apiBaseUrl}}/g, integrationInfo.apiBaseUrl)
      .replace(/\{\{specificMethodTests}}/g, specificMethodTests)
  }

  /**
   * Generates tests for integration-specific methods
   */
  private static generateSpecificMethodTests(integrationInfo: IntegrationInfo): string {
    if (integrationInfo.specificMethods.length === 0) {
      return ''
    }

    const methodTests = integrationInfo.specificMethods
      .map(method => {
        return `    it('should ${method} successfully', async () => {
      // Mock the API response for ${method}
      fetchMock = IntegrationTestHelper.mockFetch({
        'default': IntegrationTestHelper.createMockApiResponse({
          success: true,
          data: 'mock_${method}_response'
        })
      })

      const result = await integration.${method}()
      expect(result).toBeDefined()
    })`
      })
      .join('\n\n')

    return `  describe('Integration-Specific Methods', () => {
${methodTests}
  })`
  }

  /**
   * Creates test files for all integrations
   */
  static async generateAllTests(): Promise<void> {
    const integrations: IntegrationInfo[] = [
      // Google Workspace
      {
        provider: 'google-workspace',
        className: 'GoogleWorkspaceIntegration',
        filePath: 'google-workspace/google-workspace.integration',
        apiBaseUrl: 'https://www.googleapis.com',
        capabilities: ['Gmail', 'Calendar', 'Drive'],
        specificMethods: ['getEmails', 'getCalendarEvents', 'getFiles'],
      },
      {
        provider: 'google-calendar',
        className: 'GoogleCalendarIntegration',
        filePath: 'google-calendar/google-calendar.integration',
        apiBaseUrl: 'https://www.googleapis.com/calendar/v3',
        capabilities: ['Events', 'Calendars'],
        specificMethods: ['getEvents', 'createEvent'],
      },
      {
        provider: 'google-drive',
        className: 'GoogleDriveIntegration',
        filePath: 'google-drive/google-drive.integration',
        apiBaseUrl: 'https://www.googleapis.com/drive/v3',
        capabilities: ['Files', 'Folders'],
        specificMethods: ['getFiles', 'uploadFile'],
      },

      // Microsoft 365
      {
        provider: 'microsoft-365',
        className: 'Microsoft365Integration',
        filePath: 'microsoft-365/microsoft-365.integration',
        apiBaseUrl: 'https://graph.microsoft.com/v1.0',
        capabilities: ['Mail', 'Calendar', 'OneDrive'],
        specificMethods: ['getMessages', 'getEvents', 'getFiles'],
      },
      {
        provider: 'microsoft-teams',
        className: 'MicrosoftTeamsIntegration',
        filePath: 'microsoft-teams/microsoft-teams.integration',
        apiBaseUrl: 'https://graph.microsoft.com/v1.0',
        capabilities: ['Teams', 'Channels', 'Messages'],
        specificMethods: ['getTeams', 'getChannels'],
      },
      {
        provider: 'microsoft-outlook',
        className: 'MicrosoftOutlookIntegration',
        filePath: 'microsoft-outlook/microsoft-outlook.integration',
        apiBaseUrl: 'https://graph.microsoft.com/v1.0',
        capabilities: ['Mail', 'Calendar'],
        specificMethods: ['getMessages', 'sendMessage'],
      },

      // Project Management (Simplified)
      {
        provider: 'clickup',
        className: 'ClickUpIntegration',
        filePath: 'clickup/clickup.integration',
        apiBaseUrl: 'https://api.clickup.com/api/v2',
        capabilities: ['Tasks', 'Spaces', 'Teams'],
        specificMethods: ['getTasks', 'createTask', 'getSpaces'],
      },
      {
        provider: 'monday',
        className: 'MondayIntegration',
        filePath: 'monday/monday.integration',
        apiBaseUrl: 'https://api.monday.com/v2',
        capabilities: ['Boards', 'Items', 'Groups'],
        specificMethods: ['getBoards', 'createItem', 'getItems'],
      },
      {
        provider: 'linear',
        className: 'LinearIntegration',
        filePath: 'linear/linear.integration',
        apiBaseUrl: 'https://api.linear.app/graphql',
        capabilities: ['Issues', 'Projects', 'Teams'],
        specificMethods: ['getIssues', 'createIssue', 'getProjects'],
      },

      // CRM & Sales
      {
        provider: 'salesforce',
        className: 'SalesforceIntegration',
        filePath: 'salesforce/salesforce.integration',
        apiBaseUrl: 'https://login.salesforce.com',
        capabilities: ['Accounts', 'Contacts', 'Leads'],
        specificMethods: ['getAccounts', 'createContact', 'getLeads'],
      },
      {
        provider: 'hubspot',
        className: 'HubSpotIntegration',
        filePath: 'hubspot/hubspot.integration',
        apiBaseUrl: 'https://api.hubapi.com',
        capabilities: ['Contacts', 'Companies', 'Deals'],
        specificMethods: ['getContacts', 'createCompany', 'getDeals'],
      },

      // Communication
      {
        provider: 'slack',
        className: 'SlackIntegration',
        filePath: 'slack/slack.integration',
        apiBaseUrl: 'https://slack.com/api',
        capabilities: ['Channels', 'Messages', 'Files'],
        specificMethods: ['getChannels', 'sendMessage', 'getMessages'],
      },
      {
        provider: 'discord',
        className: 'DiscordIntegration',
        filePath: 'discord/discord.integration',
        apiBaseUrl: 'https://discord.com/api/v10',
        capabilities: ['Guilds', 'Channels', 'Messages'],
        specificMethods: ['getGuilds', 'getChannels', 'getMessages'],
      },

      // Developer Tools
      {
        provider: 'github',
        className: 'GitHubIntegration',
        filePath: 'github/github.integration',
        apiBaseUrl: 'https://api.github.com',
        capabilities: ['Repositories', 'Issues', 'Pull Requests'],
        specificMethods: ['getRepositories', 'getIssues', 'createIssue'],
      },
      {
        provider: 'gitlab',
        className: 'GitLabIntegration',
        filePath: 'gitlab/gitlab.integration',
        apiBaseUrl: 'https://gitlab.com/api/v4',
        capabilities: ['Projects', 'Issues', 'Merge Requests'],
        specificMethods: ['getProjects', 'getIssues', 'createIssue'],
      },

      // Additional integrations can be added here...
    ]

    const testDir =
      '/home/etritneziri/projects/Aurelius/backend/src/modules/integrations/_tests_/unit'

    // Ensure test directory exists
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }

    for (const integration of integrations) {
      const testContent = this.generateTestSuite(integration)
      const testFile = join(testDir, `${integration.provider}.integration.spec.ts`)

      // Only generate if file doesn't exist to avoid overwriting custom tests
      if (!existsSync(testFile)) {
        writeFileSync(testFile, testContent)
        console.log(`Generated test file: ${testFile}`)
      } else {
        console.log(`Test file already exists, skipping: ${testFile}`)
      }
    }
  }

  /**
   * Generates a Jest configuration for integration tests
   */
  static generateJestConfig(): string {
    return `module.exports = {
  displayName: 'Integration Tests',
  testMatch: ['**/_tests_/**/*.spec.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/modules/integrations/_tests_/setup/test-setup.ts'],
  collectCoverageFrom: [
    'src/modules/integrations/**/*.ts',
    '!src/modules/integrations/**/*.spec.ts',
    '!src/modules/integrations/**/*.interface.ts',
    '!src/modules/integrations/_tests_/**/*'
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
  rootDir: '../../../..',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  testTimeout: 30000,
  maxWorkers: 4,
  verbose: true
}`
  }

  /**
   * Generates test setup file
   */
  static generateTestSetup(): string {
    return `import { jest } from '@jest/globals'

// Global test setup
beforeAll(() => {
  // Setup global mocks
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
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
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'`
  }
}