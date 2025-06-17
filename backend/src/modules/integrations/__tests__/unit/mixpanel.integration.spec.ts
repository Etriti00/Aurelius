import { User } from '@prisma/client';
import { MixpanelIntegration } from '../../mixpanel/mixpanel.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('MixpanelIntegration', () => {
  let integration: MixpanelIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(MixpanelIntegration, 'mixpanel')
    integration = setup.integration
    mocks = setup.mocks
}
  }

    // Setup default fetch mocks for Mixpanel API
    fetchMock = IntegrationTestHelper.mockFetch({
      'GET https://mixpanel.com/api/2.0/projects': IntegrationTestHelper.createMockApiResponse({,
        id: 123456,
        name: 'Test Project',
        token: 'test_project_token',
        api_secret: 'test_api_secret',
        timezone: 'US/Pacific',
        is_demo: false,
        cluster: 'US',
        created: '2024-01-01T00Z'}),
      'POST https://api.mixpanel.com/track': IntegrationTestHelper.createMockApiResponse({,
        status: 1,
        error: null}),
      'POST https://api.mixpanel.com/engage': IntegrationTestHelper.createMockApiResponse({,
        status: 1,
        error: null}),
      'GET https://mixpanel.com/api/2.0/export':
        '{"event":"Page View","properties":{"distinct_id":"user123","time":1640995200,"page":"home","referrer":"google"}\n{"event":"Button Click","properties":{"distinct_id":"user123","time":1640995260,"button":"signup","page":"home"}',
      'GET https://mixpanel.com/api/2.0/events/names': IntegrationTestHelper.createMockApiResponse([
        'Page View',
        'Button Click',
        'Form Submit',
        'Purchase',
        'Sign Up',
      ]),
      'GET https://mixpanel.com/api/2.0/events/properties':
        IntegrationTestHelper.createMockApiResponse({
          'Page View': {
            page: {,
              count: 1500,
              values: ['home', 'about', 'contact', 'pricing']},
            referrer: {,
              count: 800,
              values: ['google', 'facebook', 'direct', 'twitter']}),
      'GET https://mixpanel.com/api/2.0/engage': IntegrationTestHelper.createMockApiResponse({,
        results: [
          {
            distinct_id: 'user123',
            properties: {
              $created: '2024-01-01T00Z',
              $email: 'user@example.com',
              $first_name: 'John',
              $last_name: 'Doe',
              $name: 'John Doe',
              $city: 'San Francisco',
              $region: 'California',
              $country_code: 'US',
              custom_property: 'custom_value'},
            last_seen: '2024-01-15T12:00:00Z',
            events: 45,
            sessions: 12},
        ],
        session_id: 'session123',
        status: 'ok'}),
      'GET https://mixpanel.com/api/2.0/insights': IntegrationTestHelper.createMockApiResponse({,
        series: [
          { event: 'Page View', label: 'Page View' },
          { event: 'Button Click', label: 'Button Click' },
        ],
        unit: 'day',
        interval: 1,
        from_date: '2024-01-01',
        to_date: '2024-01-07',
        data: {,
          series: [
            '2024-01-01',
            '2024-01-02',
            '2024-01-03',
            '2024-01-04',
            '2024-01-05',
            '2024-01-06',
            '2024-01-07',
          ],
          values: {
            'Page View': [120, 135, 150, 145, 160, 180, 200],
            'Button Click': [25, 30, 35, 32, 40, 45, 50]}),
      'GET https://mixpanel.com/api/2.0/retention': IntegrationTestHelper.createMockApiResponse({,
        retention_type: 'birth',
        unit: 'day',
        interval: 1,
        interval_count: 7,
        from_date: '2024-01-01',
        to_date: '2024-01-07',
        data: {,
          values: {
            '2024-01-01': [100, 75, 60, 50, 45, 40, 35],
            '2024-01-02': [110, 82, 65, 55, 48, 42],
            '2024-01-03': [105, 78, 62, 52, 46]},
          dates: [
            '2024-01-01',
            '2024-01-02',
            '2024-01-03',
            '2024-01-04',
            '2024-01-05',
            '2024-01-06',
            '2024-01-07',
          ]}),
      'GET https://mixpanel.com/api/2.0/cohorts/list': IntegrationTestHelper.createMockApiResponse([
        {
          id: 456789,
          name: 'Active Users',
          description: 'Users who have been active in the last 30 days',
          count: 1250,
          is_visible: true,
          definition: {,
            events: [{ event: 'Page View', filter: {}],
            properties: []},
          created: '2024-01-01T00Z',
          project_id: 123456},
      ]),
      'POST https://mixpanel.com/api/2.0/cohorts/create':
        IntegrationTestHelper.createMockApiResponse({
          id: 789012,
          name: 'New Cohort',
          description: 'Test cohort',
          count: 0,
          is_visible: true,
          created: '2024-01-15T12:00:00Z',
          project_id: 123456}),
      'POST https://mixpanel.com/api/2.0/cohorts/update/456789':
        IntegrationTestHelper.createMockApiResponse({
          id: 456789,
          name: 'Updated Active Users',
          description: 'Updated description',
          count: 1250,
          is_visible: true,
          project_id: 123456}),
      'DELETE https://mixpanel.com/api/2.0/cohorts/delete/456789': new Response('', {
        status: 200}),
      'GET https://mixpanel.com/api/2.0/funnels/list': IntegrationTestHelper.createMockApiResponse([
        {
          funnel_id: 111222,
          name: 'Signup Funnel',
          steps: [
            { event: 'Page View', label: 'Visit Homepage' },
            { event: 'Button Click', label: 'Click Signup' },
            { event: 'Form Submit', label: 'Submit Form' },
            { event: 'Sign Up', label: 'Complete Signup' },
          ],
          date_created: '2024-01-01T00Z',
          project_id: 123456},
      ]),
      'GET https://mixpanel.com/api/2.0/funnels': IntegrationTestHelper.createMockApiResponse({,
        data: {
          '2024-01-01': {
            steps: [
              { count: 1000, avg_time: null, overall_conv_ratio: 1.0 },
              { count: 250, avg_time: 120, overall_conv_ratio: 0.25 },
              { count: 180, avg_time: 300, overall_conv_ratio: 0.18 },
              { count: 150, avg_time: 600, overall_conv_ratio: 0.15 },
            ]}),
      'POST https://mixpanel.com/api/2.0/export': IntegrationTestHelper.createMockApiResponse({,
        export_id: 'export123',
        status: 'pending',
        created_at: '2024-01-15T12:00:00Z',
        params: {,
          from_date: '2024-01-01',
          to_date: '2024-01-07'}),
      'GET https://mixpanel.com/api/2.0/annotations': IntegrationTestHelper.createMockApiResponse({,
        annotations: [
          {
            id: 333444,
            project_id: 123456,
            date: '2024-01-10',
            description: 'Product launch',
            created: '2024-01-10T09:00:00Z'},
        ]}),
      'POST https://mixpanel.com/api/2.0/annotations/create':
        IntegrationTestHelper.createMockApiResponse({
          id: 444555,
          project_id: 123456,
          date: '2024-01-15',
          description: 'New feature release',
          created: '2024-01-15T12:00:00Z'})})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with API key and secret', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        apiKey: 'test_api_key',
        apiSecret: 'test_api_secret'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'test_api_key',
        refreshToken: 'test_api_secret',
        expiresIn: 0,
        userId: '123456',
        userInfo: {,
          id: '123456',
          name: 'Test Project',
          email: 'Test Project'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'test_api_key',
        'test-user-id',
      )
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'test_api_secret',
        'test-user-id_secret',
      )
    })

    it('should handle authentication errors', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        apiKey: '',
        apiSecret: ''})
    }

      await expect(integration.authenticate(config)).rejects.toThrow('Authentication failed')
    })

    it('should authenticate with clientId and clientSecret as fallback', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        clientId: 'test_api_secret',
        clientSecret: 'test_api_key'})
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
    })
  })

  describe('Connection Status', () => {
    it('should return connected status when authenticated', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })
  }
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(true)
      expect(status.user).toMatchObject({
        id: '123456',
        name: 'Test Project',
        email: 'Test Project'})
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
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })
    })
  }

    it('should sync successfully and return comprehensive data', async () => {
      const config = IntegrationTestHelper.createMockConfig()
    }

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        project: expect.objectContaining({,
          id: 123456,
          name: 'Test Project',
          token: 'test_project_token'}),
        cohorts: expect.arrayContaining([
          expect.objectContaining({
            id: 456789,
            name: 'Active Users'}),
        ]),
        funnels: expect.arrayContaining([
          expect.objectContaining({
            funnel_id: 111222,
            name: 'Signup Funnel'}),
        ]),
        syncedAt: expect.any(String)})
    })

    it('should handle partial sync failures gracefully', async () => {
      fetchMock.mockImplementationOnce(url => {
        if (url.includes('/cohorts/list')) {
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

  describe('Project Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })
    })
  }

    it('should get project information successfully', async () => {
      const project = await integration.getProject()
    }

      expect(project).toMatchObject({
        id: 123456,
        name: 'Test Project',
        token: 'test_project_token',
        api_secret: 'test_api_secret',
        timezone: 'US/Pacific',
        is_demo: false})
    })
  })

  describe('Event Tracking', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })
    })
  }

    it('should track single _event successfully', async () => {
      const result = await integration.trackEvent('Button Click', 'user123', {
        button: 'signup',
        page: 'home'})
    }

      expect(result).toBe(true)
    })

    it('should track multiple events successfully', async () => {
      const events = [
        {
          event: 'Page View',
          properties: {,
            distinct_id: 'user123',
            time: Math.floor(Date.now() / 1000),
            page: 'home'},
        {
          event: 'Button Click',
          properties: {,
            distinct_id: 'user123',
            time: Math.floor(Date.now() / 1000),
            button: 'signup'},
      ]
    }

      const result = await integration.trackEvents(events)

      expect(result).toBe(true)
    })

    it('should get events successfully', async () => {
      const events = await integration.getEvents('2024-01-01', '2024-01-02')
    }

      expect(events).toHaveLength(2)
      expect(events[0]).toMatchObject({
        event: 'Page View',
        properties: expect.objectContaining({,
          distinct_id: 'user123',
          page: 'home'})})
    })

    it('should get _event names successfully', async () => {
      const eventNames = await integration.getEventNames()
    }

      expect(eventNames).toEqual([
        'Page View',
        'Button Click',
        'Form Submit',
        'Purchase',
        'Sign Up',
      ])
    })

    it('should get _event properties successfully', async () => {
      const properties = await integration.getEventProperties('Page View')
    }

      expect(properties).toMatchObject({
        'Page View': {
          page: {,
            count: 1500,
            values: ['home', 'about', 'contact', 'pricing']})
      }
    })
  })

  describe('User Profile Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })
    })
  }

    it('should set user profile successfully', async () => {
      const result = await integration.setUserProfile('user123', {
        $email: 'user@example.com',
        $first_name: 'John',
        $last_name: 'Doe',
        custom_property: 'custom_value'})
    }

      expect(result).toBe(true)
    })

    it('should update user profile successfully', async () => {
      const result = await integration.updateUserProfile(
        'user123',
        {
          $last_name: 'Smith',
          updated_property: 'new_value'},
        '$set',
      )
    }

      expect(result).toBe(true)
    })

    it('should get user profile successfully', async () => {
      const _user = await integration.getUserProfile('user123')
    }

      expect(user).toMatchObject({
        distinct_id: 'user123',
        properties: expect.objectContaining({
          $email: 'user@example.com',
          $first_name: 'John',
          $last_name: 'Doe'}),
        events: 45,
        sessions: 12})
    })

    it('should get user profiles list successfully', async () => {
      const users = await integration.getUserProfiles()
    }

      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        distinct_id: 'user123',
        properties: expect.objectContaining({
          $email: 'user@example.com'})})
    })
  })

  describe('Insights & Analytics', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })
    })
  }

    it('should get insights successfully', async () => {
      const insights = await integration.getInsights(
        ['Page View', 'Button Click'],
        'day',
        1,
        '2024-01-01',
        '2024-01-07',
      )
    }

      expect(insights).toMatchObject({
        series: expect.arrayContaining([
          { event: 'Page View', label: 'Page View' },
          { event: 'Button Click', label: 'Button Click' },
        ]),
        unit: 'day',
        data: expect.objectContaining({,
          values: expect.objectContaining({
            'Page View': expect.any(Array),
            'Button Click': expect.any(Array)})})})
    })

    it('should get retention data successfully', async () => {
      const retention = await integration.getRetention(
        'birth',
        'day',
        1,
        7,
        '2024-01-01',
        '2024-01-07',
      )
    }

      expect(retention).toMatchObject({
        retention_type: 'birth',
        unit: 'day',
        data: expect.objectContaining({,
          values: expect.any(Object),
          dates: expect.any(Array)})})
    })
  })

  describe('Cohorts Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })
    })
  }

    it('should get cohorts successfully', async () => {
      const cohorts = await integration.getCohorts()
    }

      expect(cohorts).toHaveLength(1)
      expect(cohorts[0]).toMatchObject({
        id: 456789,
        name: 'Active Users',
        description: 'Users who have been active in the last 30 days',
        count: 1250})
    })

    it('should create cohort successfully', async () => {
      const definition = {
        events: [{ event: 'Page View', filter: {}],
        properties: []}
    }

      const cohort = await integration.createCohort('New Cohort', definition, 'Test cohort')

      expect(cohort).toMatchObject({
        id: 789012,
        name: 'New Cohort',
        description: 'Test cohort'})
    })

    it('should update cohort successfully', async () => {
      const updates = {
        name: 'Updated Active Users',
        description: 'Updated description'}
    }

      const updatedCohort = await integration.updateCohort(456789, updates)

      expect(updatedCohort).toMatchObject({
        id: 456789,
        name: 'Updated Active Users',
        description: 'Updated description'})
    })

    it('should delete cohort successfully', async () => {
      const result = await integration.deleteCohort(456789)
    }

      expect(result).toBe(true)
    })
  })

  describe('Funnels Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })
    })
  }

    it('should get funnels successfully', async () => {
      const funnels = await integration.getFunnels()
    }

      expect(funnels).toHaveLength(1)
      expect(funnels[0]).toMatchObject({
        funnel_id: 111222,
        name: 'Signup Funnel',
        steps: expect.arrayContaining([
          { event: 'Page View', label: 'Visit Homepage' },
          { event: 'Button Click', label: 'Click Signup' },
        ])})
    })

    it('should get funnel data successfully', async () => {
      const funnelData = await integration.getFunnelData(111222, '2024-01-01', '2024-01-07', 'day')
    }

      expect(funnelData).toMatchObject({
        data: expect.objectContaining({
          '2024-01-01': expect.objectContaining({
            steps: expect.arrayContaining([
              expect.objectContaining({
                count: expect.any(Number),
                overall_conv_ratio: expect.any(Number)}),
            ])})})})
    })
  })

  describe('Export & Data Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })
    })
  }

    it('should create export successfully', async () => {
      const exportJob = await integration.createExport('2024-01-01', '2024-01-07', ['Page View'])
    }

      expect(exportJob).toMatchObject({
        export_id: 'export123',
        status: 'pending',
        params: {,
          from_date: '2024-01-01',
          to_date: '2024-01-07'})
      }
    })
  })

  describe('Annotations', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })
    })
  }

    it('should get annotations successfully', async () => {
      const annotations = await integration.getAnnotations('2024-01-01', '2024-01-31')
    }

      expect(annotations).toHaveLength(1)
      expect(annotations[0]).toMatchObject({
        id: 333444,
        date: '2024-01-10',
        description: 'Product launch'})
    })

    it('should create annotation successfully', async () => {
      const annotation = await integration.createAnnotation('2024-01-15', 'New feature release')
    }

      expect(annotation).toMatchObject({
        id: 444555,
        date: '2024-01-15',
        description: 'New feature release'})
    })
  })

  describe('Webhook Handling', () => {
    it('should process valid webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'mixpanel-signature': 'valid-signature'},
        body: JSON.stringify({,
          type: 'event',
          event: 'Button Click',
          distinct_id: 'user123',
          properties: {,
            button: 'signup'}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should handle user update webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'mixpanel-signature': 'valid-signature'},
        body: JSON.stringify({,
          type: 'user_update',
          distinct_id: 'user123',
          properties: {
            $email: 'newemail@example.com'}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle API rate limiting', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(429, 'Too Many Requests')),
      )
  }
    }

      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })

      await expect(integration.getProject()).rejects.toThrow('API request failed')
    })

    it('should handle network errors gracefully', async () => {
      fetchMock.mockImplementationOnce(() => Promise.reject(new Error('Network error')))
    }

      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })

      await expect(integration.getProject()).rejects.toThrow('Network error')
    })

    it('should handle invalid API credentials', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(401, 'Unauthorized')),
      )
    }

      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'invalid_secret'
        return 'invalid_key'
      })

      await expect(integration.getProject()).rejects.toThrow('API request failed')
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'test_api_secret'
        return 'test_api_key'
      })
    })
  }

    it('should cache project information', async () => {
      await integration.getProject()
    }

      // Second call should use cache
      fetchMock.mockClear()
      await integration.getProject()

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should cache users and cohorts', async () => {
      await integration.getUserProfile('user123')
      await integration.getCohorts()
    }

      // Verify cache is populated
      expect(integration['usersCache'].size).toBeGreaterThan(0)
      expect(integration['cohortsCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getProject()
      await integration.getUserProfile('user123')
    }

      integration.clearCache()

      expect(integration['projectCache']).toBeNull()
      expect(integration['usersCache'].size).toBe(0)
      expect(integration['cohortsCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'analytics',
        'events',
        'users',
        'cohorts',
        'funnels',
        'reports',
        'retention',
        'export',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('mixpanel')
      expect(integration.name).toBe('Mixpanel')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
