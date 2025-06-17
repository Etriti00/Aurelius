import { LinkedInIntegration } from '../../linkedin/linkedin.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('LinkedInIntegration', () => {
  let integration: LinkedInIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(LinkedInIntegration, 'linkedin')
    integration = setup.integration
    mocks = setup.mocks
}
  }

    // Setup default fetch mocks for LinkedIn API
    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://www.linkedin.com/oauth/v2/accessToken':
        IntegrationTestHelper.createMockApiResponse({
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600,
          token_type: 'Bearer'}),
      'GET https://api.linkedin.com/v2/people/~': IntegrationTestHelper.createMockApiResponse({,
        id: 'person123456',
        firstName: {,
          localized: { en_US: 'John' },
          preferredLocale: { country: 'US', language: 'en' },
        lastName: {,
          localized: { en_US: 'Doe' },
          preferredLocale: { country: 'US', language: 'en' },
        headline: {,
          localized: { en_US: 'Senior Software Engineer at Tech Corp' },
          preferredLocale: { country: 'US', language: 'en' },
        summary: 'Passionate software engineer with 8+ years of experience',
        industry: 'Computer Software',
        location: {,
          country: 'United States',
          region: 'California'},
        positions: [
          {
            id: 'pos123',
            title: 'Senior Software Engineer',
            companyName: 'Tech Corp',
            description: 'Leading backend development team',
            location: { country: 'US', region: 'CA' },
            startDate: { year: 2020, month: 1 },
            isCurrent: true,
            company: {,
              id: 'comp123',
              name: 'Tech Corp',
              industry: 'Technology'},
        ],
        educations: [
          {
            id: 'edu123',
            schoolName: 'University of Technology',
            fieldOfStudy: 'Computer Science',
            degree: 'Bachelor of Science',
            startDate: { year: 2014, month: 9 },
            endDate: { year: 2018, month: 6 },
        ],
        skills: [
          {
            id: 'skill123',
            name: {,
              localized: { en_US: 'JavaScript' },
              preferredLocale: { country: 'US', language: 'en' },
            endorsements: 25},
        ],
        profilePicture: {,
          displayImage: 'https://example.com/profile.jpg'},
        publicProfileUrl: 'https://linkedin.com/in/johndoe',
        numConnections: 500,
        numConnectionsCapped: false}),
      'GET https://api.linkedin.com/v2/people/person123456':
        IntegrationTestHelper.createMockApiResponse({
          id: 'person123456',
          firstName: {,
            localized: { en_US: 'John' },
            preferredLocale: { country: 'US', language: 'en' },
          lastName: {,
            localized: { en_US: 'Doe' },
            preferredLocale: { country: 'US', language: 'en' },
          headline: {,
            localized: { en_US: 'Senior Software Engineer at Tech Corp' },
            preferredLocale: { country: 'US', language: 'en' }),
      'PATCH https://api.linkedin.com/v2/people/person123456':
        IntegrationTestHelper.createMockApiResponse({
          id: 'person123456',
          firstName: {,
            localized: { en_US: 'John' },
            preferredLocale: { country: 'US', language: 'en' },
          lastName: {,
            localized: { en_US: 'Doe' },
            preferredLocale: { country: 'US', language: 'en' },
          headline: {,
            localized: { en_US: 'Updated Headline' },
            preferredLocale: { country: 'US', language: 'en' }),
      'GET https://api.linkedin.com/v2/ugcPosts': IntegrationTestHelper.createMockApiResponse({,
        elements: [
          {
            id: 'post123456',
            author: 'urn:li:person:person123456',
            text: {,
              text: 'Excited to share my latest project!'},
            created: { time: 1640995200000 },
            lastModified: { time: 1640995200000 },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'},
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {,
                  text: 'Excited to share my latest project!'},
                shareMediaCategory: 'NONE'},
        ],
        paging: {,
          count: 1,
          start: 0}),
      'GET https://api.linkedin.com/v2/ugcPosts/post123456':
        IntegrationTestHelper.createMockApiResponse({
          id: 'post123456',
          author: 'urn:li:person:person123456',
          text: {,
            text: 'Excited to share my latest project!'},
          created: { time: 1640995200000 },
          lastModified: { time: 1640995200000 },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'},
          lifecycleState: 'PUBLISHED'}),
      'POST https://api.linkedin.com/v2/ugcPosts': IntegrationTestHelper.createMockApiResponse({,
        id: 'newpost789',
        author: 'urn:li:person:person123456',
        text: {,
          text: 'New post created via API'},
        lifecycleState: 'PUBLISHED'}),
      'PATCH https://api.linkedin.com/v2/ugcPosts/post123456':
        IntegrationTestHelper.createMockApiResponse({
          id: 'post123456',
          author: 'urn:li:person:person123456',
          text: {,
            text: 'Updated post content'},
          lifecycleState: 'PUBLISHED'}),
      'DELETE https://api.linkedin.com/v2/ugcPosts/post123456': new Response('', { status: 204 }),
      'GET https://api.linkedin.com/v2/connections': IntegrationTestHelper.createMockApiResponse({,
        elements: [
          {
            id: 'conn123',
            firstName: 'Jane',
            lastName: 'Smith',
            headline: 'Product Manager at Innovation Co',
            profilePicture: 'https://example.com/jane.jpg',
            publicProfileUrl: 'https://linkedin.com/in/janesmith',
            connectedAt: 1640995200000,
            positions: [
              {
                id: 'pos456',
                title: 'Product Manager',
                companyName: 'Innovation Co',
                isCurrent: true},
            ]},
        ],
        paging: {,
          count: 1,
          start: 0}),
      'POST https://api.linkedin.com/v2/invitations': new Response('', { status: 201 }),
      'PUT https://api.linkedin.com/v2/invitations/invite123':
        IntegrationTestHelper.createMockApiResponse({
          status: 'accepted'}),
      'DELETE https://api.linkedin.com/v2/connections/person123456/conn123': new Response('', {
        status: 204}),
      'GET https://api.linkedin.com/v2/organizations/comp123':
        IntegrationTestHelper.createMockApiResponse({
          id: 'comp123',
          name: {,
            localized: { en_US: 'Tech Corp' },
            preferredLocale: { country: 'US', language: 'en' },
          description: {,
            localized: { en_US: 'Leading technology company' },
            preferredLocale: { country: 'US', language: 'en' },
          founded: { year: 2010 },
          headquarters: {,
            country: 'United States',
            region: 'California',
            city: 'San Francisco'},
          industry: 'Computer Software',
          companyType: 'Public Company',
          employeeCountRange: {,
            start: 1000,
            end: 5000},
          specialties: ['Software Development', 'Cloud Computing', 'AI'],
          website: 'https://techcorp.com',
          logo: 'https://example.com/logo.jpg',
          followerCount: 10000}),
      'GET https://api.linkedin.com/v2/organizationSearch':
        IntegrationTestHelper.createMockApiResponse({
          elements: [
            {
              id: 'search123',
              name: {,
                localized: { en_US: 'Search Result Company' },
                preferredLocale: { country: 'US', language: 'en' },
              industry: 'Technology'},
          ]}),
      'POST https://api.linkedin.com/v2/networkUpdates': new Response('', { status: 201 }),
      'GET https://api.linkedin.com/v2/messages': IntegrationTestHelper.createMockApiResponse({,
        elements: [
          {
            id: 'msg123',
            from: { person: 'urn:li:person:conn123' },
            recipients: ['urn:li:person:person123456'],
            subject: 'Hello!',
            body: 'Thanks for connecting!',
            createdAt: 1640995200000,
            modifiedAt: 1640995200000,
            messageType: 'MEMBER_TO_MEMBER'},
        ]}),
      'POST https://api.linkedin.com/v2/messages': IntegrationTestHelper.createMockApiResponse({,
        id: 'newmsg456',
        from: { person: 'urn:li:person:person123456' },
        recipients: ['urn:li:person:conn123'],
        subject: 'Reply',
        body: 'Thanks for the message!'}),
      'GET https://api.linkedin.com/v2/analyticsFinderCriteria':
        IntegrationTestHelper.createMockApiResponse({
          timeRange: {,
            start: 1640908800000,
            end: 1640995200000},
          elements: [
            {
              profileViews: 50,
              postViews: 200,
              searchAppearances: 25,
              connectionRequests: 5,
              followers: 150,
              impressions: 1000,
              clicks: 75,
              reactions: 30,
              comments: 10,
              shares: 5},
          ]}),
      'GET https://api.linkedin.com/v2/socialActions/post123456/statistics':
        IntegrationTestHelper.createMockApiResponse({
          likes: 15,
          comments: 3,
          shares: 2,
          impressions: 250,
          clicks: 20}),
      'GET https://api.linkedin.com/v2/peopleSearch': IntegrationTestHelper.createMockApiResponse({,
        elements: [
          {
            id: 'search456',
            firstName: {,
              localized: { en_US: 'Search' },
              preferredLocale: { country: 'US', language: 'en' },
            lastName: {,
              localized: { en_US: 'Result' },
              preferredLocale: { country: 'US', language: 'en' },
            headline: {,
              localized: { en_US: 'Software Developer' },
              preferredLocale: { country: 'US', language: 'en' },
        ]})})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with valid credentials', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        code: 'mock_code',
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        redirectUri: 'http://localhost:3000/callback'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresIn: 3600,
        userId: 'person123456',
        userInfo: {,
          id: 'person123456',
          name: 'John Doe',
          email: 'person123456'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'mock_access_token',
        'test-user-id',
      )
    })

    it('should handle authentication errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(
          IntegrationTestHelper.createMockErrorResponse(401, 'Invalid authorization code'),
        ),
      )
    }

      const config = IntegrationTestHelper.createMockConfig({
        code: 'invalid_code'})

      await expect(integration.authenticate(config)).rejects.toThrow('Authentication failed')
    })
  })

  describe('Connection Status', () => {
    it('should return connected status when authenticated', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
  }
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(true)
      expect(status.user).toMatchObject({
        id: 'person123456',
        name: 'John Doe',
        email: 'person123456'})
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
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should sync successfully and return comprehensive data', async () => {
      const config = IntegrationTestHelper.createMockConfig()
    }

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        profile: expect.objectContaining({,
          id: 'person123456',
          firstName: expect.objectContaining({,
            localized: { en_US: 'John' })}),
        posts: expect.arrayContaining([
          expect.objectContaining({
            id: 'post123456',
            author: 'urn:li:person:person123456'}),
        ]),
        connections: expect.arrayContaining([
          expect.objectContaining({
            id: 'conn123',
            firstName: 'Jane',
            lastName: 'Smith'}),
        ]),
        syncedAt: expect.any(String)})
      }
    })

    it('should handle partial sync failures gracefully', async () => {
      fetchMock.mockImplementationOnce(url => {
        if (url.includes('/ugcPosts')) {
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

  describe('Profile Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get current profile successfully', async () => {
      const _profile = await integration.getCurrentProfile()
    }

      expect(profile).toMatchObject({
        id: 'person123456',
        firstName: {,
          localized: { en_US: 'John' },
        lastName: {,
          localized: { en_US: 'Doe' },
        headline: {,
          localized: { en_US: 'Senior Software Engineer at Tech Corp' })
      }
    })

    it('should get profile by ID successfully', async () => {
      const _profile = await integration.getProfile('person123456')
    }

      expect(profile).toMatchObject({
        id: 'person123456',
        firstName: {,
          localized: { en_US: 'John' })
      }
    })

    it('should update profile successfully', async () => {
      const updates = {
        headline: {,
          localized: { en_US: 'Updated Headline' },
          preferredLocale: { country: 'US', language: 'en' }
    }

      const updatedProfile = await integration.updateProfile(updates)

      expect(updatedProfile).toMatchObject({
        id: 'person123456',
        headline: {,
          localized: { en_US: 'Updated Headline' })
      }
    })
  })

  describe('Posts & Content', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get posts successfully', async () => {
      const posts = await integration.getPosts()
    }

      expect(posts).toHaveLength(1)
      expect(posts[0]).toMatchObject({
        id: 'post123456',
        author: 'urn:li:person:person123456',
        lifecycleState: 'PUBLISHED'})
    })

    it('should get post by ID successfully', async () => {
      const post = await integration.getPost('post123456')
    }

      expect(post).toMatchObject({
        id: 'post123456',
        author: 'urn:li:person:person123456'})
    })

    it('should create post successfully', async () => {
      const content = {
        text: 'New post created via API'}
    }

      const post = await integration.createPost(content)

      expect(post).toMatchObject({
        id: 'newpost789',
        author: 'urn:li:person:person123456'})
    })

    it('should create post with media successfully', async () => {
      const content = {
        text: 'Post with media',
        media: [
          {
            url: 'https://example.com/image.jpg',
            title: 'Example Image',
            description: 'An example image'},
        ]}
    }

      const post = await integration.createPost(content, 'PUBLIC')

      expect(post).toMatchObject({
        id: 'newpost789'})
    })

    it('should update post successfully', async () => {
      const updates = {
        text: {,
          text: 'Updated post content'}
    }

      const updatedPost = await integration.updatePost('post123456', updates)

      expect(updatedPost).toMatchObject({
        id: 'post123456',
        text: {,
          text: 'Updated post content'})
      }
    })

    it('should delete post successfully', async () => {
      const result = await integration.deletePost('post123456')
    }

      expect(result).toBe(true)
    })
  })

  describe('Connections & Networking', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get connections successfully', async () => {
      const connections = await integration.getConnections()
    }

      expect(connections).toHaveLength(1)
      expect(connections[0]).toMatchObject({
        id: 'conn123',
        firstName: 'Jane',
        lastName: 'Smith',
        headline: 'Product Manager at Innovation Co'})
    })

    it('should send connection request successfully', async () => {
      const result = await integration.sendConnectionRequest(
        'newperson789',
        'I would like to connect',
      )
    }

      expect(result).toBe(true)
    })

    it('should accept connection request successfully', async () => {
      const result = await integration.acceptConnectionRequest('invite123')
    }

      expect(result).toBe(true)
    })

    it('should remove connection successfully', async () => {
      const result = await integration.removeConnection('conn123')
    }

      expect(result).toBe(true)
    })
  })

  describe('Company Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get company successfully', async () => {
      const company = await integration.getCompany('comp123')
    }

      expect(company).toMatchObject({
        id: 'comp123',
        name: {,
          localized: { en_US: 'Tech Corp' },
        industry: 'Computer Software',
        employeeCountRange: {,
          start: 1000,
          end: 5000})
      }
    })

    it('should search companies successfully', async () => {
      const companies = await integration.searchCompanies('technology')
    }

      expect(companies).toHaveLength(1)
      expect(companies[0]).toMatchObject({
        id: 'search123',
        name: {,
          localized: { en_US: 'Search Result Company' })
      }
    })

    it('should follow company successfully', async () => {
      const result = await integration.followCompany('comp123')
    }

      expect(result).toBe(true)
    })

    it('should unfollow company successfully', async () => {
      const result = await integration.unfollowCompany('comp123')
    }

      expect(result).toBe(true)
    })
  })

  describe('Messaging', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get messages successfully', async () => {
      const messages = await integration.getMessages()
    }

      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({
        id: 'msg123',
        from: { person: 'urn:li:person:conn123' },
        subject: 'Hello!',
        body: 'Thanks for connecting!'})
    })

    it('should send message successfully', async () => {
      const message = await integration.sendMessage('conn123', 'Reply', 'Thanks for the message!')
    }

      expect(message).toMatchObject({
        id: 'newmsg456',
        from: { person: 'urn:li:person:person123456' },
        subject: 'Reply',
        body: 'Thanks for the message!'})
    })
  })

  describe('Analytics & Insights', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get analytics successfully', async () => {
      const startDate = new Date('2022-01-01')
      const endDate = new Date('2022-01-31')
    }

      const analytics = await integration.getAnalytics(startDate, endDate)

      expect(analytics).toMatchObject({
        timeRange: {,
          start: expect.any(Number),
          end: expect.any(Number)},
        elements: expect.arrayContaining([
          expect.objectContaining({
            profileViews: 50,
            postViews: 200,
            searchAppearances: 25}),
        ])})
    })

    it('should get post analytics successfully', async () => {
      const analytics = await integration.getPostAnalytics('post123456')
    }

      expect(analytics).toMatchObject({
        likes: 15,
        comments: 3,
        shares: 2,
        impressions: 250,
        clicks: 20})
    })
  })

  describe('Search', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should search people successfully', async () => {
      const people = await integration.searchPeople('software developer')
    }

      expect(people).toHaveLength(1)
      expect(people[0]).toMatchObject({
        id: 'search456',
        firstName: {,
          localized: { en_US: 'Search' },
        lastName: {,
          localized: { en_US: 'Result' })
      }
    })

    it('should search people with filters successfully', async () => {
      const filters = {
        industry: 'Technology',
        location: 'San Francisco',
        company: 'Tech Corp'}
    }

      const people = await integration.searchPeople('developer', filters)

      expect(people).toHaveLength(1)
    })
  })

  describe('Webhook Handling', () => {
    it('should process valid webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'linkedin-signature': 'valid-signature'},
        body: JSON.stringify({,
          eventType: 'PROFILE_UPDATE',
          personId: 'person123456',
          timestamp: Date.now()}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should handle new connection webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'linkedin-signature': 'valid-signature'},
        body: JSON.stringify({,
          eventType: 'NEW_CONNECTION',
          connectionId: 'conn456',
          timestamp: Date.now()}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should handle new message webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'linkedin-signature': 'valid-signature'},
        body: JSON.stringify({,
          eventType: 'NEW_MESSAGE',
          messageId: 'msg789',
          timestamp: Date.now()}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle API rate limiting', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(
          IntegrationTestHelper.createMockErrorResponse(429, 'Too Many Requests', {
            'x-ratelimit-reset': '1640995200'}),
        ),
      )
  }
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')

      await expect(integration.getCurrentProfile()).rejects.toThrow('API request failed')
    })

    it('should handle network errors gracefully', async () => {
      fetchMock.mockImplementationOnce(() => Promise.reject(new Error('Network error')))
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')

      await expect(integration.getCurrentProfile()).rejects.toThrow('Network error')
    })

    it('should handle invalid tokens', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(401, 'Unauthorized')),
      )
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('invalid_token')

      await expect(integration.getCurrentProfile()).rejects.toThrow('API request failed')
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should cache profile information', async () => {
      await integration.getCurrentProfile()
    }

      // Second call should use cache
      fetchMock.mockClear()
      await integration.getCurrentProfile()

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should cache posts and connections', async () => {
      await integration.getPosts()
      await integration.getConnections()
    }

      // Verify cache is populated
      expect(integration['postsCache'].size).toBeGreaterThan(0)
      expect(integration['connectionsCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getCurrentProfile()
      await integration.getPosts()
    }

      integration.clearCache()

      expect(integration['profileCache']).toBeNull()
      expect(integration['postsCache'].size).toBe(0)
      expect(integration['connectionsCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'social',
        'content',
        'messaging',
        'analytics',
        'networking',
        'profiles',
        'companies',
        'posts',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('linkedin')
      expect(integration.name).toBe('LinkedIn')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
