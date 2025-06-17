import { User } from '@prisma/client';
import { DockerHubIntegration } from '../../docker-hub/docker-hub.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('DockerHubIntegration', () => {
  let integration: DockerHubIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(
      DockerHubIntegration,
      'docker-hub',
    )
    integration = setup.integration
    mocks = setup.mocks
}
  }

    // Setup default fetch mocks for Docker Hub API
    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://hub.docker.com/v2/users/login/': IntegrationTestHelper.createMockApiResponse({,
        token: 'test_jwt_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600}),
      'GET https://hub.docker.com/v2/user/': IntegrationTestHelper.createMockApiResponse({,
        id: 'user123',
        username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com',
        location: 'San Francisco',
        company: 'Test Company',
        profile_url: 'https://hub.docker.com/u/testuser/',
        avatar_url: 'https://gravatar.com/avatar/123',
        is_admin: false,
        type: 'User',
        date_joined: '2024-01-01T00Z'}),
      'GET https://hub.docker.com/v2/repositories/testuser/':
        IntegrationTestHelper.createMockApiResponse({
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              user: 'testuser',
              name: 'test-app',
              namespace: 'testuser',
              repository_type: 'image',
              status: 1,
              description: 'Test application container',
              is_private: false,
              is_automated: true,
              can_edit: true,
              star_count: 15,
              pull_count: 1250,
              last_updated: '2024-01-15T12:00:00Z',
              has_starred: false,
              full_size: 125000000,
              images: [],
              permissions: {,
                read: true,
                write: true,
                admin: true},
            {
              user: 'testuser',
              name: 'api-server',
              namespace: 'testuser',
              repository_type: 'image',
              status: 1,
              description: 'API server container',
              is_private: true,
              is_automated: false,
              can_edit: true,
              star_count: 5,
              pull_count: 500,
              last_updated: '2024-01-10T10:00:00Z',
              has_starred: true,
              full_size: 85000000,
              images: [],
              permissions: {,
                read: true,
                write: true,
                admin: true},
          ]}),
      'GET https://hub.docker.com/v2/repositories/testuser/test-app/':
        IntegrationTestHelper.createMockApiResponse({
          user: 'testuser',
          name: 'test-app',
          namespace: 'testuser',
          repository_type: 'image',
          status: 1,
          description: 'Test application container',
          is_private: false,
          is_automated: true,
          can_edit: true,
          star_count: 15,
          pull_count: 1250,
          last_updated: '2024-01-15T12:00:00Z',
          has_starred: false,
          full_size: 125000000,
          images: [],
          permissions: {,
            read: true,
            write: true,
            admin: true}),
      'POST https://hub.docker.com/v2/repositories/': IntegrationTestHelper.createMockApiResponse({,
        user: 'testuser',
        name: 'new-repo',
        namespace: 'testuser',
        repository_type: 'image',
        status: 1,
        description: 'New repository',
        is_private: false,
        is_automated: false,
        can_edit: true,
        star_count: 0,
        pull_count: 0,
        last_updated: '2024-01-15T12:00:00Z',
        has_starred: false,
        full_size: 0,
        images: [],
        permissions: {,
          read: true,
          write: true,
          admin: true}),
      'PATCH https://hub.docker.com/v2/repositories/testuser/test-app/':
        IntegrationTestHelper.createMockApiResponse({
          user: 'testuser',
          name: 'test-app',
          namespace: 'testuser',
          repository_type: 'image',
          status: 1,
          description: 'Updated test application container',
          is_private: false,
          is_automated: true,
          can_edit: true,
          star_count: 15,
          pull_count: 1250,
          last_updated: '2024-01-15T13:00:00Z',
          has_starred: false,
          full_size: 125000000,
          images: [],
          permissions: {,
            read: true,
            write: true,
            admin: true}),
      'DELETE https://hub.docker.com/v2/repositories/testuser/test-app/': new Response('', {
        status: 202}),
      'GET https://hub.docker.com/v2/repositories/testuser/test-app/tags/':
        IntegrationTestHelper.createMockApiResponse({
          count: 3,
          next: null,
          previous: null,
          results: [
            {
              creator: 12345,
              id: 987654,
              image_id: 'sha256:abc123',
              images: [
                {
                  architecture: 'amd64',
                  features: '',
                  variant: null,
                  digest: 'sha256:def456',
                  os: 'linux',
                  os_features: '',
                  os_version: null,
                  size: 62500000,
                  status: 'active',
                  last_pulled: '2024-01-15T11:00:00Z',
                  last_pushed: '2024-01-15T10:00:00Z'},
              ],
              last_updated: '2024-01-15T10:00:00Z',
              last_updater: 12345,
              last_updater_username: 'testuser',
              name: 'latest',
              repository: 123456,
              full_size: 62500000,
              v2: true,
              tag_status: 'active',
              tag_last_pulled: '2024-01-15T11:00:00Z',
              tag_last_pushed: '2024-01-15T10:00:00Z'},
            {
              creator: 12345,
              id: 987655,
              image_id: 'sha256:xyz789',
              images: [
                {
                  architecture: 'amd64',
                  features: '',
                  variant: null,
                  digest: 'sha256:uvw012',
                  os: 'linux',
                  os_features: '',
                  os_version: null,
                  size: 60000000,
                  status: 'active',
                  last_pulled: '2024-01-14T15:00:00Z',
                  last_pushed: '2024-01-14T14:00:00Z'},
              ],
              last_updated: '2024-01-14T14:00:00Z',
              last_updater: 12345,
              last_updater_username: 'testuser',
              name: 'v1.0',
              repository: 123456,
              full_size: 60000000,
              v2: true,
              tag_status: 'active',
              tag_last_pulled: '2024-01-14T15:00:00Z',
              tag_last_pushed: '2024-01-14T14:00:00Z'},
          ]}),
      'GET https://hub.docker.com/v2/repositories/testuser/test-app/tags/latest/':
        IntegrationTestHelper.createMockApiResponse({
          creator: 12345,
          id: 987654,
          image_id: 'sha256:abc123',
          images: [
            {
              architecture: 'amd64',
              features: '',
              variant: null,
              digest: 'sha256:def456',
              os: 'linux',
              os_features: '',
              os_version: null,
              size: 62500000,
              status: 'active',
              last_pulled: '2024-01-15T11:00:00Z',
              last_pushed: '2024-01-15T10:00:00Z'},
          ],
          last_updated: '2024-01-15T10:00:00Z',
          last_updater: 12345,
          last_updater_username: 'testuser',
          name: 'latest',
          repository: 123456,
          full_size: 62500000,
          v2: true,
          tag_status: 'active',
          tag_last_pulled: '2024-01-15T11:00:00Z',
          tag_last_pushed: '2024-01-15T10:00:00Z'}),
      'DELETE https://hub.docker.com/v2/repositories/testuser/test-app/tags/latest/': new Response(
        '',
        { status: 204 },
      ),
      'GET https://hub.docker.com/v2/repositories/testuser/test-app/webhooks/':
        IntegrationTestHelper.createMockApiResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 111222,
              name: 'CI/CD Webhook',
              webhook_url: 'https://api.example.com/webhook',
              active: true,
              created: '2024-01-01T00Z',
              updated: '2024-01-01T00Z'},
          ]}),
      'POST https://hub.docker.com/v2/repositories/testuser/test-app/webhooks/':
        IntegrationTestHelper.createMockApiResponse({
          id: 222333,
          name: 'New Webhook',
          webhook_url: 'https://api.newservice.com/hook',
          active: true,
          created: '2024-01-15T12:00:00Z',
          updated: '2024-01-15T12:00:00Z'}),
      'PATCH https://hub.docker.com/v2/repositories/testuser/test-app/webhooks/111222/':
        IntegrationTestHelper.createMockApiResponse({
          id: 111222,
          name: 'Updated CI/CD Webhook',
          webhook_url: 'https://api.example.com/webhook',
          active: false,
          created: '2024-01-01T00Z',
          updated: '2024-01-15T12:00:00Z'}),
      'DELETE https://hub.docker.com/v2/repositories/testuser/test-app/webhooks/111222/':
        new Response('', { status: 204 }),
      'GET https://hub.docker.com/v2/repositories/testuser/test-app/buildhistory/':
        IntegrationTestHelper.createMockApiResponse({
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              uuid: 'build-uuid-123',
              build_code: 'ABC123',
              status: 'Success',
              created_date: '2024-01-15T10:00:00Z',
              last_updated: '2024-01-15T10:05:00Z',
              build_path: '/',
              dockerfile_path: 'Dockerfile',
              source_type: 'git',
              source_url: 'https://github.com/testuser/test-app.git',
              commit: 'commit-hash-123',
              pusher: 'testuser'},
            {
              uuid: 'build-uuid-456',
              build_code: 'DEF456',
              status: 'Failed',
              created_date: '2024-01-14T14:00:00Z',
              last_updated: '2024-01-14T14:02:00Z',
              build_path: '/',
              dockerfile_path: 'Dockerfile',
              source_type: 'git',
              source_url: 'https://github.com/testuser/test-app.git',
              commit: 'commit-hash-456',
              pusher: 'testuser'},
          ]}),
      'GET https://hub.docker.com/v2/repositories/testuser/test-app/buildhistory/ABC123/':
        IntegrationTestHelper.createMockApiResponse({
          uuid: 'build-uuid-123',
          build_code: 'ABC123',
          status: 'Success',
          created_date: '2024-01-15T10:00:00Z',
          last_updated: '2024-01-15T10:05:00Z',
          build_path: '/',
          dockerfile_path: 'Dockerfile',
          source_type: 'git',
          source_url: 'https://github.com/testuser/test-app.git',
          commit: 'commit-hash-123',
          pusher: 'testuser'}),
      'GET https://hub.docker.com/v2/search/repositories/':
        IntegrationTestHelper.createMockApiResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              user: 'testuser',
              name: 'test-app',
              namespace: 'testuser',
              repository_type: 'image',
              status: 1,
              description: 'Test application container',
              is_private: false,
              is_automated: true,
              can_edit: false,
              star_count: 15,
              pull_count: 1250,
              last_updated: '2024-01-15T12:00:00Z',
              has_starred: false,
              full_size: 125000000,
              images: [],
              permissions: {,
                read: true,
                write: false,
                admin: false},
          ]})})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with username and password', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        username: 'testuser',
        password: 'testpass'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'test_jwt_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600,
        userId: 'testuser',
        userInfo: {,
          id: 'user123',
          name: 'Test User',
          email: 'test@example.com'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'test_jwt_token',
        'test-user-id',
      )
    })

    it('should authenticate with clientId and clientSecret as fallback', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        clientId: 'testuser',
        clientSecret: 'testpass'})
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
    })

    it('should handle authentication errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(401, 'Unauthorized')),
      )
    }

      const config = IntegrationTestHelper.createMockConfig({
        username: 'invalid',
        password: 'invalid'})

      await expect(integration.authenticate(config)).rejects.toThrow('Authentication failed')
    })
  })

  describe('Connection Status', () => {
    it('should return connected status when authenticated', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockResolvedValue('test_jwt_token')
  }
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(true)
      expect(status.user).toMatchObject({
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com'})
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
      mocks.encryptionService.decryptToken.mockResolvedValue('test_jwt_token')
    })
  }

    it('should sync successfully and return comprehensive data', async () => {
      const config = IntegrationTestHelper.createMockConfig()
    }

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        user: expect.objectContaining({,
          id: 'user123',
          username: 'testuser',
          full_name: 'Test User'}),
        repositories: expect.arrayContaining([
          expect.objectContaining({
            name: 'test-app',
            namespace: 'testuser'}),
        ]),
        webhooks: expect.arrayContaining([
          expect.objectContaining({
            id: 111222,
            name: 'CI/CD Webhook'}),
        ]),
        syncedAt: expect.any(String)})
    })

    it('should handle partial sync failures gracefully', async () => {
      fetchMock.mockImplementationOnce(url => {
        if (url.includes('/webhooks/')) {
          return Promise.resolve(IntegrationTestHelper.createMockErrorResponse(500, 'Server error'))
        }
        return Promise.resolve(IntegrationTestHelper.createMockApiResponse({}))
      })
    }

      const config = IntegrationTestHelper.createMockConfig()

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data.errors).toBeDefined()
    })
  })

  describe('User Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_jwt_token')
    })
  }

    it('should get current user successfully', async () => {
      const _user = await integration.getCurrentUser()
    }

      expect(user).toMatchObject({
        id: 'user123',
        username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com',
        location: 'San Francisco',
        company: 'Test Company'})
    })

    it('should get specific user successfully', async () => {
      const _user = await integration.getUser('testuser')
    }

      expect(user).toMatchObject({
        id: 'user123',
        username: 'testuser',
        full_name: 'Test User'})
    })

    it('should use cached user data on subsequent calls', async () => {
      await integration.getCurrentUser()
    }

      // Clear fetch mock to verify cache usage
      fetchMock.mockClear()
      await integration.getCurrentUser()

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('Repository Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_jwt_token')
    })
  }

    it('should get repositories successfully', async () => {
      const repositories = await integration.getRepositories()
    }

      expect(repositories).toHaveLength(2)
      expect(repositories[0]).toMatchObject({
        name: 'test-app',
        namespace: 'testuser',
        description: 'Test application container',
        is_private: false,
        star_count: 15,
        pull_count: 1250})
    })

    it('should get specific repository successfully', async () => {
      const repository = await integration.getRepository('testuser', 'test-app')
    }

      expect(repository).toMatchObject({
        name: 'test-app',
        namespace: 'testuser',
        description: 'Test application container'})
    })

    it('should create repository successfully', async () => {
      const repository = await integration.createRepository(
        'testuser',
        'new-repo',
        'New repository',
        false,
      )
    }

      expect(repository).toMatchObject({
        name: 'new-repo',
        namespace: 'testuser',
        description: 'New repository',
        is_private: false})
    })

    it('should update repository successfully', async () => {
      const updates = {
        description: 'Updated test application container'}
    }

      const repository = await integration.updateRepository('testuser', 'test-app', updates)

      expect(repository).toMatchObject({
        name: 'test-app',
        description: 'Updated test application container'})
    })

    it('should delete repository successfully', async () => {
      const result = await integration.deleteRepository('testuser', 'test-app')
    }

      expect(result).toBe(true)
    })
  })

  describe('Tags Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_jwt_token')
    })
  }

    it('should get tags successfully', async () => {
      const tags = await integration.getTags('testuser', 'test-app')
    }

      expect(tags).toHaveLength(2)
      expect(tags[0]).toMatchObject({
        name: 'latest',
        repository: 123456,
        full_size: 62500000})
    })

    it('should get specific tag successfully', async () => {
      const tag = await integration.getTag('testuser', 'test-app', 'latest')
    }

      expect(tag).toMatchObject({
        name: 'latest',
        repository: 123456,
        full_size: 62500000})
    })

    it('should delete tag successfully', async () => {
      const result = await integration.deleteTag('testuser', 'test-app', 'latest')
    }

      expect(result).toBe(true)
    })

    it('should cache tags data', async () => {
      await integration.getTags('testuser', 'test-app')
    }

      // Verify cache is populated
      expect(integration['tagsCache'].size).toBeGreaterThan(0)
    })
  })

  describe('Webhooks Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_jwt_token')
    })
  }

    it('should get webhooks successfully', async () => {
      const webhooks = await integration.getWebhooks('testuser', 'test-app')
    }

      expect(webhooks).toHaveLength(1)
      expect(webhooks[0]).toMatchObject({
        id: 111222,
        name: 'CI/CD Webhook',
        webhook_url: 'https://api.example.com/webhook',
        active: true})
    })

    it('should create webhook successfully', async () => {
      const webhook = await integration.createWebhook(
        'testuser',
        'test-app',
        'https://api.newservice.com/hook',
        'New Webhook',
      )
    }

      expect(webhook).toMatchObject({
        id: 222333,
        name: 'New Webhook',
        webhook_url: 'https://api.newservice.com/hook',
        active: true})
    })

    it('should update webhook successfully', async () => {
      const updates = {
        name: 'Updated CI/CD Webhook',
        active: false}
    }

      const webhook = await integration.updateWebhook('testuser', 'test-app', 111222, updates)

      expect(webhook).toMatchObject({
        id: 111222,
        name: 'Updated CI/CD Webhook',
        active: false})
    })

    it('should delete webhook successfully', async () => {
      const result = await integration.deleteWebhook('testuser', 'test-app', 111222)
    }

      expect(result).toBe(true)
    })
  })

  describe('Builds Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_jwt_token')
    })
  }

    it('should get builds successfully', async () => {
      const builds = await integration.getBuilds('testuser', 'test-app')
    }

      expect(builds).toHaveLength(2)
      expect(builds[0]).toMatchObject({
        uuid: 'build-uuid-123',
        build_code: 'ABC123',
        status: 'Success',
        source_type: 'git',
        pusher: 'testuser'})
    })

    it('should get specific build successfully', async () => {
      const build = await integration.getBuild('testuser', 'test-app', 'ABC123')
    }

      expect(build).toMatchObject({
        uuid: 'build-uuid-123',
        build_code: 'ABC123',
        status: 'Success'})
    })
  })

  describe('Search', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_jwt_token')
    })
  }

    it('should search repositories successfully', async () => {
      const repositories = await integration.searchRepositories('test')
    }

      expect(repositories).toHaveLength(1)
      expect(repositories[0]).toMatchObject({
        name: 'test-app',
        namespace: 'testuser',
        description: 'Test application container'})
    })
  })

  describe('Webhook Handling', () => {
    it('should process push webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          push_data: {
            tag: 'latest',
            pushed_at: 1640995200,
            pusher: 'testuser'},
          repository: {,
            repo_name: 'testuser/test-app',
            name: 'test-app',
            namespace: 'testuser',
            status: 'Active'}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process repository webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          repository: {
            name: 'test-app',
            namespace: 'testuser',
            status: 'Active',
            repo_url: 'https://hub.docker.com/r/testuser/test-app/'}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should handle webhook processing errors gracefully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {},
        body: 'invalid json',
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).rejects.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle API rate limiting', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(429, 'Too Many Requests')),
      )
  }
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('test_jwt_token')

      await expect(integration.getCurrentUser()).rejects.toThrow('API request failed')
    })

    it('should handle network errors gracefully', async () => {
      fetchMock.mockImplementationOnce(() => Promise.reject(new Error('Network error')))
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('test_jwt_token')

      await expect(integration.getCurrentUser()).rejects.toThrow('Network error')
    })

    it('should handle invalid API credentials', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(401, 'Unauthorized')),
      )
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('invalid_token')

      await expect(integration.getCurrentUser()).rejects.toThrow('API request failed')
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_jwt_token')
    })
  }

    it('should cache user information', async () => {
      await integration.getCurrentUser()
    }

      // Second call should use cache
      fetchMock.mockClear()
      await integration.getCurrentUser()

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should cache repositories and tags', async () => {
      await integration.getRepository('testuser', 'test-app')
      await integration.getTags('testuser', 'test-app')
    }

      // Verify cache is populated
      expect(integration['repositoriesCache'].size).toBeGreaterThan(0)
      expect(integration['tagsCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getCurrentUser()
      await integration.getRepository('testuser', 'test-app')
    }

      integration.clearCache()

      expect(integration['userCache']).toBeNull()
      expect(integration['repositoriesCache'].size).toBe(0)
      expect(integration['tagsCache'].size).toBe(0)
      expect(integration['webhooksCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'containers',
        'repositories',
        'images',
        'webhooks',
        'builds',
        'registry',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('docker-hub')
      expect(integration.name).toBe('Docker Hub')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
