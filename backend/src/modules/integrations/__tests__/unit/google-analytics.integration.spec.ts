import { User } from '@prisma/client'
import { GoogleAnalyticsIntegration } from '../../google-analytics/google-analytics.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'

describe('GoogleAnalyticsIntegration', () => {
  let integration: GoogleAnalyticsIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(
      GoogleAnalyticsIntegration,
      'google-analytics',
    )
    integration = setup.integration
    mocks = setup.mocks
}
  }

    // Setup default fetch mocks for Google Analytics APIs
    fetchMock = IntegrationTestHelper.mockFetch({
      'GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries':
        IntegrationTestHelper.createMockApiResponse({
          accountSummaries: [
            {
              name: 'accountSummaries/123456789',
              account: 'accounts/123456789',
              displayName: 'Test Analytics Account',
              propertySummaries: [
                {
                  property: 'properties/GA_PROPERTY_123',
                  displayName: 'Test Website',
                  propertyType: 'PROPERTY_TYPE_GA4',
                },
              ],
            },
          ],
        }),
      'GET https://analyticsadmin.googleapis.com/v1beta/properties':
        IntegrationTestHelper.createMockApiResponse({
          properties: [
            {
              name: 'properties/GA_PROPERTY_123',
              propertyId: 'GA_PROPERTY_123',
              displayName: 'Test Website',
              propertyType: 'PROPERTY_TYPE_GA4',
              createTime: '2024-01-01T00Z',
              updateTime: '2024-01-01T00Z',
              parent: 'accounts/123456789',
              currencyCode: 'USD',
              timeZone: 'America/New_York',
              deleted: false,
              industryCategory: 'TECHNOLOGY',
              serviceLevel: 'GOOGLE_ANALYTICS_STANDARD',
            },
          ],
        }),
      'GET https://analyticsadmin.googleapis.com/v1beta/properties/GA_PROPERTY_123/dataStreams':
        IntegrationTestHelper.createMockApiResponse({
          dataStreams: [
            {
              name: 'properties/GA_PROPERTY_123/dataStreams/123456',
              streamId: '123456',
              type: 'WEB_DATA_STREAM',
              displayName: 'Web Stream',
              createTime: '2024-01-01T00Z',
              updateTime: '2024-01-01T00Z',
              webStreamData: {,
                measurementId: 'G-ABC123DEF4',
                firebaseAppId: '1:123456789:web:abc123def456',
                defaultUri: 'https://example.com',
              },
            },
          ],
        }),
      'GET https://analyticsadmin.googleapis.com/v1beta/properties/GA_PROPERTY_123/customDimensions':
        IntegrationTestHelper.createMockApiResponse({
          customDimensions: [
            {
              name: 'properties/GA_PROPERTY_123/customDimensions/custom_dimension_1',
              parameterName: 'user_type',
              displayName: 'User Type',
              description: 'Type of user (premium, standard, etc.)',
              scope: 'USER',
              disallowAdsPersonalization: false,
            },
          ],
        }),
      'GET https://analyticsadmin.googleapis.com/v1beta/properties/GA_PROPERTY_123/customMetrics':
        IntegrationTestHelper.createMockApiResponse({
          customMetrics: [
            {
              name: 'properties/GA_PROPERTY_123/customMetrics/custom_metric_1',
              parameterName: 'lifetime_value',
              displayName: 'Customer Lifetime Value',
              description: 'Total value of a customer over their lifetime',
              measurementUnit: 'CURRENCY',
              scope: 'EVENT',
            },
          ],
        }),
      'GET https://analyticsadmin.googleapis.com/v1beta/properties/GA_PROPERTY_123/audiences':
        IntegrationTestHelper.createMockApiResponse({
          audiences: [
            {
              name: 'properties/GA_PROPERTY_123/audiences/123456',
              displayName: 'High Value Users',
              description: 'Users with high lifetime value',
              membershipDurationDays: 30,
              filterClauses: [
                {
                  clauseType: 'INCLUDE',
                  simpleFilter: {,
                    scope: 'AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS',
                    filterExpression: {,
                      andGroup: {
                        filterExpressions: [
                          {
                            dimensionFilter: {,
                              dimensionName: 'eventName',
                              stringFilter: {,
                                value: 'purchase',
                                matchType: 'EXACT',
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
              createTime: '2024-01-01T00Z',
              archived: false,
            },
          ],
        }),
      'POST https://analyticsdata.googleapis.com/v1beta/properties/GA_PROPERTY_123:runReport':
        IntegrationTestHelper.createMockApiResponse({
          dimensionHeaders: [{ name: 'date' }, { name: 'deviceCategory' }],
          metricHeaders: [
            { name: 'sessions', type: 'TYPE_INTEGER' },
            { name: 'totalUsers', type: 'TYPE_INTEGER' },
          ],
          rows: [
            {
              dimensionValues: [{ value: '20250615' }, { value: 'desktop' }],
              metricValues: [{ value: '1250' }, { value: '1100' }],
            },
            {
              dimensionValues: [{ value: '20250615' }, { value: 'mobile' }],
              metricValues: [{ value: '850' }, { value: '780' }],
            },
          ],
          rowCount: 2,
          metadata: {,
            currencyCode: 'USD',
            timeZone: 'America/New_York',
            samplingMetadatas: [],
          },
        }),
      'POST https://analyticsdata.googleapis.com/v1beta/properties/GA_PROPERTY_123:runRealtimeReport':
        IntegrationTestHelper.createMockApiResponse({
          dimensionHeaders: [{ name: 'country' }],
          metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }],
          rows: [
            {
              dimensionValues: [{ value: 'United States' }],
              metricValues: [{ value: '45' }],
            },
            {
              dimensionValues: [{ value: 'Canada' }],
              metricValues: [{ value: '12' }],
            },
          ],
          rowCount: 2,
          metadata: {,
            currencyCode: 'USD',
            timeZone: 'America/New_York',
          },
        }),
      'GET https://analyticsadmin.googleapis.com/v1beta/properties/GA_PROPERTY_123/conversionEvents':
        IntegrationTestHelper.createMockApiResponse({
          conversionEvents: [
            {
              name: 'properties/GA_PROPERTY_123/conversionEvents/purchase',
              eventName: 'purchase',
              createTime: '2024-01-01T00Z',
              deletable: true,
              custom: false,
              countingMethod: 'ONCE_PER_EVENT',
            },
          ],
        }),
      default: IntegrationTestHelper.createMockApiResponse({ data: 'default_response' }),
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

      expect(result.scope).toContain('https://www.googleapis.com/auth/analytics.readonly')
      expect(result.scope).toContain('https://www.googleapis.com/auth/analytics.edit')
    })

    it('should handle authentication failure', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries':
          IntegrationTestHelper.createMockApiResponse(
            {
              error: {,
                code: 401,
                message: 'Request had invalid authentication credentials',
              },
            },
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

    it('should refresh token successfully', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://oauth2.googleapis.com/token': IntegrationTestHelper.createMockApiResponse({,
          access_token: 'new_access_token_123',
          refresh_token: 'new_refresh_token_123',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      })
    }

      const result = await integration.refreshToken()

      IntegrationTestHelper.assert(result, { success: true })
    })

    it('should revoke access successfully', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://oauth2.googleapis.com/revoke': IntegrationTestHelper.createMockApiResponse(
          {},
          200,
        ),
      })
    }

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
      expect(result.metadata?.accountsCount).toBe(1)
    })

    it('should handle connection test failure with auth error', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries':
          IntegrationTestHelper.createMockApiResponse(
            {
              error: {,
                code: 401,
                message: 'Invalid credentials',
              },
            },
            401,
          ),
      })
    }

      const result = await integration.testConnection()

      IntegrationTestHelper.assert(result, {
        isConnected: false,
        error: 'Authentication failed - token expired or invalid',
      })
    })

    it('should handle connection test failure with permission error', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries':
          IntegrationTestHelper.createMockApiResponse(
            {
              error: {,
                code: 403,
                message: 'Insufficient permissions',
              },
            },
            403,
          ),
      })
    }

      const result = await integration.testConnection()

      expect(result.isConnected).toBe(false)
      expect(result.error).toContain('Access forbidden')
    })

    it('should handle rate limit errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries':
          IntegrationTestHelper.createMockApiResponse(
            {
              error: {,
                code: 429,
                message: 'Quota exceeded',
              },
            },
            429,
          ),
      })
    }

      const result = await integration.testConnection()

      expect(result.isConnected).toBe(false)
      expect(result.error).toContain('Rate limit exceeded')
      expect(result.rateLimitInfo).toBeDefined()
    })
  })

  describe('Capabilities', () => {
    it('should return Google Analytics capabilities', () => {
      const capabilities = integration.getCapabilities()
  }
    }

      expect(Array.isArray(capabilities)).toBe(true)
      expect(capabilities.length).toBeGreaterThan(0)

      const capabilityNames = capabilities.map(c => c.name)
      expect(capabilityNames).toContain('Property Management')
      expect(capabilityNames).toContain('Data Streams')
      expect(capabilityNames).toContain('Reporting API')
      expect(capabilityNames).toContain('Dimensions & Metrics')
      expect(capabilityNames).toContain('Audience Management')
      expect(capabilityNames).toContain('Conversion Events')
      expect(capabilityNames).toContain('Enhanced Ecommerce')
      expect(capabilityNames).toContain('Real-time Analytics')

      capabilities.forEach(capability => {
        expect(capability).toHaveProperty('name')
        expect(capability).toHaveProperty('description')
        expect(capability).toHaveProperty('enabled')
        expect(capability).toHaveProperty('requiredScopes')
        expect(capability).toHaveProperty('methods')
      })
    })

    it('should validate required scopes correctly', () => {
      const validScopes = [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/analytics.edit',
      ]
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
      expect(result.metadata?.propertiesInCache).toBeDefined()
      expect(result.metadata?.dataStreamsInCache).toBeDefined()
    })

    it('should sync data with last sync time', async () => {
      const lastSyncTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const result = await integration.syncData(lastSyncTime)
    }

      IntegrationTestHelper.assert(result, { success: true })

      expect(result.metadata?.lastSyncTime).toEqual(lastSyncTime)
    })

    it('should handle sync errors gracefully', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        default: IntegrationTestHelper.createMockApiResponse(
          {
            error: {,
              code: 500,
              message: 'Internal server error',
            },
          },
          500,
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

  describe('Property Management', () => {
    it('should get properties successfully', async () => {
      const properties = await integration.getProperties()
  }
    }

      expect(Array.isArray(properties)).toBe(true)
      expect(properties.length).toBeGreaterThan(0)

      const property = properties[0]
      expect(property).toHaveProperty('name')
      expect(property).toHaveProperty('propertyId')
      expect(property).toHaveProperty('displayName')
      expect(property).toHaveProperty('propertyType')
    })

    it('should get a specific property successfully', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://analyticsadmin.googleapis.com/v1beta/properties/GA_PROPERTY_123':
          IntegrationTestHelper.createMockApiResponse({
            name: 'properties/GA_PROPERTY_123',
            propertyId: 'GA_PROPERTY_123',
            displayName: 'Test Website',
            propertyType: 'PROPERTY_TYPE_GA4',
            currencyCode: 'USD',
            timeZone: 'America/New_York',
          }),
      })
    }

      const property = await integration.getProperty('GA_PROPERTY_123')

      expect(property).toBeDefined()
      expect(property?.propertyId).toBe('GA_PROPERTY_123')
      expect(property?.displayName).toBe('Test Website')
    })
  })

  describe('Data Stream Management', () => {
    it('should get data streams successfully', async () => {
      const streams = await integration.getDataStreams('GA_PROPERTY_123')
  }
    }

      expect(Array.isArray(streams)).toBe(true)
      expect(streams.length).toBeGreaterThan(0)

      const stream = streams[0]
      expect(stream).toHaveProperty('name')
      expect(stream).toHaveProperty('streamId')
      expect(stream).toHaveProperty('type')
      expect(stream).toHaveProperty('displayName')
    })

    it('should handle web data stream correctly', async () => {
      const streams = await integration.getDataStreams('GA_PROPERTY_123')
    }

      const webStream = streams.find(s => s.type === 'WEB_DATA_STREAM')
      expect(webStream).toBeDefined()
      expect(webStream?.webStreamData).toBeDefined()
      expect(webStream?.webStreamData?.measurementId).toBe('G-ABC123DEF4')
    })
  })

  describe('Reporting API', () => {
    it('should run report successfully', async () => {
      const reportRequest = {
        dimensions: [{ name: 'date' }, { name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        dateRanges: [{ startDate: '2025-06-01', endDate: '2025-06-15' }],
      }
  }
    }

      const report = await integration.runReport('GA_PROPERTY_123', reportRequest)

      expect(report).toBeDefined()
      expect(report.dimensionHeaders).toBeDefined()
      expect(report.metricHeaders).toBeDefined()
      expect(Array.isArray(report.rows)).toBe(true)
      expect(report.rowCount).toBe(2)
      expect(report.metadata).toBeDefined()
    })

    it('should run realtime report successfully', async () => {
      const reportRequest = {
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
      }
    }

      const report = await integration.runRealtimeReport('GA_PROPERTY_123', reportRequest)

      expect(report).toBeDefined()
      expect(report.dimensionHeaders).toBeDefined()
      expect(report.metricHeaders).toBeDefined()
      expect(Array.isArray(report.rows)).toBe(true)
      expect(report.rowCount).toBe(2)
    })

    it('should run batch reports successfully', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://analyticsdata.googleapis.com/v1beta/properties/GA_PROPERTY_123:batchRunReports':
          IntegrationTestHelper.createMockApiResponse({
            reports: [
              {
                dimensionHeaders: [{ name: 'date' }],
                metricHeaders: [{ name: 'sessions', type: 'TYPE_INTEGER' }],
                rows: [
                  {
                    dimensionValues: [{ value: '20250615' }],
                    metricValues: [{ value: '1250' }],
                  },
                ],
                rowCount: 1,
              },
            ],
          }),
      })
    }

      const requests = [
        {
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'sessions' }],
          dateRanges: [{ startDate: '2025-06-15', endDate: '2025-06-15' }],
        },
      ]

      const result = await integration.batchRunReports('GA_PROPERTY_123', requests)

      expect(result).toBeDefined()
      expect(Array.isArray(result.reports)).toBe(true)
      expect(result.reports.length).toBe(1)
    })

    it('should handle report with filters and ordering', async () => {
      const reportRequest = {
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }],
        dateRanges: [{ startDate: '2025-06-01', endDate: '2025-06-15' }],
        dimensionFilter: {,
          filter: {
            fieldName: 'country',
            stringFilter: {,
              value: 'United States',
              matchType: 'EXACT',
            },
          },
        },
        orderBys: [
          {
            metric: { name: 'sessions' },
            desc: true,
          },
        ],
        limit: 10,
      }
    }

      const report = await integration.runReport('GA_PROPERTY_123', reportRequest)

      expect(report).toBeDefined()
    })
  })

  describe('Dimensions and Metrics', () => {
    it('should get custom dimensions successfully', async () => {
      const dimensions = await integration.getDimensions('GA_PROPERTY_123')
  }
    }

      expect(Array.isArray(dimensions)).toBe(true)
      expect(dimensions.length).toBeGreaterThan(0)

      const dimension = dimensions[0]
      expect(dimension).toHaveProperty('name')
      expect(dimension).toHaveProperty('parameterName')
      expect(dimension).toHaveProperty('displayName')
    })

    it('should get custom metrics successfully', async () => {
      const metrics = await integration.getMetrics('GA_PROPERTY_123')
    }

      expect(Array.isArray(metrics)).toBe(true)
      expect(metrics.length).toBeGreaterThan(0)

      const metric = metrics[0]
      expect(metric).toHaveProperty('name')
      expect(metric).toHaveProperty('parameterName')
      expect(metric).toHaveProperty('displayName')
      expect(metric).toHaveProperty('measurementUnit')
    })
  })

  describe('Audience Management', () => {
    it('should get audiences successfully', async () => {
      const audiences = await integration.getAudiences('GA_PROPERTY_123')
  }
    }

      expect(Array.isArray(audiences)).toBe(true)
      expect(audiences.length).toBeGreaterThan(0)

      const audience = audiences[0]
      expect(audience).toHaveProperty('name')
      expect(audience).toHaveProperty('displayName')
      expect(audience).toHaveProperty('description')
      expect(audience).toHaveProperty('filterClauses')
    })

    it('should create audience successfully', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://analyticsadmin.googleapis.com/v1beta/properties/GA_PROPERTY_123/audiences':
          IntegrationTestHelper.createMockApiResponse({
            name: 'properties/GA_PROPERTY_123/audiences/new_audience_123',
            displayName: 'Test Audience',
          }),
      })
    }

      const audienceData = {
        displayName: 'Test Audience',
        description: 'Test audience for high-value users',
        membershipDurationDays: 30,
        filterClauses: [
          {
            clauseType: 'INCLUDE' as const,
            simpleFilter: {,
              scope: 'AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS',
              filterExpression: {,
                andGroup: {
                  filterExpressions: [
                    {
                      dimensionFilter: {,
                        dimensionName: 'eventName',
                        stringFilter: {,
                          value: 'purchase',
                          matchType: 'EXACT',
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      }

      const audienceId = await integration.createAudience('GA_PROPERTY_123', audienceData)
      expect(typeof audienceId).toBe('string')
      expect(audienceId).toContain('audiences/new_audience_123')
    })
  })

  describe('Conversion Events', () => {
    it('should get conversion events successfully', async () => {
      const events = await integration.getConversionEvents('GA_PROPERTY_123')
  }
    }

      expect(Array.isArray(events)).toBe(true)
      expect(events.length).toBeGreaterThan(0)

      const event = events[0]
      expect(_event).toHaveProperty('name')
      expect(_event).toHaveProperty('eventName')
      expect(_event).toHaveProperty('deletable')
    })

    it('should create conversion _event successfully', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://analyticsadmin.googleapis.com/v1beta/properties/GA_PROPERTY_123/conversionEvents':
          IntegrationTestHelper.createMockApiResponse({
            name: 'properties/GA_PROPERTY_123/conversionEvents/signup',
            eventName: 'signup',
          }),
      })
    }

      const eventData = {
        eventName: 'signup',
        custom: true,
        deletable: true,
        countingMethod: 'ONCE_PER_SESSION' as const,
      }

      const eventId = await integration.createConversionEvent('GA_PROPERTY_123', eventData)
      expect(typeof eventId).toBe('string')
      expect(eventId).toContain('conversionEvents/signup')
    })
  })

  describe('Webhook Handling', () => {
    it('should handle property created webhook', async () => {
      const payload = IntegrationTestHelper.createMock('google-analytics', 'property.created', {
        name: 'properties/GA_PROPERTY_456',
        displayName: 'New Property',
      })
  }
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()

      expect(mocks.metricsService.trackWebhookEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'google-analytics',
        'property.created',
        expect.any(Number),
      )
    })

    it('should handle property updated webhook', async () => {
      const payload = IntegrationTestHelper.createMock('google-analytics', 'property.updated', {
        name: 'properties/GA_PROPERTY_123',
        displayName: 'Updated Property Name',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle property deleted webhook', async () => {
      const payload = IntegrationTestHelper.createMock('google-analytics', 'property.deleted', { name: 'properties/GA_PROPERTY_123' })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle datastream created webhook', async () => {
      const payload = IntegrationTestHelper.createMock('google-analytics', 'datastream.created', {
        name: 'properties/GA_PROPERTY_123/dataStreams/789',
        parent: 'GA_PROPERTY_123',
        type: 'WEB_DATA_STREAM',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle audience created webhook', async () => {
      const payload = IntegrationTestHelper.createMock('google-analytics', 'audience.created', {
        name: 'properties/GA_PROPERTY_123/audiences/456',
        parent: 'GA_PROPERTY_123',
        displayName: 'New Audience',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should validate webhook signature', () => {
      const payload = { test: 'data' }
      const signature = 'valid_signature'
    }

      const result = integration.validateWebhookSignature(payload, signature)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('Error Handling', () => {
    it('should handle API quota exceeded errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://analyticsadmin.googleapis.com/v1beta/properties':
          IntegrationTestHelper.createMockApiResponse(
            {
              error: {,
                code: 429,
                message: 'Quota exceeded for quota metric',
              },
            },
            429,
          ),
      })
  }
    }

      await expect(integration.getProperties()).rejects.toThrow()

      expect(mocks.metricsService.trackRateLimit).toHaveBeenCalled()
    })

    it('should handle insufficient permissions errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://analyticsdata.googleapis.com/v1beta/properties/GA_PROPERTY_123:runReport':
          IntegrationTestHelper.createMockApiResponse(
            {
              error: {,
                code: 403,
                message: 'User does not have sufficient permissions',
              },
            },
            403,
          ),
      })
    }

      const reportRequest = {
        metrics: [{ name: 'sessions' }],
        dateRanges: [{ startDate: '2025-06-01', endDate: '2025-06-15' }],
      }

      await expect(integration.runReport('GA_PROPERTY_123', reportRequest)).rejects.toThrow(
        'insufficient permissions',
      )
    })

    it('should handle invalid property ID errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://analyticsadmin.googleapis.com/v1beta/properties/INVALID_ID':
          IntegrationTestHelper.createMockApiResponse(
            {
              error: {,
                code: 404,
                message: 'Property not found',
              },
            },
            404,
          ),
      })
    }

      await expect(integration.getProperty('INVALID_ID')).rejects.toThrow('Property not found')
    })

    it('should handle network errors', async () => {
      fetchMock.mockRestore()
      fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    }

      const result = await integration.testConnection()

      IntegrationTestHelper.assert(result, { isConnected: false })
    })
  })

  describe('Circuit Breaker Integration', () => {
    it('should use circuit breaker for API calls', async () => {
      await integration.authenticate()
  }
    }

      expect(mocks.circuitBreaker.execute).toHaveBeenCalledWith(
        'google-analytics',
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
        expect.stringContaining('test_integration_google-analytics'),
        'google-analytics',
        'auth.test',
        expect.any(Number),
        true,
      )
    })

    it('should track metrics for failed operations', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries':
          IntegrationTestHelper.createMockApiResponse(
            {
              error: {,
                code: 401,
                message: 'Invalid credentials',
              },
            },
            401,
          ),
      })
    }

      await integration.authenticate()

      expect(mocks.metricsService.trackApiCall).toHaveBeenCalledWith(
        'test_user_123',
        expect.stringContaining('test_integration_google-analytics'),
        'google-analytics',
        'auth.test',
        expect.any(Number),
        false,
        expect.any(String),
      )
    })
  })

  describe('Integration-Specific Features', () => {
    it('should handle GA4 property types correctly', async () => {
      const properties = await integration.getProperties()
  }
    }

      const ga4Property = properties.find(p => p.propertyType === 'PROPERTY_TYPE_GA4')
      expect(ga4Property).toBeDefined()
      expect(ga4Property?.serviceLevel).toBe('GOOGLE_ANALYTICS_STANDARD')
    })

    it('should handle different data stream types', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://analyticsadmin.googleapis.com/v1beta/properties/GA_PROPERTY_123/dataStreams':
          IntegrationTestHelper.createMockApiResponse({
            dataStreams: [
              {
                name: 'properties/GA_PROPERTY_123/dataStreams/web_stream',
                streamId: 'web_stream',
                type: 'WEB_DATA_STREAM',
                displayName: 'Web Stream',
                webStreamData: {,
                  measurementId: 'G-ABC123DEF4',
                  defaultUri: 'https://example.com',
                },
              },
              {
                name: 'properties/GA_PROPERTY_123/dataStreams/android_stream',
                streamId: 'android_stream',
                type: 'ANDROID_APP_DATA_STREAM',
                displayName: 'Android App',
                androidAppStreamData: { packageName: 'com.example.app' },
              },
              {
                name: 'properties/GA_PROPERTY_123/dataStreams/ios_stream',
                streamId: 'ios_stream',
                type: 'IOS_APP_DATA_STREAM',
                displayName: 'iOS App',
                iosAppStreamData: { bundleId: 'com.example.app' },
              },
            ],
          }),
      })
    }

      const streams = await integration.getDataStreams('GA_PROPERTY_123')

      expect(streams.length).toBe(3)
      expect(streams.find(s => s.type === 'WEB_DATA_STREAM')).toBeDefined()
      expect(streams.find(s => s.type === 'ANDROID_APP_DATA_STREAM')).toBeDefined()
      expect(streams.find(s => s.type === 'IOS_APP_DATA_STREAM')).toBeDefined()
    })

    it('should handle complex audience filter clauses', async () => {
      const audiences = await integration.getAudiences('GA_PROPERTY_123')
    }

      const audience = audiences[0]
      expect(audience.filterClauses).toBeDefined()
      expect(audience.filterClauses[0].clauseType).toBe('INCLUDE')
      expect(audience.filterClauses[0].simpleFilter).toBeDefined()
    })

    it('should handle different metric and dimension types', async () => {
      const reportRequest = {
        dimensions: [{ name: 'date' }, { name: 'deviceCategory' }, { name: 'country' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        dateRanges: [{ startDate: '2025-06-01', endDate: '2025-06-15' }],
      }
    }

      const report = await integration.runReport('GA_PROPERTY_123', reportRequest)

      expect(report.metricHeaders).toBeDefined()
      expect(report.metricHeaders.some(h => h.type === 'TYPE_INTEGER')).toBe(true)
    })
  })
})
