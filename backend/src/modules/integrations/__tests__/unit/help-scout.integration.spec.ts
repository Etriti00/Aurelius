import { HelpScoutIntegration } from '../../help-scout/help-scout.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('HelpScoutIntegration', () => {
  let integration: HelpScoutIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(
      HelpScoutIntegration,
      'help-scout',
    )
    integration = setup.integration
    mocks = setup.mocks
}
  }

    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://api.helpscout.net/v2/oauth2/token': IntegrationTestHelper.createMockApiResponse(
        {
          access_token: 'test_access_token',
          token_type: 'Bearer',
          expires_in: 3600},
      ),
      'GET https://api.helpscout.net/v2/users/me': IntegrationTestHelper.createMockApiResponse({,
        id: 123456,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@company.com',
        role: 'admin',
        timezone: 'America/New_York',
        photoUrl: 'https://avatar.url',
        createdAt: '2024-01-01T00Z',
        updatedAt: '2024-01-01T00Z'}),
      'GET https://api.helpscout.net/v2/conversations': IntegrationTestHelper.createMockApiResponse(
        {
          _embedded: {,
            conversations: [
              {
                id: 789012,
                number: 12345,
                type: 'email',
                folderId: 1,
                status: 'active',
                state: 'published',
                subject: 'Help with login',
                preview: 'I cannot log into my account',
                mailbox: {,
                  id: 1,
                  name: 'Support'},
                customer: {,
                  id: 456789,
                  firstName: 'Jane',
                  lastName: 'Smith',
                  email: 'jane@example.com'},
                createdBy: {,
                  id: 123456,
                  firstName: 'John',
                  lastName: 'Doe',
                  email: 'john@company.com'},
                createdAt: '2024-01-01T10:00:00Z',
                updatedAt: '2024-01-01T11:00:00Z',
                tags: ['login', 'urgent'],
                threadCount: 3},
            ]},
      ),
      'GET https://api.helpscout.net/v2/customers': IntegrationTestHelper.createMockApiResponse({,
        _embedded: {
          customers: [
            {
              id: 456789,
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane@example.com',
              phone: '+1234567890',
              photoUrl: 'https://customer-avatar.url',
              createdAt: '2024-01-01T09:00:00Z',
              updatedAt: '2024-01-01T09:00:00Z',
              location: 'San Francisco, CA',
              organization: 'Tech Corp',
              jobTitle: 'Developer',
              photoType: 'gravatar',
              address: {,
                city: 'San Francisco',
                state: 'CA',
                postalCode: '94105',
                country: 'US'},
              emails: [
                {
                  id: 1,
                  value: 'jane@example.com',
                  type: 'work'},
              ],
              phones: [
                {
                  id: 1,
                  value: '+1234567890',
                  type: 'work'},
              ],
              socialProfiles: [],
              chats: [],
              websites: []},
          ]}),
      'GET https://api.helpscout.net/v2/users': IntegrationTestHelper.createMockApiResponse({,
        _embedded: {
          users: [
            {
              id: 123456,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@company.com',
              role: 'admin',
              timezone: 'America/New_York',
              photoUrl: 'https://avatar.url',
              createdAt: '2024-01-01T00Z',
              updatedAt: '2024-01-01T00Z'},
          ]}),
      'GET https://api.helpscout.net/v2/mailboxes': IntegrationTestHelper.createMockApiResponse({,
        _embedded: { mailboxes: [
            {
              id: 1,
              name: 'Support',
              email: 'support@company.com',
              slug: 'support',
              userId: 123456,
              userEmail: 'john@company.com',
              createdAt: '2024-01-01T00Z',
              updatedAt: '2024-01-01T00Z'},
          ]}),
      'POST https://api.helpscout.net/v2/conversations':
        IntegrationTestHelper.createMockApiResponse({
          id: 999888}),
      'GET https://api.helpscout.net/v2/conversations/789012':
        IntegrationTestHelper.createMockApiResponse({
          id: 789012,
          number: 12345,
          type: 'email',
          status: 'active',
          subject: 'Help with login',
          preview: 'I cannot log into my account',
          mailbox: {,
            id: 1,
            name: 'Support'},
          customer: {,
            id: 456789,
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com'},
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T11:00:00Z',
          tags: ['login', 'urgent']}),
      'PATCH https://api.helpscout.net/v2/conversations/789012': new Response('', { status: 204 }),
      'GET https://api.helpscout.net/v2/conversations/789012/threads':
        IntegrationTestHelper.createMockApiResponse({
          _embedded: {,
            threads: [
              {
                id: 111222,
                type: 'customer',
                status: 'active',
                state: 'published',
                body: 'I cannot log into my account',
                source: {,
                  type: 'email',
                  via: 'customer'},
                customer: {,
                  id: 456789,
                  firstName: 'Jane',
                  lastName: 'Smith',
                  email: 'jane@example.com'},
                createdAt: '2024-01-01T10:00:00Z',
                updatedAt: '2024-01-01T10:00:00Z',
                attachments: []},
            ]}),
      'POST https://api.helpscout.net/v2/conversations/789012/threads':
        IntegrationTestHelper.createMockApiResponse({
          id: 333444,
          type: 'reply',
          text: 'Let me help you with that login issue.'}),
      'POST https://api.helpscout.net/v2/customers': IntegrationTestHelper.createMockApiResponse({,
        id: 777666}),
      'GET https://api.helpscout.net/v2/customers/456789':
        IntegrationTestHelper.createMockApiResponse({
          id: 456789,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          createdAt: '2024-01-01T09:00:00Z',
          updatedAt: '2024-01-01T09:00:00Z'}),
      'PUT https://api.helpscout.net/v2/customers/456789': new Response('', { status: 204 }),
      'GET https://api.helpscout.net/v2/reports/conversations':
        IntegrationTestHelper.createMockApiResponse({
          filterTags: [],
          current: {,
            startDate: '2024-01-01',
            endDate: '2024-01-07',
            totalConversations: 150,
            newConversations: 45,
            totalCustomers: 89}),
      'GET https://api.helpscout.net/v2/reports/productivity':
        IntegrationTestHelper.createMockApiResponse({
          current: {,
            startDate: '2024-01-01',
            endDate: '2024-01-07',
            totalReplies: 234,
            repliesPerDay: 33.4,
            resolutionTime: 4.2})})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with client credentials', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'test_access_token',
        expiresIn: 3600,
        userId: '123456',
        userInfo: {,
          id: '123456',
          name: 'John Doe',
          email: 'john@company.com'})
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
        id: '123456',
        name: 'John Doe',
        email: 'john@company.com'})
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
        users: expect.arrayContaining([
          expect.objectContaining({
            id: 123456,
            firstName: 'John',
            lastName: 'Doe'}),
        ]),
        mailboxes: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            name: 'Support'}),
        ]),
        customers: expect.arrayContaining([
          expect.objectContaining({
            id: 456789,
            firstName: 'Jane'}),
        ]),
        conversations: expect.arrayContaining([
          expect.objectContaining({
            id: 789012,
            subject: 'Help with login'}),
        ]),
        syncedAt: expect.any(String)})
    })
  })

  describe('Conversations Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get conversations successfully', async () => {
      const conversations = await integration.getConversations()
    }

      expect(conversations).toHaveLength(1)
      expect(conversations[0]).toMatchObject({
        id: 789012,
        number: 12345,
        subject: 'Help with login',
        status: 'active',
        tags: ['login', 'urgent']})
    })

    it('should get specific conversation successfully', async () => {
      const conversation = await integration.getConversation(789012)
    }

      expect(conversation).toMatchObject({
        id: 789012,
        subject: 'Help with login',
        status: 'active'})
    })

    it('should create conversation successfully', async () => {
      const conversation = await integration.createConversation(
        'New Support Request',
        456789,
        1,
        'I need help with setup',
      )
    }

      expect(conversation).toMatchObject({
        id: 789012,
        subject: 'Help with login'})
    })

    it('should update conversation status successfully', async () => {
      const result = await integration.updateConversationStatus(789012, 'closed')
    }

      expect(result).toBe(true)
    })

    it('should assign conversation successfully', async () => {
      const result = await integration.assignConversation(789012, 123456)
    }

      expect(result).toBe(true)
    })
  })

  describe('Conversation Threads', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get conversation threads successfully', async () => {
      const threads = await integration.getConversationThreads(789012)
    }

      expect(threads).toHaveLength(1)
      expect(threads[0]).toMatchObject({
        id: 111222,
        type: 'customer',
        body: 'I cannot log into my account'})
    })

    it('should create thread successfully', async () => {
      const thread = await integration.createThread(
        789012,
        'Let me help you with that login issue.',
        'reply',
      )
    }

      expect(thread).toMatchObject({
        id: 333444,
        type: 'reply',
        text: 'Let me help you with that login issue.'})
    })
  })

  describe('Customers Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get customers successfully', async () => {
      const customers = await integration.getCustomers()
    }

      expect(customers).toHaveLength(1)
      expect(customers[0]).toMatchObject({
        id: 456789,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        organization: 'Tech Corp'})
    })

    it('should get specific customer successfully', async () => {
      const customer = await integration.getCustomer(456789)
    }

      expect(customer).toMatchObject({
        id: 456789,
        firstName: 'Jane',
        lastName: 'Smith'})
    })

    it('should create customer successfully', async () => {
      const customer = await integration.createCustomer('Bob', 'Johnson', 'bob@example.com')
    }

      expect(customer).toMatchObject({
        id: 456789,
        firstName: 'Jane'})
    })

    it('should update customer successfully', async () => {
      const updates = {
        firstName: 'Janet',
        organization: 'New Corp'}
    }

      const customer = await integration.updateCustomer(456789, updates)

      expect(customer).toMatchObject({
        id: 456789,
        firstName: 'Jane'})
    })
  })

  describe('Users Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get users successfully', async () => {
      const users = await integration.getUsers()
    }

      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        id: 123456,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@company.com',
        role: 'admin'})
    })

    it('should get current user successfully', async () => {
      const _user = await integration.getCurrentUser()
    }

      expect(user).toMatchObject({
        id: 123456,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@company.com'})
    })
  })

  describe('Mailboxes Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get mailboxes successfully', async () => {
      const mailboxes = await integration.getMailboxes()
    }

      expect(mailboxes).toHaveLength(1)
      expect(mailboxes[0]).toMatchObject({
        id: 1,
        name: 'Support',
        email: 'support@company.com',
        slug: 'support'})
    })
  })

  describe('Reports', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get conversations report successfully', async () => {
      const report = await integration.getConversationsReport('2024-01-01', '2024-01-07')
    }

      expect(report).toMatchObject({
        current: {,
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          totalConversations: 150,
          newConversations: 45})
      }
    })

    it('should get productivity report successfully', async () => {
      const report = await integration.getProductivityReport('2024-01-01', '2024-01-07', [123456])
    }

      expect(report).toMatchObject({
        current: {,
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          totalReplies: 234,
          repliesPerDay: 33.4})
      }
    })
  })

  describe('Webhook Handling', () => {
    it('should process conversation webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          type: 'conversation',
          id: 789012,
          eventType: 'conversation.status'}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process customer webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          type: 'customer',
          id: 456789,
          eventType: 'customer.created'}),
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
      await integration.getConversations()
      await integration.getCustomers()
    }

      expect(integration['conversationsCache'].size).toBeGreaterThan(0)
      expect(integration['customersCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getConversations()
      await integration.getCustomers()
    }

      integration.clearCache()

      expect(integration['conversationsCache'].size).toBe(0)
      expect(integration['customersCache'].size).toBe(0)
      expect(integration['usersCache'].size).toBe(0)
      expect(integration['mailboxesCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'conversations',
        'customers',
        'reports',
        'users',
        'mailboxes',
        'webhooks',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('help-scout')
      expect(integration.name).toBe('Help Scout')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
