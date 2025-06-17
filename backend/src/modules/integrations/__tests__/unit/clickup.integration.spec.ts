import { ClickUpIntegration } from '../../clickup/clickup.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'

describe('ClickUpIntegration', () => {
  let integration: ClickUpIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(ClickUpIntegration, 'clickup')
    integration = setup.integration
    mocks = setup.mocks
}
  }

    // Setup default fetch mocks
    fetchMock = IntegrationTestHelper.mockFetch({
      'GET https://api.clickup.com/api/v2/user': IntegrationTestHelper.createMockApiResponse({,
        user: {
          id: 'test_user_123',
          email: 'test@example.com',
          username: 'testuser',
        },
      }),
      'GET https://api.clickup.com/api/v2/team': IntegrationTestHelper.createMockApiResponse({,
        teams: [{ id: 'team_123', name: 'Test Team' }],
      }),
      'GET https://api.clickup.com/api/v2/space': IntegrationTestHelper.createMockApiResponse({,
        spaces: [{ id: 'space_123', name: 'Test Space' }],
      }),
      'GET https://api.clickup.com/api/v2/task': IntegrationTestHelper.createMockApiResponse({,
        tasks: [{ id: 'task_123', name: 'Test Task', status: { status: 'open' }],
      }),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  describe('Authentication', () => {
    it('should authenticate successfully with valid token', async () => {
      const result = await integration.authenticate()
  }
    }

      IntegrationTestHelper.assert(result, {
        success: true,
        accessToken: mocks.oauth.accessToken,
      })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v2/user',
        expect.objectContaining({
          headers: expect.objectContaining({,
            Authorization: `Bearer ${mocks.oauth.accessToken}`,
          }),
        }),
      )
    })

    it('should handle authentication failure', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://api.clickup.com/api/v2/user': IntegrationTestHelper.createMockApiResponse(
          { error: 'Unauthorized' },
          401,
        ),
      })
    }

      const result = await integration.authenticate()

      IntegrationTestHelper.assert(result, {
        success: false,
        error: 'Authentication failed',
      })
    })

    it('should refresh token (ClickUp uses permanent tokens)', async () => {
      const result = await integration.refreshToken()
    }

      IntegrationTestHelper.assert(result, {
        success: true,
        accessToken: mocks.oauth.accessToken,
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
  }
    }

      IntegrationTestHelper.assert(result, { isConnected: true })

      expect(result.lastChecked).toBeInstanceOf(Date)
    })

    it('should handle connection test failure', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://api.clickup.com/api/v2/user': IntegrationTestHelper.createMockApiResponse(
          { error: 'Service unavailable' },
          503,
        ),
      })
    }

      const result = await integration.testConnection()

      IntegrationTestHelper.assert(result, {
        isConnected: false,
        error: 'Connection test failed',
      })
    })
  })

  describe('Capabilities', () => {
    it('should return ClickUp capabilities', () => {
      const capabilities = integration.getCapabilities()
  }
    }

      expect(capabilities).toHaveLength(5)
      expect(capabilities.map(c => c.name)).toEqual([
        'Task Management',
        'Space Management',
        'Team Collaboration',
        'Time Tracking',
        'Real-time Sync',
      ])

      capabilities.forEach(capability => {
        expect(capability).toHaveProperty('name')
        expect(capability).toHaveProperty('description')
        expect(capability).toHaveProperty('enabled')
        expect(capability).toHaveProperty('requiredScopes')
      })
    })

    it('should validate required scopes correctly', () => {
      const validScopes = ['clickup.read', 'clickup.write']
      const invalidScopes = ['invalid.scope']
    }

      expect(integration.validateRequiredScopes(validScopes)).toBe(true)
      expect(integration.validateRequiredScopes(invalidScopes)).toBe(false)
    })
  })

  describe('Data Synchronization', () => {
    it('should sync data successfully', async () => {
      const result = await integration.syncData()
  }
    }

      IntegrationTestHelper.assert(result, { success: true })

      expect(result.itemsProcessed).toBeGreaterThanOrEqual(0)
      expect(result.itemsSkipped).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should sync data with last sync time', async () => {
      const lastSyncTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      const result = await integration.syncData(lastSyncTime)
    }

      IntegrationTestHelper.assert(result, { success: true })
    })

    it('should handle sync errors gracefully', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://api.clickup.com/api/v2/team': IntegrationTestHelper.createMockApiResponse(
          { error: 'Rate limited' },
          429,
          { 'Retry-After': '60' },
        ),
      })
    }

      const result = await integration.syncData()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should get last sync time', async () => {
      const lastSyncTime = await integration.getLastSyncTime()
      expect(lastSyncTime instanceof Date || lastSyncTime === null).toBe(true)
    })
  })

  describe('Task Management', () => {
    it('should get tasks successfully with filters', async () => {
      const filters = { assigneeId: '123', status: 'open', listId: 'list_123' }
      const tasks = await integration.getTasks(filters)
  }
    }

      expect(Array.isArray(tasks)).toBe(true)
    })

    it('should create task successfully', async () => {
      const taskData = {
        name: 'New Task',
        description: 'Test task description',
      }
    }

      const taskId = await integration.createTask('list_123', taskData)

      expect(typeof taskId).toBe('string')
    })

    it('should get task by ID successfully', async () => {
      const task = await integration.getTask('task_123')
    }

      expect(task).toBeDefined()
    })
  })

  describe('Space Management', () => {
    it('should get spaces successfully', async () => {
      const spaces = await integration.getSpaces('team_123')
  }
    }

      expect(Array.isArray(spaces)).toBe(true)
    })

    it('should create space successfully', async () => {
      const spaceData = { name: 'New Space' }
    }

      const spaceId = await integration.createSpace('team_123', spaceData)

      expect(typeof spaceId).toBe('string')
    })

    it('should get lists for a space', async () => {
      const lists = await integration.getLists('space_123')
    }

      expect(Array.isArray(lists)).toBe(true)
    })
  })

  describe('Webhook Handling', () => {
    it('should handle task created webhook', async () => {
      const payload = IntegrationTestHelper.createMock('clickup', 'taskCreated', {
        task_id: 'task_789',
        history_items: [
          {
            field: 'status',
            after: 'open',
            before: null,
          },
        ],
      })
  }
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()

      expect(mocks.metricsService.trackWebhookEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'clickup',
        'taskCreated',
        expect.any(Number),
      )
    })

    it('should validate webhook signature', () => {
      const payload = { test: 'data' }
      const signature = 'valid_signature'
    }

      const result = integration.validateWebhookSignature(payload, signature)
      expect(typeof result).toBe('boolean')
    })

    it('should handle space webhook', async () => {
      const payload = IntegrationTestHelper.createMock('clickup', 'spaceUpdated', { space_id: 'space_123' })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle rate limiting correctly', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://api.clickup.com/api/v2/user': IntegrationTestHelper.createMockApiResponse(
          { error: 'Rate limit exceeded' },
          429,
          { 'Retry-After': '1' },
        ),
      })
  }
    }

      await expect(integration.authenticate()).rejects.toThrow('Rate limited')

      expect(mocks.metricsService.trackRateLimit).toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      fetchMock.mockRestore()
      fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    }

      const result = await integration.testConnection()

      IntegrationTestHelper.assert(result, {
        isConnected: false,
        error: 'Network error',
      })
    })

    it('should handle invalid JSON responses', async () => {
      fetchMock.mockRestore()
      fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response)
    }

      await expect(integration.authenticate()).rejects.toThrow('Invalid JSON')
    })
  })

  describe('Circuit Breaker Integration', () => {
    it('should use circuit breaker for API calls', async () => {
      await integration.authenticate()
  }
    }

      expect(mocks.circuitBreaker.execute).toHaveBeenCalledWith(
        'clickup',
        'auth.test',
        expect.any(Function),
        undefined,
      )
    })

    it('should track metrics for successful operations', async () => {
      await integration.authenticate()
    }

      expect(mocks.metricsService.trackApiCall).toHaveBeenCalledWith(
        'test_user_123',
        expect.stringContaining('test_integration_clickup'),
        'clickup',
        'auth.test',
        expect.any(Number),
        true,
      )
    })

    it('should track metrics for failed operations', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://api.clickup.com/api/v2/user': IntegrationTestHelper.createMockApiResponse(
          { error: 'Unauthorized' },
          401,
        ),
      })
    }

      await integration.authenticate()

      expect(mocks.metricsService.trackApiCall).toHaveBeenCalledWith(
        'test_user_123',
        expect.stringContaining('test_integration_clickup'),
        'clickup',
        'auth.test',
        expect.any(Number),
        false,
        expect.any(String),
      )
    })
  })

  describe('Integration-Specific Features', () => {
    it('should search tasks with filters', async () => {
      const results = await integration.searchTasks('test', 'team_123')
  }
    }

      expect(Array.isArray(results)).toBe(true)
    })

    it('should get tasks by list ID', async () => {
      const tasks = await integration.getTasksByList('list_123')
    }

      expect(Array.isArray(tasks)).toBe(true)
    })

    it('should get tasks by assignee', async () => {
      const tasks = await integration.getTasksByAssignee('team_123', 'user_123')
    }

      expect(Array.isArray(tasks)).toBe(true)
    })
  })
})
