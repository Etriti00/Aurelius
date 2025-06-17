import { User } from '@prisma/client';
import { IFTTTIntegration } from '../../ifttt/ifttt.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('IFTTTIntegration', () => {
  let integration: IFTTTIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(IFTTTIntegration, 'ifttt')
    integration = setup.integration
    mocks = setup.mocks
}
  }

    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://connect.ifttt.com/v1/oauth/token': IntegrationTestHelper.createMockApiResponse({,
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test_refresh_token'}),
      'GET https://connect.ifttt.com/v1/user/info': IntegrationTestHelper.createMockApiResponse({,
        data: {
          id: 'user123',
          email: 'user@example.com',
          name: 'John Doe',
          timezone: 'America/New_York',
          country: 'US',
          language: 'en',
          created_at: '2024-01-01T00Z',
          features: ['applets', 'pro'],
          plan: 'pro'}),
      'GET https://connect.ifttt.com/v1/user/applets': IntegrationTestHelper.createMockApiResponse({,
        data: [
          {
            id: 'applet123',
            name: 'Weather to Email',
            description: 'Send weather forecast to email daily',
            published: true,
            status: 'enabled',
            url: 'https://ifttt.com/applets/applet123',
            user: {,
              id: 'user123',
              name: 'John Doe'},
            services: [
              {
                id: 'weather',
                name: 'Weather Underground',
                short_name: 'weather',
                logo_url: 'https://ifttt.com/images/weather.png'},
              {
                id: 'email',
                name: 'Email',
                short_name: 'email',
                logo_url: 'https://ifttt.com/images/email.png'},
            ],
            created_at: '2024-01-01T00Z',
            updated_at: '2024-01-01T00Z',
            embedded: {,
              trigger: {
                type: 'weather_forecast',
                service: {,
                  id: 'weather',
                  name: 'Weather Underground',
                  short_name: 'weather'},
              actions: [
                {
                  type: 'send_email',
                  service: {,
                    id: 'email',
                    name: 'Email',
                    short_name: 'email'},
              ]},
        ]}),
      'GET https://connect.ifttt.com/v1/services': IntegrationTestHelper.createMockApiResponse({,
        data: [
          {
            id: 'weather',
            name: 'Weather Underground',
            short_name: 'weather',
            description: 'Weather information and forecasts',
            status: 'published',
            logo_url: 'https://ifttt.com/images/weather.png',
            branding_color: '#FF6600',
            url: 'https://www.wunderground.com',
            channel_url: 'https://ifttt.com/weather',
            has_triggers: true,
            has_actions: false,
            embed_actions: false,
            embed_triggers: true},
          {
            id: 'email',
            name: 'Email',
            short_name: 'email',
            description: 'Send and receive email',
            status: 'published',
            logo_url: 'https://ifttt.com/images/email.png',
            branding_color: '#0099CC',
            url: 'https://ifttt.com/email',
            channel_url: 'https://ifttt.com/email',
            has_triggers: false,
            has_actions: true,
            embed_actions: true,
            embed_triggers: false},
        ]}),
      'GET https://connect.ifttt.com/v1/user/connections':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'conn123',
              service_id: 'weather',
              service_name: 'Weather Underground',
              status: 'connected',
              created_at: '2024-01-01T00Z',
              updated_at: '2024-01-01T00Z',
              user_id: 'user123'},
          ]}),
      'GET https://connect.ifttt.com/v1/user/applets/applet123':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'applet123',
            name: 'Weather to Email',
            description: 'Send weather forecast to email daily',
            published: true,
            status: 'enabled',
            url: 'https://ifttt.com/applets/applet123'}),
      'POST https://connect.ifttt.com/v1/user/applets/applet123/enable':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'applet123',
            status: 'enabled'}),
      'POST https://connect.ifttt.com/v1/user/applets/applet123/disable':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'applet123',
            status: 'disabled'}),
      'POST https://connect.ifttt.com/v1/user/applets': IntegrationTestHelper.createMockApiResponse(
        {
          data: {,
            id: 'new_applet456',
            name: 'New Automation',
            status: 'enabled',
            created_at: '2024-01-15T12:00:00Z'},
      ),
      'GET https://connect.ifttt.com/v1/services/weather':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'weather',
            name: 'Weather Underground',
            short_name: 'weather',
            description: 'Weather information and forecasts',
            status: 'published'}),
      'GET https://connect.ifttt.com/v1/services/weather/triggers':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              type: 'weather_forecast',
              service: 'weather',
              service_id: 'weather',
              service_name: 'Weather Underground',
              description: 'Daily weather forecast',
              trigger_fields: [
                {
                  name: 'location',
                  type: 'string',
                  required: true},
                {
                  name: 'time',
                  type: 'time',
                  required: false},
              ]},
          ]}),
      'GET https://connect.ifttt.com/v1/services/email/actions':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              type: 'send_email',
              service: 'email',
              service_id: 'email',
              service_name: 'Email',
              description: 'Send an email',
              action_fields: [
                {
                  name: 'to',
                  type: 'email',
                  required: true},
                {
                  name: 'subject',
                  type: 'string',
                  required: true},
                {
                  name: 'body',
                  type: 'text',
                  required: false},
              ]},
          ]}),
      'POST https://connect.ifttt.com/v1/user/connections':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'new_conn789',
            service_id: 'email',
            service_name: 'Email',
            status: 'connected',
            created_at: '2024-01-15T12:00:00Z',
            user_id: 'user123'}),
      'DELETE https://connect.ifttt.com/v1/user/connections/conn123': new Response('', {
        status: 204}),
      'POST https://connect.ifttt.com/v1/webhooks/test_webhook_key':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            result: 'OK'}),
      'GET https://connect.ifttt.com/v1/applets/search':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'search_result1',
              name: 'Weather Alert',
              description: 'Get weather alerts',
              published: true},
          ]}),
      'GET https://connect.ifttt.com/v1/services/search':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'gmail',
              name: 'Gmail',
              short_name: 'gmail',
              description: 'Google Gmail service'},
          ]})})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with authorization code', async () => {
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
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(401, 'Unauthorized')),
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
        applets: expect.arrayContaining([
          expect.objectContaining({
            id: 'applet123',
            name: 'Weather to Email',
            status: 'enabled'}),
        ]),
        services: expect.arrayContaining([
          expect.objectContaining({
            id: 'weather',
            name: 'Weather Underground'}),
        ]),
        connections: expect.arrayContaining([
          expect.objectContaining({
            id: 'conn123',
            service_name: 'Weather Underground',
            status: 'connected'}),
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
        name: 'John Doe',
        plan: 'pro',
        features: ['applets', 'pro']})
    })
  })

  describe('Applets Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get applets successfully', async () => {
      const applets = await integration.getApplets()
    }

      expect(applets).toHaveLength(1)
      expect(applets[0]).toMatchObject({
        id: 'applet123',
        name: 'Weather to Email',
        description: 'Send weather forecast to email daily',
        status: 'enabled',
        published: true})
    })

    it('should get specific applet successfully', async () => {
      const applet = await integration.getApplet('applet123')
    }

      expect(applet).toMatchObject({
        id: 'applet123',
        name: 'Weather to Email',
        status: 'enabled'})
    })

    it('should enable applet successfully', async () => {
      const applet = await integration.enableApplet('applet123')
    }

      expect(applet).toMatchObject({
        id: 'applet123',
        status: 'enabled'})
    })

    it('should disable applet successfully', async () => {
      const applet = await integration.disableApplet('applet123')
    }

      expect(applet).toMatchObject({
        id: 'applet123',
        status: 'disabled'})
    })

    it('should create applet successfully', async () => {
      const applet = await integration.createApplet(
        'weather',
        'weather_forecast',
        { location: 'New York' },
        'email',
        'send_email',
        { to: 'user@example.com', subject: 'Weather Update' },
      )
    }

      expect(applet).toMatchObject({
        id: 'new_applet456',
        name: 'New Automation',
        status: 'enabled'})
    })
  })

  describe('Services Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get services successfully', async () => {
      const services = await integration.getServices()
    }

      expect(services).toHaveLength(2)
      expect(services[0]).toMatchObject({
        id: 'weather',
        name: 'Weather Underground',
        short_name: 'weather',
        has_triggers: true,
        has_actions: false})
    })

    it('should get specific service successfully', async () => {
      const service = await integration.getService('weather')
    }

      expect(service).toMatchObject({
        id: 'weather',
        name: 'Weather Underground',
        short_name: 'weather'})
    })
  })

  describe('Triggers Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get service triggers successfully', async () => {
      const triggers = await integration.getServiceTriggers('weather')
    }

      expect(triggers).toHaveLength(1)
      expect(triggers[0]).toMatchObject({
        type: 'weather_forecast',
        service: 'weather',
        service_name: 'Weather Underground',
        trigger_fields: expect.arrayContaining([
          expect.objectContaining({
            name: 'location',
            type: 'string',
            required: true}),
        ])})
    })
  })

  describe('Actions Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get service actions successfully', async () => {
      const actions = await integration.getServiceActions('email')
    }

      expect(actions).toHaveLength(1)
      expect(actions[0]).toMatchObject({
        type: 'send_email',
        service: 'email',
        service_name: 'Email',
        action_fields: expect.arrayContaining([
          expect.objectContaining({
            name: 'to',
            type: 'email',
            required: true}),
        ])})
    })
  })

  describe('Connections Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get connections successfully', async () => {
      const connections = await integration.getConnections()
    }

      expect(connections).toHaveLength(1)
      expect(connections[0]).toMatchObject({
        id: 'conn123',
        service_id: 'weather',
        service_name: 'Weather Underground',
        status: 'connected'})
    })

    it('should connect service successfully', async () => {
      const connection = await integration.connectService('email')
    }

      expect(connection).toMatchObject({
        id: 'new_conn789',
        service_id: 'email',
        service_name: 'Email',
        status: 'connected'})
    })

    it('should disconnect service successfully', async () => {
      const result = await integration.disconnectService('conn123')
    }

      expect(result).toBe(true)
    })
  })

  describe('Webhooks Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should trigger webhook _event successfully', async () => {
      const result = await integration.triggerWebhookEvent('test_webhook_key', {
        temperature: 72,
        location: 'New York'})
    }

      expect(result).toBe(true)
    })
  })

  describe('Search and Discovery', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should search applets successfully', async () => {
      const applets = await integration.searchApplets('weather')
    }

      expect(applets).toHaveLength(1)
      expect(applets[0]).toMatchObject({
        id: 'search_result1',
        name: 'Weather Alert',
        published: true})
    })

    it('should search services successfully', async () => {
      const services = await integration.searchServices('gmail')
    }

      expect(services).toHaveLength(1)
      expect(services[0]).toMatchObject({
        id: 'gmail',
        name: 'Gmail',
        short_name: 'gmail'})
    })
  })

  describe('Webhook Handling', () => {
    it('should process trigger webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          trigger_identity: 'weather_trigger_123',
          webhook_id: 'webhook123',
          user_id: 'user123',
          occurred_at: '2024-01-15T12:00:00Z',
          data: {,
            temperature: 72,
            condition: 'sunny'}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process applet webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          applet_id: 'applet123',
          event_type: 'applet_enabled'}),
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
      await integration.getApplets()
      await integration.getServices()
    }

      expect(integration['appletsCache'].size).toBeGreaterThan(0)
      expect(integration['servicesCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getApplets()
      await integration.getServices()
    }

      integration.clearCache()

      expect(integration['servicesCache'].size).toBe(0)
      expect(integration['appletsCache'].size).toBe(0)
      expect(integration['connectionsCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'applets',
        'services',
        'triggers',
        'actions',
        'connections',
        'webhooks',
        'automation',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('ifttt')
      expect(integration.name).toBe('IFTTT')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
