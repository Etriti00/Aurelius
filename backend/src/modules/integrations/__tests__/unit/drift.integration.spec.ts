import { DriftIntegration } from '../../drift/drift.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('DriftIntegration', () => {
  let integration: DriftIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(DriftIntegration, 'drift')
    integration = setup.integration
    mocks = setup.mocks
}
  }

    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://driftapi.com/oauth2/token': IntegrationTestHelper.createMockApiResponse({,
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600}),
      'GET https://driftapi.com/users/me': IntegrationTestHelper.createMockApiResponse({,
        data: { id: 123456,
          name: 'John Doe',
          email: 'john@company.com',
          role: 'admin',
          verified: true,
          userId: 123456,
          orgId: 789012,
          createdAt: 1640995200,
          bot: false}),
      'GET https://driftapi.com/conversations': IntegrationTestHelper.createMockApiResponse({,
        data: [
          {
            id: 111222,
            status: 'open',
            inboxId: 1,
            contactId: 456789,
            assigneeId: 123456,
            createdAt: 1640995200,
            updatedAt: 1640995260,
            numMessages: 3,
            preview: 'Hi, I need help with pricing',
            subject: 'Pricing Question',
            tags: ['pricing', 'sales'],
            participantUserIds: [123456],
            priority: 1,
            read: false},
        ]}),
      'GET https://driftapi.com/contacts': IntegrationTestHelper.createMockApiResponse({,
        data: [
          {
            id: 456789,
            attributes: {,
              name: 'Jane Smith',
              email: 'jane@example.com',
              phone: '+1234567890',
              company: 'Tech Corp',
              website: 'https://techcorp.com',
              tags: ['lead', 'enterprise']},
            createdAt: 1640995200,
            updatedAt: 1640995200},
        ]}),
      'GET https://driftapi.com/users': IntegrationTestHelper.createMockApiResponse({,
        data: [
          {
            id: 123456,
            name: 'John Doe',
            email: 'john@company.com',
            role: 'admin',
            verified: true,
            userId: 123456,
            orgId: 789012,
            createdAt: 1640995200,
            bot: false},
        ]}),
      'GET https://driftapi.com/inboxes': IntegrationTestHelper.createMockApiResponse({,
        data: [
          {
            id: 1,
            name: 'Sales Inbox',
            orgId: 789012,
            createdAt: 1640995200,
            presentationType: 'chat',
            behavior: {,
              showTeammatePhotos: true,
              hideOnMobile: false,
              hideOnTablet: false,
              includeQueryParams: false},
            theme: {,
              primaryColor: '#007bff',
              backgroundColor: '#ffffff',
              textColor: '#333333'},
        ]}),
      'GET https://driftapi.com/conversations/111222': IntegrationTestHelper.createMockApiResponse({,
        data: {
          id: 111222,
          status: 'open',
          inboxId: 1,
          contactId: 456789,
          assigneeId: 123456,
          createdAt: 1640995200,
          updatedAt: 1640995260,
          numMessages: 3,
          tags: ['pricing', 'sales']}),
      'PATCH https://driftapi.com/conversations/111222':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 111222,
            status: 'closed',
            assigneeId: 123456}),
      'GET https://driftapi.com/conversations/111222/messages':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            messages: [
              {
                id: 333444,
                conversationId: 111222,
                authorId: 456789,
                type: 'chat',
                body: 'Hi, I need help with pricing',
                createdAt: 1640995200,
                attachments: []},
              {
                id: 333445,
                conversationId: 111222,
                authorId: 123456,
                type: 'chat',
                body: 'I can help you with that! What specific pricing information do you need?',
                createdAt: 1640995260,
                attachments: []},
            ]}),
      'POST https://driftapi.com/conversations/111222/messages':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 333446,
            conversationId: 111222,
            type: 'chat',
            body: 'Let me get that information for you.'}),
      'GET https://driftapi.com/contacts/456789': IntegrationTestHelper.createMockApiResponse({,
        data: {
          id: 456789,
          attributes: {,
            name: 'Jane Smith',
            email: 'jane@example.com',
            company: 'Tech Corp'},
          createdAt: 1640995200,
          updatedAt: 1640995200}),
      'POST https://driftapi.com/contacts': IntegrationTestHelper.createMockApiResponse({,
        data: {
          id: 777888,
          attributes: {,
            name: 'Bob Johnson',
            email: 'bob@example.com'},
          createdAt: 1640995300,
          updatedAt: 1640995300}),
      'PATCH https://driftapi.com/contacts/456789': IntegrationTestHelper.createMockApiResponse({,
        data: {
          id: 456789,
          attributes: {,
            name: 'Jane Smith',
            email: 'jane@example.com',
            company: 'Updated Corp'}),
      'GET https://driftapi.com/campaigns': IntegrationTestHelper.createMockApiResponse({,
        data: [
          {
            id: 555666,
            name: 'Welcome Campaign',
            status: 'active',
            type: 'targeting',
            orgId: 789012,
            userId: 123456,
            createdAt: 1640995200,
            updatedAt: 1640995200,
            stats: {,
              views: 1250,
              conversations: 45,
              emails: 120,
              replies: 23},
        ]}),
      'GET https://driftapi.com/playbooks': IntegrationTestHelper.createMockApiResponse({,
        data: [
          {
            id: 999000,
            name: 'Lead Qualification',
            description: 'Qualify incoming leads',
            enabled: true,
            createdAt: 1640995200,
            updatedAt: 1640995200,
            orgId: 789012,
            userId: 123456,
            conditions: [
              {
                type: 'url_contains',
                value: 'pricing'},
            ],
            actions: [
              {
                type: 'send_message',
                value: 'How can I help you with pricing?'},
            ]},
        ]})})
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
            name: 'John Doe',
            email: 'john@company.com'}),
        ]),
        contacts: expect.arrayContaining([
          expect.objectContaining({
            id: 456789,
            attributes: expect.objectContaining({,
              name: 'Jane Smith',
              email: 'jane@example.com'})}),
        ]),
        conversations: expect.arrayContaining([
          expect.objectContaining({
            id: 111222,
            status: 'open',
            tags: ['pricing', 'sales']}),
        ]),
        inboxes: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            name: 'Sales Inbox'}),
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
        id: 111222,
        status: 'open',
        inboxId: 1,
        contactId: 456789,
        tags: ['pricing', 'sales']})
    })

    it('should get specific conversation successfully', async () => {
      const conversation = await integration.getConversation(111222)
    }

      expect(conversation).toMatchObject({
        id: 111222,
        status: 'open',
        inboxId: 1})
    })

    it('should update conversation status successfully', async () => {
      const conversation = await integration.updateConversationStatus(111222, 'closed')
    }

      expect(conversation).toMatchObject({
        id: 111222,
        status: 'closed'})
    })

    it('should assign conversation successfully', async () => {
      const conversation = await integration.assignConversation(111222, 123456)
    }

      expect(conversation).toMatchObject({
        id: 111222,
        assigneeId: 123456})
    })
  })

  describe('Messages Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get conversation messages successfully', async () => {
      const messages = await integration.getConversationMessages(111222)
    }

      expect(messages).toHaveLength(2)
      expect(messages[0]).toMatchObject({
        id: 333444,
        conversationId: 111222,
        type: 'chat',
        body: 'Hi, I need help with pricing'})
    })

    it('should send message successfully', async () => {
      const message = await integration.sendMessage(
        111222,
        'Let me get that information for you.',
        'chat',
      )
    }

      expect(message).toMatchObject({
        id: 333446,
        conversationId: 111222,
        type: 'chat',
        body: 'Let me get that information for you.'})
    })
  })

  describe('Contacts Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get contacts successfully', async () => {
      const contacts = await integration.getContacts()
    }

      expect(contacts).toHaveLength(1)
      expect(contacts[0]).toMatchObject({
        id: 456789,
        attributes: {,
          name: 'Jane Smith',
          email: 'jane@example.com',
          company: 'Tech Corp'})
      }
    })

    it('should get specific contact successfully', async () => {
      const contact = await integration.getContact(456789)
    }

      expect(contact).toMatchObject({
        id: 456789,
        attributes: {,
          name: 'Jane Smith',
          email: 'jane@example.com'})
      }
    })

    it('should create contact successfully', async () => {
      const contact = await integration.createContact(
        'bob@example.com',
        'Bob Johnson',
        '+9876543210',
        'New Corp',
      )
    }

      expect(contact).toMatchObject({
        id: 777888,
        attributes: {,
          name: 'Bob Johnson',
          email: 'bob@example.com'})
      }
    })

    it('should update contact successfully', async () => {
      const contact = await integration.updateContact(456789, {
        company: 'Updated Corp'})
    }

      expect(contact).toMatchObject({
        id: 456789,
        attributes: {,
          company: 'Updated Corp'})
      }
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
        name: 'John Doe',
        email: 'john@company.com',
        role: 'admin'})
    })

    it('should get current user successfully', async () => {
      const _user = await integration.getCurrentUser()
    }

      expect(user).toMatchObject({
        id: 123456,
        name: 'John Doe',
        email: 'john@company.com'})
    })
  })

  describe('Campaigns Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get campaigns successfully', async () => {
      const campaigns = await integration.getCampaigns()
    }

      expect(campaigns).toHaveLength(1)
      expect(campaigns[0]).toMatchObject({
        id: 555666,
        name: 'Welcome Campaign',
        status: 'active',
        type: 'targeting'})
    })
  })

  describe('Playbooks Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get playbooks successfully', async () => {
      const playbooks = await integration.getPlaybooks()
    }

      expect(playbooks).toHaveLength(1)
      expect(playbooks[0]).toMatchObject({
        id: 999000,
        name: 'Lead Qualification',
        enabled: true,
        conditions: expect.any(Array),
        actions: expect.any(Array)})
    })
  })

  describe('Inboxes Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get inboxes successfully', async () => {
      const inboxes = await integration.getInboxes()
    }

      expect(inboxes).toHaveLength(1)
      expect(inboxes[0]).toMatchObject({
        id: 1,
        name: 'Sales Inbox',
        presentationType: 'chat'})
    })
  })

  describe('Webhook Handling', () => {
    it('should process conversation started webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          type: 'conversation_started',
          conversationId: 111222}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process new message webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          type: 'new_message',
          conversationId: 111222,
          messageId: 333444}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process contact identified webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          type: 'contact_identified',
          contactId: 456789}),
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
      await integration.getContacts()
    }

      expect(integration['conversationsCache'].size).toBeGreaterThan(0)
      expect(integration['contactsCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getConversations()
      await integration.getContacts()
    }

      integration.clearCache()

      expect(integration['conversationsCache'].size).toBe(0)
      expect(integration['contactsCache'].size).toBe(0)
      expect(integration['usersCache'].size).toBe(0)
      expect(integration['messagesCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'conversations',
        'contacts',
        'users',
        'messages',
        'campaigns',
        'playbooks',
        'inboxes',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('drift')
      expect(integration.name).toBe('Drift')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
