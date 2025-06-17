import { User } from '@prisma/client';
import { SegmentIntegration } from '../../segment/segment.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('SegmentIntegration', () => {
  let integration: SegmentIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(SegmentIntegration, 'segment')
    integration = setup.integration
    mocks = setup.mocks
}
  }

    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://platform.segmentapis.com/v1beta/auth/tokens':
        IntegrationTestHelper.createMockApiResponse({
          access_token: 'test_access_token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'test_refresh_token'}),
      'GET https://platform.segmentapis.com/v1beta/users/me':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'user123',
            workspace_id: 'workspace123',
            email: 'user@example.com',
            first_name: 'John',
            last_name: 'Doe',
            permissions: [
              {
                resource_type: 'workspace',
                resource_id: 'workspace123',
                role_id: 'admin',
                role_name: 'Admin'},
            ],
            created_at: '2024-01-01T00Z',
            updated_at: '2024-01-01T00Z'}),
      'GET https://platform.segmentapis.com/v1beta/workspaces':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'workspace123',
              name: 'Test Workspace',
              display_name: 'Test Company Analytics',
              slug: 'test-workspace',
              created_at: '2024-01-01T00Z',
              updated_at: '2024-01-01T00Z'},
          ]}),
      'GET https://platform.segmentapis.com/v1beta/workspaces/workspace123':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'workspace123',
            name: 'Test Workspace',
            display_name: 'Test Company Analytics',
            slug: 'test-workspace'}),
      'GET https://platform.segmentapis.com/v1beta/workspaces/workspace123/sources':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'source123',
              workspace_id: 'workspace123',
              name: 'Website Analytics',
              slug: 'website-analytics',
              write_keys: ['wk_test123'],
              library_config: {},
              enabled: true,
              catalog_id: 'javascript',
              created_at: '2024-01-01T00Z',
              updated_at: '2024-01-01T00Z',
              metadata: {,
                id: 'javascript',
                name: 'Analytics.js',
                description: 'JavaScript library for web analytics',
                slug: 'analytics-js',
                logos: {,
                  default: 'https://cdn.segment.com/logos/javascript.svg'},
                options: [
                  {
                    name: 'apiKey',
                    type: 'string',
                    description: 'Your write key',
                    required: true},
                ],
                categories: ['website']},
              settings: {,
                apiKey: 'wk_test123'},
          ]}),
      'GET https://platform.segmentapis.com/v1beta/sources/source123':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'source123',
            name: 'Website Analytics',
            enabled: true,
            write_keys: ['wk_test123']}),
      'POST https://platform.segmentapis.com/v1beta/workspaces/workspace123/sources':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'new_source456',
            name: 'Mobile App Analytics',
            slug: 'mobile-app-analytics',
            enabled: true,
            created_at: '2024-01-15T12:00:00Z'}),
      'PATCH https://platform.segmentapis.com/v1beta/sources/source123':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'source123',
            name: 'Updated Website Analytics',
            enabled: true}),
      'GET https://platform.segmentapis.com/v1beta/sources/source123/destinations':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'dest123',
              source_id: 'source123',
              name: 'Google Analytics',
              enabled: true,
              connection_mode: 'cloud',
              metadata: {,
                id: 'google-analytics',
                name: 'Google Analytics',
                description: 'Send data to Google Analytics',
                slug: 'google-analytics',
                logos: {,
                  default: 'https://cdn.segment.com/logos/google-analytics.svg'},
                options: [
                  {
                    name: 'trackingId',
                    type: 'string',
                    description: 'Your Google Analytics tracking ID',
                    required: true},
                ],
                categories: ['analytics'],
                website: 'https://analytics.google.com'},
              settings: {,
                trackingId: 'UA-12345678-1'},
              created_at: '2024-01-01T00Z',
              updated_at: '2024-01-01T00Z'},
          ]}),
      'POST https://platform.segmentapis.com/v1beta/sources/source123/destinations':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'new_dest456',
            source_id: 'source123',
            name: 'Mixpanel',
            enabled: true,
            created_at: '2024-01-15T12:00:00Z'}),
      'PATCH https://platform.segmentapis.com/v1beta/destinations/dest123':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'dest123',
            name: 'Updated Google Analytics',
            enabled: false}),
      'POST https://api.segment.io/v1/track': IntegrationTestHelper.createMockApiResponse({,
        success: true}),
      'POST https://api.segment.io/v1/identify': IntegrationTestHelper.createMockApiResponse({,
        success: true}),
      'GET https://platform.segmentapis.com/v1beta/sources/source123/schemas/track':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              source_id: 'source123',
              collection: 'track',
              key: 'Purchase Completed',
              type: 'object',
              description: 'User completed a purchase',
              required: true,
              properties: {,
                revenue: {
                  type: 'number',
                  description: 'Purchase amount',
                  required: true},
                currency: {,
                  type: 'string',
                  description: 'Currency code',
                  required: false},
          ]}),
      'PUT https://platform.segmentapis.com/v1beta/sources/source123/schemas/track':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            source_id: 'source123',
            collection: 'track',
            key: 'Purchase Completed',
            type: 'object',
            updated: true}),
      'GET https://platform.segmentapis.com/v1beta/workspaces/workspace123/audiences':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'audience123',
              workspace_id: 'workspace123',
              name: 'High Value Customers',
              description: 'Users with high lifetime value',
              definition: {,
                source_id: 'source123',
                conditions: [
                  {
                    type: 'event_property',
                    property: 'revenue',
                    operator: 'greater_than',
                    value: 1000},
                ]},
              created_at: '2024-01-01T00Z',
              updated_at: '2024-01-01T00Z',
              computed_at: '2024-01-15T00Z',
              size: 1250},
          ]}),
      'POST https://platform.segmentapis.com/v1beta/workspaces/workspace123/audiences':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'new_audience456',
            name: 'Active Users',
            workspace_id: 'workspace123',
            created_at: '2024-01-15T12:00:00Z'}),
      'GET https://platform.segmentapis.com/v1beta/workspaces/workspace123/profiles':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'profile123',
              workspace_id: 'workspace123',
              user_id: 'user456',
              email: 'customer@example.com',
              traits: {,
                name: 'Jane Smith',
                plan: 'premium',
                created_at: '2024-01-01T00Z'},
              events_count: 150,
              first_seen: '2024-01-01T00Z',
              last_seen: '2024-01-15T12:00:00Z',
              created_at: '2024-01-01T00Z',
              updated_at: '2024-01-15T12:00:00Z'},
          ]}),
      'GET https://platform.segmentapis.com/v1beta/workspaces/workspace123/profiles/profile123':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'profile123',
            workspace_id: 'workspace123',
            user_id: 'user456',
            email: 'customer@example.com',
            traits: {,
              name: 'Jane Smith',
              plan: 'premium'},
            events_count: 150})})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with OAuth', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        code: 'auth_code_123',
        redirectUri: 'https://app.example.com/callback'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600,
        userId: 'user123',
        userInfo: {,
          id: 'user123',
          name: 'John Doe',
          email: 'user@example.com'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'test_access_token',
        'test-user-id',
      )
    })

    it('should handle authentication errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(401, 'Invalid credentials')),
      )
    }

      const config = IntegrationTestHelper.createMockConfig({
        clientId: 'invalid',
        clientSecret: 'invalid'})

      await expect(integration.authenticate(config)).rejects.toThrow('Authentication failed')
    })
  })

  describe('Connection Status', () => {
    it('should return connected status when authenticated', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
  }
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(true)
      expect(status.user).toMatchObject({
        id: 'user123',
        name: 'John Doe',
        email: 'user@example.com'})
      expect(status.lastSync).toBeDefined()
    })

    it('should return disconnected status when authentication fails', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockRejectedValue(new Error('Token not found'))
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(false)
      expect(status.error).toBeDefined()
    })
  })

  describe('Sync Operations', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should sync successfully and return comprehensive data', async () => {
      const config = IntegrationTestHelper.createMockConfig()
    }

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        workspaces: expect.arrayContaining([
          expect.objectContaining({
            id: 'workspace123',
            name: 'Test Workspace'}),
        ]),
        sources: expect.arrayContaining([
          expect.objectContaining({
            id: 'source123',
            name: 'Website Analytics'}),
        ]),
        destinations: expect.arrayContaining([
          expect.objectContaining({
            id: 'dest123',
            name: 'Google Analytics'}),
        ]),
        syncedAt: expect.any(String)})
    })
  })

  describe('User Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get current user successfully', async () => {
      const _user = await integration.getCurrentUser()
    }

      expect(user).toMatchObject({
        id: 'user123',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        workspace_id: 'workspace123'})
    })
  })

  describe('Workspaces Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get workspaces successfully', async () => {
      const workspaces = await integration.getWorkspaces()
    }

      expect(workspaces).toHaveLength(1)
      expect(workspaces[0]).toMatchObject({
        id: 'workspace123',
        name: 'Test Workspace',
        display_name: 'Test Company Analytics'})
    })

    it('should get specific workspace successfully', async () => {
      const workspace = await integration.getWorkspace('workspace123')
    }

      expect(workspace).toMatchObject({
        id: 'workspace123',
        name: 'Test Workspace'})
    })
  })

  describe('Sources Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get sources successfully', async () => {
      const sources = await integration.getSources('workspace123')
    }

      expect(sources).toHaveLength(1)
      expect(sources[0]).toMatchObject({
        id: 'source123',
        name: 'Website Analytics',
        enabled: true,
        write_keys: ['wk_test123']})
    })

    it('should get specific source successfully', async () => {
      const source = await integration.getSource('source123')
    }

      expect(source).toMatchObject({
        id: 'source123',
        name: 'Website Analytics',
        enabled: true})
    })

    it('should create source successfully', async () => {
      const source = await integration.createSource('workspace123', {
        name: 'Mobile App Analytics',
        catalog_id: 'ios'})
    }

      expect(source).toMatchObject({
        id: 'new_source456',
        name: 'Mobile App Analytics'})
    })

    it('should update source successfully', async () => {
      const source = await integration.updateSource('source123', {
        name: 'Updated Website Analytics'})
    }

      expect(source).toMatchObject({
        id: 'source123',
        name: 'Updated Website Analytics'})
    })
  })

  describe('Destinations Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get destinations successfully', async () => {
      const destinations = await integration.getDestinations('source123')
    }

      expect(destinations).toHaveLength(1)
      expect(destinations[0]).toMatchObject({
        id: 'dest123',
        name: 'Google Analytics',
        enabled: true,
        connection_mode: 'cloud'})
    })

    it('should create destination successfully', async () => {
      const destination = await integration.createDestination('source123', {
        name: 'Mixpanel',
        catalog_id: 'mixpanel'})
    }

      expect(destination).toMatchObject({
        id: 'new_dest456',
        name: 'Mixpanel'})
    })

    it('should update destination successfully', async () => {
      const destination = await integration.updateDestination('dest123', {
        enabled: false})
    }

      expect(destination).toMatchObject({
        id: 'dest123',
        enabled: false})
    })
  })

  describe('Event Tracking', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should track _event successfully', async () => {
      const result = await integration.trackEvent('wk_test123', {
        event: 'Purchase Completed',
        properties: {,
          revenue: 99.99,
          currency: 'USD'},
        user_id: 'user456'})
    }

      expect(result).toBe(true)
    })

    it('should identify user successfully', async () => {
      const result = await integration.identifyUser('wk_test123', 'user456', {
        name: 'John Doe',
        email: 'john@example.com',
        plan: 'premium'})
    }

      expect(result).toBe(true)
    })
  })

  describe('Schemas Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get schema successfully', async () => {
      const schema = await integration.getSchema('source123', 'track')
    }

      expect(schema).toHaveLength(1)
      expect(schema[0]).toMatchObject({
        source_id: 'source123',
        collection: 'track',
        key: 'Purchase Completed',
        type: 'object'})
    })

    it('should update schema successfully', async () => {
      const schema = await integration.updateSchema('source123', 'track', {
        key: 'Purchase Completed',
        type: 'object',
        required: true})
    }

      expect(schema).toMatchObject({
        source_id: 'source123',
        collection: 'track',
        updated: true})
    })
  })

  describe('Audiences Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get audiences successfully', async () => {
      const audiences = await integration.getAudiences('workspace123')
    }

      expect(audiences).toHaveLength(1)
      expect(audiences[0]).toMatchObject({
        id: 'audience123',
        name: 'High Value Customers',
        size: 1250})
    })

    it('should create audience successfully', async () => {
      const audience = await integration.createAudience('workspace123', {
        name: 'Active Users',
        definition: {,
          source_id: 'source123',
          conditions: []})
    }

      expect(audience).toMatchObject({
        id: 'new_audience456',
        name: 'Active Users'})
    })
  })

  describe('Profiles Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get profiles successfully', async () => {
      const profiles = await integration.getProfiles('workspace123')
    }

      expect(profiles).toHaveLength(1)
      expect(profiles[0]).toMatchObject({
        id: 'profile123',
        user_id: 'user456',
        email: 'customer@example.com',
        events_count: 150})
    })

    it('should get specific profile successfully', async () => {
      const _profile = await integration.getProfile('profile123', 'workspace123')
    }

      expect(profile).toMatchObject({
        id: 'profile123',
        user_id: 'user456',
        email: 'customer@example.com'})
    })
  })

  describe('Webhook Handling', () => {
    it('should process source webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          type: 'source.created',
          data: {,
            id: 'source123',
            name: 'New Source'}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process destination webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          type: 'destination.updated',
          data: {,
            id: 'dest123',
            enabled: false}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should cache data effectively', async () => {
      await integration.getWorkspaces()
      await integration.getSources('workspace123')
    }

      expect(integration['workspacesCache'].size).toBeGreaterThan(0)
      expect(integration['sourcesCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getWorkspaces()
      await integration.getSources('workspace123')
    }

      integration.clearCache()

      expect(integration['workspacesCache'].size).toBe(0)
      expect(integration['sourcesCache'].size).toBe(0)
      expect(integration['destinationsCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'tracking',
        'sources',
        'destinations',
        'users',
        'events',
        'audiences',
        'profiles',
        'schemas',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('segment')
      expect(integration.name).toBe('Segment')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
