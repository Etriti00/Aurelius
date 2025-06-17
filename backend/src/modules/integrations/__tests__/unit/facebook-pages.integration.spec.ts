import { User } from '@prisma/client';
import { FacebookPagesIntegration } from '../../facebook-pages/facebook-pages.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('FacebookPagesIntegration', () => {
  let integration: FacebookPagesIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(
      FacebookPagesIntegration,
      'facebook-pages',
    )
    integration = setup.integration
    mocks = setup.mocks
}
  }

    fetchMock = IntegrationTestHelper.mockFetch({
      'GET https://graph.facebook.com/v18.0/oauth/access_token':
        IntegrationTestHelper.createMockApiResponse({
          access_token: 'test_access_token',
          token_type: 'Bearer',
          expires_in: 5183944,
          refresh_token: 'test_refresh_token'}),
      'GET https://graph.facebook.com/v18.0/me': IntegrationTestHelper.createMockApiResponse({,
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        picture: {,
          data: {
            url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/user123.jpg'}),
      'GET https://graph.facebook.com/v18.0/me/accounts':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'page123',
              name: 'Test Business Page',
              category: 'Business',
              category_list: [
                {
                  id: 'cat1',
                  name: 'Business & Industry'},
              ],
              access_token: 'page_access_token',
              tasks: ['ADVERTISE', 'ANALYZE', 'CREATE_CONTENT', 'MANAGE', 'MESSAGING', 'MODERATE'],
              about: 'Test business description',
              description: 'Test business page description',
              website: 'https://example.com',
              phone: '+1-555-123-4567',
              location: {,
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                country: 'US',
                zip: '10001'},
              hours: {,
                mon_1_open: '0900',
                mon_1_close: '1700',
                tue_1_open: '0900',
                tue_1_close: '1700'},
              cover: {,
                source: 'https://scontent.xx.fbcdn.net/cover.jpg'},
              picture: {,
                data: {
                  url: 'https://scontent.xx.fbcdn.net/page_picture.jpg'},
              link: 'https://www.facebook.com/testbusiness',
              fan_count: 1250,
              followers_count: 1300,
              verification_status: 'blue_verified',
              is_published: true},
          ]}),
      'GET https://graph.facebook.com/v18.0/page123': IntegrationTestHelper.createMockApiResponse({,
        id: 'page123',
        name: 'Test Business Page',
        category: 'Business',
        about: 'Test business description',
        link: 'https://www.facebook.com/testbusiness',
        fan_count: 1250}),
      'GET https://graph.facebook.com/v18.0/page123/posts':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'page123_post456',
              message: 'Check out our latest product!',
              permalink_url: 'https://www.facebook.com/testbusiness/posts/456',
              created_time: '2024-01-15T10:00:00+0000',
              updated_time: '2024-01-15T10:30:00+0000',
              type: 'status',
              status_type: 'mobile_status_update',
              reactions: {,
                data: [
                  {
                    id: 'user789',
                    name: 'Jane Smith',
                    type: 'LIKE'},
                ],
                summary: {,
                  total_count: 15},
              comments: {,
                data: [
                  {
                    id: 'comment123',
                    message: 'Great product!',
                    created_time: '2024-01-15T11:00:00+0000',
                    from: {,
                      id: 'user789',
                      name: 'Jane Smith'},
                ],
                summary: {,
                  total_count: 3},
              shares: {,
                count: 2},
          ]}),
      'GET https://graph.facebook.com/v18.0/page123_post456':
        IntegrationTestHelper.createMockApiResponse({
          id: 'page123_post456',
          message: 'Check out our latest product!',
          permalink_url: 'https://www.facebook.com/testbusiness/posts/456',
          created_time: '2024-01-15T10:00:00+0000',
          type: 'status'}),
      'POST https://graph.facebook.com/v18.0/page123/feed':
        IntegrationTestHelper.createMockApiResponse({
          id: 'page123_new789'}),
      'POST https://graph.facebook.com/v18.0/page123_post456':
        IntegrationTestHelper.createMockApiResponse({
          success: true}),
      'DELETE https://graph.facebook.com/v18.0/page123_post456':
        IntegrationTestHelper.createMockApiResponse({
          success: true}),
      'GET https://graph.facebook.com/v18.0/page123_post456/comments':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'comment123',
              message: 'Great product!',
              created_time: '2024-01-15T11:00:00+0000',
              from: {,
                id: 'user789',
                name: 'Jane Smith',
                picture: {,
                  data: {
                    url: 'https://platform-lookaside.fbsbx.com/platform/profilepic/user789.jpg'},
              like_count: 2,
              comment_count: 0,
              can_reply: true,
              can_hide: true,
              can_remove: false},
          ]}),
      'POST https://graph.facebook.com/v18.0/comment123/comments':
        IntegrationTestHelper.createMockApiResponse({
          id: 'reply456',
          message: 'Thank you for your feedback!'}),
      'POST https://graph.facebook.com/v18.0/comment123':
        IntegrationTestHelper.createMockApiResponse({
          success: true}),
      'GET https://graph.facebook.com/v18.0/page123/insights':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              name: 'page_fans',
              period: 'day',
              values: [
                {
                  value: 1250,
                  end_time: '2024-01-15T08:00:00+0000'},
              ],
              title: 'Page Fans',
              description: 'Total number of people who have liked your Page',
              id: 'page123/insights/page_fans/day'},
          ]}),
      'GET https://graph.facebook.com/v18.0/page123_post456/insights':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              name: 'post_impressions',
              values: [
                {
                  value: 523,
                  end_time: '2024-01-15T08:00:00+0000'},
              ],
              title: 'Post Impressions',
              description: 'The number of times your post was displayed',
              id: 'page123_post456/insights/post_impressions'},
          ]}),
      'GET https://graph.facebook.com/v18.0/page123/photos':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'photo123',
              created_time: '2024-01-15T12:00:00+0000',
              name: 'Product showcase',
              picture: 'https://scontent.xx.fbcdn.net/photo_s.jpg',
              source: 'https://scontent.xx.fbcdn.net/photo_o.jpg',
              link: 'https://www.facebook.com/photo.php?fbid=photo123',
              height: 1080,
              width: 1920,
              images: [
                {
                  height: 1080,
                  width: 1920,
                  source: 'https://scontent.xx.fbcdn.net/photo_o.jpg'},
                {
                  height: 540,
                  width: 960,
                  source: 'https://scontent.xx.fbcdn.net/photo_m.jpg'},
              ]},
          ]}),
      'POST https://graph.facebook.com/v18.0/page123/photos':
        IntegrationTestHelper.createMockApiResponse({
          id: 'photo789',
          post_id: 'page123_photo789'}),
      'POST https://graph.facebook.com/v18.0/page123': IntegrationTestHelper.createMockApiResponse({,
        success: true})})
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
        code: 'oauth_code_123',
        redirectUri: 'https://app.example.com/callback'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 5183944,
        userId: 'user123',
        userInfo: {,
          id: 'user123',
          name: 'John Doe',
          email: 'john@example.com'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'test_access_token',
        'test-user-id',
      )
    })

    it('should handle authentication errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(401, 'Invalid OAuth code')),
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
        email: 'john@example.com'})
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
        pages: expect.arrayContaining([
          expect.objectContaining({
            id: 'page123',
            name: 'Test Business Page',
            category: 'Business'}),
        ]),
        posts: expect.arrayContaining([
          expect.objectContaining({
            id: 'page123_post456',
            message: 'Check out our latest product!'}),
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
        name: 'John Doe',
        email: 'john@example.com'})
    })
  })

  describe('Pages Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get pages successfully', async () => {
      const pages = await integration.getPages()
    }

      expect(pages).toHaveLength(1)
      expect(pages[0]).toMatchObject({
        id: 'page123',
        name: 'Test Business Page',
        category: 'Business',
        fan_count: 1250,
        followers_count: 1300})
    })

    it('should get specific page successfully', async () => {
      const page = await integration.getPage('page123')
    }

      expect(page).toMatchObject({
        id: 'page123',
        name: 'Test Business Page',
        category: 'Business'})
    })

    it('should update page info successfully', async () => {
      const updatedPage = await integration.updatePageInfo('page123', {
        about: 'Updated description',
        website: 'https://newsite.com'})
    }

      expect(updatedPage).toMatchObject({
        id: 'page123',
        name: 'Test Business Page'})
    })
  })

  describe('Posts Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get page posts successfully', async () => {
      const posts = await integration.getPagePosts('page123')
    }

      expect(posts).toHaveLength(1)
      expect(posts[0]).toMatchObject({
        id: 'page123_post456',
        message: 'Check out our latest product!',
        type: 'status'})
    })

    it('should get specific post successfully', async () => {
      const post = await integration.getPost('page123_post456')
    }

      expect(post).toMatchObject({
        id: 'page123_post456',
        message: 'Check out our latest product!',
        type: 'status'})
    })

    it('should create post successfully', async () => {
      const post = await integration.createPost(
        'page123',
        'New product announcement!',
        'https://example.com/product',
      )
    }

      expect(post).toMatchObject({
        id: 'page123_post456',
        message: 'Check out our latest product!'})
    })

    it('should update post successfully', async () => {
      const post = await integration.updatePost('page123_post456', 'Updated message')
    }

      expect(post).toMatchObject({
        id: 'page123_post456',
        message: 'Check out our latest product!'})
    })

    it('should delete post successfully', async () => {
      const result = await integration.deletePost('page123_post456')
    }

      expect(result).toBe(true)
    })
  })

  describe('Comments Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get post comments successfully', async () => {
      const comments = await integration.getPostComments('page123_post456')
    }

      expect(comments).toHaveLength(1)
      expect(comments[0]).toMatchObject({
        id: 'comment123',
        message: 'Great product!',
        from: {,
          id: 'user789',
          name: 'Jane Smith'})
      }
    })

    it('should reply to comment successfully', async () => {
      const reply = await integration.replyToComment('comment123', 'Thank you for your feedback!')
    }

      expect(reply).toMatchObject({
        id: 'reply456',
        message: 'Thank you for your feedback!'})
    })

    it('should hide comment successfully', async () => {
      const result = await integration.hideComment('comment123')
    }

      expect(result).toBe(true)
    })
  })

  describe('Insights & Analytics', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get page insights successfully', async () => {
      const insights = await integration.getPageInsights(
        'page123',
        ['page_fans', 'page_views'],
        'day',
      )
    }

      expect(insights).toHaveLength(1)
      expect(insights[0]).toMatchObject({
        name: 'page_fans',
        period: 'day',
        title: 'Page Fans'})
    })

    it('should get post insights successfully', async () => {
      const insights = await integration.getPostInsights('page123_post456')
    }

      expect(insights).toHaveLength(1)
      expect(insights[0]).toMatchObject({
        name: 'post_impressions',
        title: 'Post Impressions'})
    })
  })

  describe('Photos Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get page photos successfully', async () => {
      const photos = await integration.getPagePhotos('page123')
    }

      expect(photos).toHaveLength(1)
      expect(photos[0]).toMatchObject({
        id: 'photo123',
        name: 'Product showcase',
        height: 1080,
        width: 1920})
    })

    it('should upload photo successfully', async () => {
      const photo = await integration.uploadPhoto(
        'page123',
        'https://example.com/image.jpg',
        'New product photo',
      )
    }

      expect(photo).toMatchObject({
        id: 'photo789'})
    })
  })

  describe('Webhook Handling', () => {
    it('should process page feed webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          object: 'page',
          entry: [
            {
              id: 'page123',
              time: 1642248000,
              changes: [
                {
                  field: 'feed',
                  value: {,
                    item: 'post',
                    post_id: 'page123_new789',
                    verb: 'add'},
              ]},
          ]}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process messaging webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          object: 'page',
          entry: [
            {
              id: 'page123',
              time: 1642248000,
              messaging: [
                {
                  sender: {,
                    id: 'user789'},
                  recipient: {,
                    id: 'page123'},
                  timestamp: 1642248000,
                  message: {,
                    mid: 'message123',
                    text: 'Hello!'},
              ]},
          ]}),
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
      await integration.getPages()
      await integration.getPagePosts('page123')
    }

      expect(integration['pagesCache'].size).toBeGreaterThan(0)
      expect(integration['postsCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getPages()
      await integration.getPagePosts('page123')
    }

      integration.clearCache()

      expect(integration['pagesCache'].size).toBe(0)
      expect(integration['postsCache'].size).toBe(0)
      expect(integration['commentsCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'pages',
        'posts',
        'comments',
        'insights',
        'photos',
        'publishing',
        'engagement',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('facebook-pages')
      expect(integration.name).toBe('Facebook Pages')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
