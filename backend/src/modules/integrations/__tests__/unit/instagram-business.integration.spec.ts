import { User } from '@prisma/client';
import { InstagramBusinessIntegration } from '../../instagram-business/instagram-business.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('InstagramBusinessIntegration', () => {
  let integration: InstagramBusinessIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(
      InstagramBusinessIntegration,
      'instagram-business',
    )
    integration = setup.integration
    mocks = setup.mocks
}
  }

    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://api.instagram.com/oauth/access_token':
        IntegrationTestHelper.createMockApiResponse({
          access_token: 'short_lived_token',
          user_id: 'user123'}),
      'GET https://graph.instagram.com/access_token': IntegrationTestHelper.createMockApiResponse({,
        access_token: 'long_lived_token',
        token_type: 'bearer',
        expires_in: 5183944}),
      'GET https://graph.instagram.com/v18.0/me': IntegrationTestHelper.createMockApiResponse({,
        id: 'user123',
        account_type: 'BUSINESS',
        media_count: 150,
        username: 'testbusiness',
        name: 'Test Business',
        biography: 'Official Test Business Account',
        website: 'https://testbusiness.com',
        profile_picture_url: 'https://scontent.cdninstagram.com/profile.jpg',
        followers_count: 5420,
        follows_count: 320,
        ig_id: 'ig123'}),
      'GET https://graph.instagram.com/v18.0/ig123/media':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'media123',
              ig_id: 'ig_media123',
              caption: 'Check out our latest product! #newlaunch #business',
              media_type: 'IMAGE',
              media_url: 'https://scontent.cdninstagram.com/image.jpg',
              permalink: 'https://www.instagram.com/p/media123',
              timestamp: '2024-01-15T10:00:00+0000',
              username: 'testbusiness',
              like_count: 125,
              comments_count: 18,
              children: {,
                data: []},
            {
              id: 'media456',
              ig_id: 'ig_media456',
              caption: 'Behind the scenes at our office',
              media_type: 'CAROUSEL_ALBUM',
              media_url: 'https://scontent.cdninstagram.com/carousel1.jpg',
              permalink: 'https://www.instagram.com/p/media456',
              timestamp: '2024-01-14T14:30:00+0000',
              username: 'testbusiness',
              like_count: 89,
              comments_count: 12,
              children: {,
                data: [
                  {
                    id: 'child1',
                    media_type: 'IMAGE',
                    media_url: 'https://scontent.cdninstagram.com/carousel1.jpg'},
                  {
                    id: 'child2',
                    media_type: 'IMAGE',
                    media_url: 'https://scontent.cdninstagram.com/carousel2.jpg'},
                ]},
          ]}),
      'GET https://graph.instagram.com/v18.0/media123': IntegrationTestHelper.createMockApiResponse(
        {
          id: 'media123',
          ig_id: 'ig_media123',
          caption: 'Check out our latest product!',
          media_type: 'IMAGE',
          media_url: 'https://scontent.cdninstagram.com/image.jpg',
          permalink: 'https://www.instagram.com/p/media123'},
      ),
      'POST https://graph.instagram.com/v18.0/ig123/media':
        IntegrationTestHelper.createMockApiResponse({
          id: 'container123'}),
      'POST https://graph.instagram.com/v18.0/ig123/media_publish':
        IntegrationTestHelper.createMockApiResponse({
          id: 'new_media789'}),
      'GET https://graph.instagram.com/v18.0/new_media789':
        IntegrationTestHelper.createMockApiResponse({
          id: 'new_media789',
          media_type: 'IMAGE',
          media_url: 'https://example.com/new-image.jpg',
          permalink: 'https://www.instagram.com/p/new_media789'}),
      'GET https://graph.instagram.com/v18.0/media123/comments':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'comment123',
              text: 'Love this product! Where can I buy it?',
              timestamp: '2024-01-15T11:00:00+0000',
              username: 'customer1',
              user: {,
                id: 'user456',
                username: 'customer1',
                profile_picture_url: 'https://scontent.cdninstagram.com/user456.jpg'},
              like_count: 3,
              replies: {,
                data: []},
              hidden: false},
            {
              id: 'comment456',
              text: 'Amazing quality! 🔥',
              timestamp: '2024-01-15T12:30:00+0000',
              username: 'customer2',
              user: {,
                id: 'user789',
                username: 'customer2'},
              like_count: 1,
              replies: {,
                data: []},
              hidden: false},
          ]}),
      'POST https://graph.instagram.com/v18.0/comment123/replies':
        IntegrationTestHelper.createMockApiResponse({
          id: 'reply123',
          text: 'Thanks for your interest! Check our website.',
          timestamp: '2024-01-15T13:00:00+0000'}),
      'POST https://graph.instagram.com/v18.0/comment456':
        IntegrationTestHelper.createMockApiResponse({
          success: true}),
      'GET https://graph.instagram.com/v18.0/ig123/stories':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'story123',
              ig_id: 'ig_story123',
              media_type: 'IMAGE',
              media_url: 'https://scontent.cdninstagram.com/story.jpg',
              timestamp: '2024-01-15T09:00:00+0000',
              expires_at: '2024-01-16T09:00:00+0000'},
          ]}),
      'GET https://graph.instagram.com/v18.0/story123': IntegrationTestHelper.createMockApiResponse(
        {
          id: 'story123',
          ig_id: 'ig_story123',
          media_type: 'IMAGE',
          media_url: 'https://scontent.cdninstagram.com/story.jpg',
          timestamp: '2024-01-15T09:00:00+0000'},
      ),
      'GET https://graph.instagram.com/v18.0/ig_hashtag_search':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'hashtag123',
              name: 'business'},
          ]}),
      'GET https://graph.instagram.com/v18.0/hashtag123':
        IntegrationTestHelper.createMockApiResponse({
          id: 'hashtag123',
          name: 'business',
          media_count: 1500000,
          top_media: {,
            data: [
              {
                id: 'top_media1',
                media_type: 'IMAGE',
                media_url: 'https://scontent.cdninstagram.com/top1.jpg',
                permalink: 'https://www.instagram.com/p/top_media1'},
            ]},
          recent_media: {,
            data: [
              {
                id: 'recent_media1',
                media_type: 'IMAGE',
                media_url: 'https://scontent.cdninstagram.com/recent1.jpg',
                permalink: 'https://www.instagram.com/p/recent_media1'},
            ]}),
      'GET https://graph.instagram.com/v18.0/ig123/insights':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              name: 'impressions',
              period: 'day',
              values: [
                {
                  value: 1250,
                  end_time: '2024-01-15T08:00:00+0000'},
              ],
              title: 'Impressions',
              description: 'Total number of times posts were seen',
              id: 'ig123/insights/impressions/day'},
            {
              name: 'reach',
              period: 'day',
              values: [
                {
                  value: 980,
                  end_time: '2024-01-15T08:00:00+0000'},
              ],
              title: 'Reach',
              description: 'Number of unique accounts that saw posts',
              id: 'ig123/insights/reach/day'},
          ]}),
      'GET https://graph.instagram.com/v18.0/media123/insights':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              name: 'impressions',
              values: [
                {
                  value: 523,
                  end_time: '2024-01-15T08:00:00+0000'},
              ],
              title: 'Impressions',
              description: 'Number of times this post was seen'},
            {
              name: 'engagement',
              values: [
                {
                  value: 143,
                  end_time: '2024-01-15T08:00:00+0000'},
              ],
              title: 'Engagement',
              description: 'Total interactions with this post'},
          ]})})
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
        code: 'auth_code_123',
        redirectUri: 'https://app.example.com/callback'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'long_lived_token',
        expiresIn: 5183944,
        userId: 'user123',
        userInfo: {,
          id: 'user123',
          name: 'Test Business',
          email: 'testbusiness'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'long_lived_token',
        'test-user-id',
      )
    })

    it('should handle authentication errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(
          IntegrationTestHelper.createMockErrorResponse(400, 'Invalid authorization code'),
        ),
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
      mocks.encryptionService.decryptToken.mockResolvedValue('long_lived_token')
  }
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(true)
      expect(status.user).toMatchObject({
        id: 'user123',
        name: 'Test Business',
        email: 'testbusiness'})
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
      mocks.encryptionService.decryptToken.mockResolvedValue('long_lived_token')
    })
  }

    it('should sync successfully and return comprehensive data', async () => {
      const config = IntegrationTestHelper.createMockConfig()
    }

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        media: expect.arrayContaining([
          expect.objectContaining({
            id: 'media123',
            caption: 'Check out our latest product! #newlaunch #business',
            media_type: 'IMAGE'}),
        ]),
        stories: expect.arrayContaining([
          expect.objectContaining({
            id: 'story123',
            media_type: 'IMAGE'}),
        ]),
        syncedAt: expect.any(String)})
    })
  })

  describe('User Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('long_lived_token')
    })
  }

    it('should get current user successfully', async () => {
      const _user = await integration.getCurrentUser()
    }

      expect(user).toMatchObject({
        id: 'user123',
        account_type: 'BUSINESS',
        username: 'testbusiness',
        name: 'Test Business',
        followers_count: 5420,
        follows_count: 320,
        media_count: 150})
    })
  })

  describe('Media Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('long_lived_token')
    })
  }

    it('should get media successfully', async () => {
      const media = await integration.getMedia(25)
    }

      expect(media).toHaveLength(2)
      expect(media[0]).toMatchObject({
        id: 'media123',
        caption: 'Check out our latest product! #newlaunch #business',
        media_type: 'IMAGE',
        like_count: 125,
        comments_count: 18})
    })

    it('should get specific media item successfully', async () => {
      const mediaItem = await integration.getMediaItem('media123')
    }

      expect(mediaItem).toMatchObject({
        id: 'media123',
        caption: 'Check out our latest product!',
        media_type: 'IMAGE'})
    })

    it('should publish media successfully', async () => {
      const publishedMedia = await integration.publishMedia(
        'https://example.com/image.jpg',
        'New product launch! #excited',
      )
    }

      expect(publishedMedia).toMatchObject({
        id: 'new_media789',
        media_type: 'IMAGE'})
    })

    it('should publish story successfully', async () => {
      const publishedStory = await integration.publishStory('https://example.com/story.jpg')
    }

      expect(publishedStory).toMatchObject({
        id: 'story123',
        media_type: 'IMAGE'})
    })
  })

  describe('Comments Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('long_lived_token')
    })
  }

    it('should get media comments successfully', async () => {
      const comments = await integration.getMediaComments('media123')
    }

      expect(comments).toHaveLength(2)
      expect(comments[0]).toMatchObject({
        id: 'comment123',
        text: 'Love this product! Where can I buy it?',
        username: 'customer1',
        like_count: 3,
        hidden: false})
    })

    it('should reply to comment successfully', async () => {
      const reply = await integration.replyToComment(
        'comment123',
        'Thanks for your interest! Check our website.',
      )
    }

      expect(reply).toMatchObject({
        id: 'reply123',
        text: 'Thanks for your interest! Check our website.'})
    })

    it('should hide comment successfully', async () => {
      const result = await integration.hideComment('comment456')
    }

      expect(result).toBe(true)
    })
  })

  describe('Stories Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('long_lived_token')
    })
  }

    it('should get stories successfully', async () => {
      const stories = await integration.getStories()
    }

      expect(stories).toHaveLength(1)
      expect(stories[0]).toMatchObject({
        id: 'story123',
        media_type: 'IMAGE',
        ig_id: 'ig_story123'})
    })

    it('should get specific story successfully', async () => {
      const story = await integration.getStory('story123')
    }

      expect(story).toMatchObject({
        id: 'story123',
        media_type: 'IMAGE'})
    })
  })

  describe('Hashtags', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('long_lived_token')
    })
  }

    it('should search hashtag successfully', async () => {
      const hashtag = await integration.searchHashtag('business')
    }

      expect(hashtag).toMatchObject({
        id: 'hashtag123',
        name: 'business',
        media_count: 1500000})
    })

    it('should get hashtag details successfully', async () => {
      const hashtag = await integration.getHashtag('hashtag123')
    }

      expect(hashtag).toMatchObject({
        id: 'hashtag123',
        name: 'business',
        media_count: 1500000})
    })
  })

  describe('Insights & Analytics', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('long_lived_token')
    })
  }

    it('should get account insights successfully', async () => {
      const insights = await integration.getAccountInsights(['impressions', 'reach'], 'day')
    }

      expect(insights).toHaveLength(2)
      expect(insights[0]).toMatchObject({
        name: 'impressions',
        period: 'day',
        title: 'Impressions'})
    })

    it('should get media insights successfully', async () => {
      const insights = await integration.getMediaInsights('media123')
    }

      expect(insights).toHaveLength(2)
      expect(insights[0]).toMatchObject({
        name: 'impressions',
        title: 'Impressions'})
    })

    it('should get audience insights successfully', async () => {
      const insights = await integration.getAudienceInsights(['audience_gender_age'])
    }

      expect(insights).toHaveLength(2)
      expect(insights[0]).toMatchObject({
        name: 'impressions',
        title: 'Impressions'})
    })
  })

  describe('Webhook Handling', () => {
    it('should process media webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          object: 'instagram',
          entry: [
            {
              id: 'ig123',
              changes: [
                {
                  field: 'media',
                  value: {,
                    media_id: 'media123'},
              ]},
          ]}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process comments webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          object: 'instagram',
          entry: [
            {
              id: 'ig123',
              changes: [
                {
                  field: 'comments',
                  value: {,
                    comment_id: 'comment123'},
              ]},
          ]}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('long_lived_token')
    })
  }

    it('should cache data effectively', async () => {
      await integration.getCurrentUser()
      await integration.getMedia(25)
    }

      expect(integration['userCache']).toBeTruthy()
      expect(integration['mediaCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getCurrentUser()
      await integration.getMedia(25)
    }

      integration.clearCache()

      expect(integration['userCache']).toBeNull()
      expect(integration['mediaCache'].size).toBe(0)
      expect(integration['commentsCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'media',
        'stories',
        'comments',
        'insights',
        'hashtags',
        'publishing',
        'audience',
        'engagement',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('instagram-business')
      expect(integration.name).toBe('Instagram Business')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
