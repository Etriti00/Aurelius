import { GoogleWorkspaceIntegration } from '../google/google-workspace.integration'
import { IntegrationConfig } from '../base/integration.interface'

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {,
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({,
        setCredentials: jest.fn(),
        getTokenInfo: jest.fn(),
        refreshAccessToken: jest.fn(),
        revokeCredentials: jest.fn(),
      })),
    },
    gmail: jest.fn(() => ({,
      users: {
        getProfile: jest.fn(),
        messages: {,
          list: jest.fn(),
          get: jest.fn(),
          send: jest.fn(),
        },
      },
    })),
    calendar: jest.fn(() => ({,
      events: {
        list: jest.fn(),
        insert: jest.fn(),
      },
    })),
    drive: jest.fn(() => ({ files: {,
        list: jest.fn() },
    })),
    tasks: jest.fn(() => ({ tasklists: {,
        list: jest.fn() },
      tasks: {,
        list: jest.fn(),
        insert: jest.fn(),
      },
    })),
    people: jest.fn(() => ({})),
  },
}))

describe('GoogleWorkspaceIntegration', () => {
  let integration: GoogleWorkspaceIntegration
  let mockConfig: IntegrationConfig

  beforeEach(() => {
    mockConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost/callback',
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      apiBaseUrl: 'https://www.googleapis.com',
    }
}
  }

    integration = new GoogleWorkspaceIntegration(
      'user-123',
      'access-token',
      'refresh-token',
      mockConfig,
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(integration.provider).toBe('google')
      expect(integration.name).toBe('Google Workspace')
      expect(integration.version).toBe('1.0.0')
    })
  })

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      const mockOAuth2Client = integration['oauth2Client']
      mockOAuth2Client.getTokenInfo = jest.fn().mockResolvedValue({
        expiry_date: Date.now() + 3600000,
        scopes: ['gmail.readonly'],
      })
  }
    }

      const result = await integration.authenticate()

      expect(result.success).toBe(true)
      expect(result.accessToken).toBe('access-token')
      expect(result.refreshToken).toBe('refresh-token')
    })

    it('should handle authentication failure', async () => {
      const mockOAuth2Client = integration['oauth2Client']
      mockOAuth2Client.getTokenInfo = jest.fn().mockRejectedValue(new Error('Auth failed'))
    }

      const result = await integration.authenticate()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Authentication failed')
    })
  })

  describe('testConnection', () => {
    it('should return connected status on successful test', async () => {
      const mockGmail = integration['gmail']
      mockGmail.users.getProfile.mockResolvedValue({ data: { id: 'test-user' })
  }
    }

      const result = await integration.testConnection()

      expect(result.isConnected).toBe(true)
      expect(result.lastChecked).toBeDefined()
    })

    it('should return disconnected status on auth error', async () => {
      const mockGmail = integration['gmail']
      const authError = new Error('Unauthorized')
      authError['code'] = 401
      mockGmail.users.getProfile.mockRejectedValue(authError)
    }

      const result = await integration.testConnection()

      expect(result.isConnected).toBe(false)
      expect(result.error).toBe('Authentication failed')
    })

    it('should return rate limited status on 429 error', async () => {
      const mockGmail = integration['gmail']
      const rateLimitError = new Error('Too Many Requests')
      rateLimitError['code'] = 429
      mockGmail.users.getProfile.mockRejectedValue(rateLimitError)
    }

      const result = await integration.testConnection()

      expect(result.isConnected).toBe(false)
      expect(result.error).toBe('Rate limit exceeded')
      expect(result.rateLimitInfo).toBeDefined()
    })
  })

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = integration.getCapabilities()
  }
    }

      expect(capabilities).toHaveLength(5)
      expect(capabilities.find(c => c.name === 'Gmail')).toBeDefined()
      expect(capabilities.find(c => c.name === 'Calendar')).toBeDefined()
      expect(capabilities.find(c => c.name === 'Drive')).toBeDefined()
      expect(capabilities.find(c => c.name === 'Tasks')).toBeDefined()
      expect(capabilities.find(c => c.name === 'Contacts')).toBeDefined()
    })
  })

  describe('validateRequiredScopes', () => {
    it('should validate required scopes correctly', () => {
      const validScopes = ['https://www.googleapis.com/auth/gmail.readonly']
      const invalidScopes = ['invalid.scope']
  }
    }

      expect(integration.validateRequiredScopes(validScopes)).toBe(true)
      expect(integration.validateRequiredScopes(invalidScopes)).toBe(false)
    })
  })

  describe('syncData', () => {
    it('should sync data successfully', async () => {
      // Mock all sync methods
      integration['syncGmail'] = jest.fn().mockResolvedValue({ processed: 5, skipped: 1 })
      integration['syncCalendar'] = jest.fn().mockResolvedValue({ processed: 3, skipped: 0 })
      integration['syncDrive'] = jest.fn().mockResolvedValue({ processed: 2, skipped: 0 })
      integration['syncTasks'] = jest.fn().mockResolvedValue({ processed: 1, skipped: 0 })
  }
    }

      const result = await integration.syncData()

      expect(result.success).toBe(true)
      expect(result.itemsProcessed).toBe(11)
      expect(result.itemsSkipped).toBe(1)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle partial sync failures', async () => {
      integration['syncGmail'] = jest.fn().mockRejectedValue(new Error('Gmail sync failed'))
      integration['syncCalendar'] = jest.fn().mockResolvedValue({ processed: 3, skipped: 0 })
      integration['syncDrive'] = jest.fn().mockResolvedValue({ processed: 2, skipped: 0 })
      integration['syncTasks'] = jest.fn().mockResolvedValue({ processed: 1, skipped: 0 })
    }

      const result = await integration.syncData()

      expect(result.success).toBe(false)
      expect(result.itemsProcessed).toBe(6)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Gmail sync failed')
    })
  })

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const mockGmail = integration['gmail']
      mockGmail.users.messages.send.mockResolvedValue({
        data: { id: 'message-123' },
      })
  }
    }

      const messageId = await integration.sendEmail('test@example.com', 'Test Subject', 'Test Body')

      expect(messageId).toBe('message-123')
      expect(mockGmail.users.messages.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'me',
          requestBody: expect.objectContaining({ raw: expect.any(String) }),
        }),
      )
    })

    it('should handle send email error', async () => {
      const mockGmail = integration['gmail']
      mockGmail.users.messages.send.mockRejectedValue(new Error('Send failed'))
    }

      await expect(integration.sendEmail('test@example.com', 'Subject', 'Body')).rejects.toThrow(
        'Failed to send email',
      )
    })
  })

  describe('createCalendarEvent', () => {
    it('should create calendar _event successfully', async () => {
      const mockCalendar = integration['calendar']
      mockCalendar.events.insert.mockResolvedValue({
        data: { id: 'event-123' },
      })
  }
    }

      const eventId = await integration.createCalendarEvent({
        summary: 'Test Event',
        description: 'Test Description',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        attendees: ['attendee@example.com'],
      })

      expect(eventId).toBe('_event-123')
      expect(mockCalendar.events.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'primary',
          requestBody: expect.objectContaining({,
            summary: 'Test Event',
            description: 'Test Description',
          }),
        }),
      )
    })
  })

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const mockTasks = integration['tasks']
      mockTasks.tasklists.list.mockResolvedValue({
        data: { items: [{ id: 'tasklist-123' }] },
      })
      mockTasks.tasks.insert.mockResolvedValue({
        data: { id: 'task-123' },
      })
  }
    }

      const taskId = await integration.createTask('Test Task', 'Test Notes', new Date('2024-01-01'))

      expect(taskId).toBe('task-123')
      expect(mockTasks.tasks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tasklist: 'tasklist-123',
          requestBody: expect.objectContaining({,
            title: 'Test Task',
            notes: 'Test Notes',
          }),
        }),
      )
    })

    it('should handle no task lists error', async () => {
      const mockTasks = integration['tasks']
      mockTasks.tasklists.list.mockResolvedValue({
        data: { items: [] },
      })
    }

      await expect(integration.createTask('Test Task')).rejects.toThrow('No task lists found')
    })
  })

  describe('handleWebhook', () => {
    it('should handle Gmail webhook', async () => {
      const handleGmailSpy = jest
        .spyOn(integration as any, 'handleGmailWebhook')
        .mockResolvedValue(undefined)
  }
    }

      await integration.handleWebhook({
        provider: 'google',
        event: 'gmail.message.received',
        data: { messageId: '123' },
        timestamp: new Date(),
      })

      expect(handleGmailSpy).toHaveBeenCalledWith({ messageId: '123' })
    })

    it('should handle unknown webhook events', async () => {
      const logSpy = jest.spyOn(integration as any, 'logInfo')
    }

      await integration.handleWebhook({
        provider: 'google',
        event: 'unknown.event',
        data: {},
        timestamp: new Date(),
      })

      expect(logSpy).toHaveBeenCalledWith(
        'handleWebhook',
        'Unhandled webhook event: unknown._event',
      )
    })
  })
})
