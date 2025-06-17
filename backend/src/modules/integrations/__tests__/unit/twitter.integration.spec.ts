import { User } from '@prisma/client';
import { TwitterIntegration } from '../../twitter/twitter.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('TwitterIntegration', () => {
  let integration: TwitterIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(TwitterIntegration, 'twitter')
    integration = setup.integration
    mocks = setup.mocks
}
  }

    // Setup default fetch mocks for Twitter API
    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://api.twitter.com/2/oauth2/token': IntegrationTestHelper.createMockApiResponse({,
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 7200,
        token_type: 'bearer',
        scope: 'tweet.read tweet.write users.read follows.read follows.write'}),
      'GET https://api.twitter.com/2/users/me': IntegrationTestHelper.createMockApiResponse({,
        data: {
          id: '1234567890',
          name: 'John Doe',
          username: 'johndoe',
          description: 'Software developer and tech enthusiast',
          profile_image_url: 'https://pbs.twimg.com/profile_images/1234567890/avatar.jpg',
          verified: false,
          public_metrics: {,
            followers_count: 1500,
            following_count: 800,
            tweet_count: 2500,
            listed_count: 25},
          created_at: '2020-01-01T12:00:00.000Z',
          location: 'San Francisco, CA',
          url: 'https://johndoe.dev',
          protected: false}),
      'GET https://api.twitter.com/2/users/1234567890': IntegrationTestHelper.createMockApiResponse(
        {
          data: {,
            id: '1234567890',
            name: 'John Doe',
            username: 'johndoe',
            description: 'Software developer and tech enthusiast',
            profile_image_url: 'https://pbs.twimg.com/profile_images/1234567890/avatar.jpg',
            verified: false,
            public_metrics: {,
              followers_count: 1500,
              following_count: 800,
              tweet_count: 2500,
              listed_count: 25},
            created_at: '2020-01-01T12:00:00.000Z',
            location: 'San Francisco, CA',
            protected: false},
      ),
      'GET https://api.twitter.com/2/users/by/username/johndoe':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: '1234567890',
            name: 'John Doe',
            username: 'johndoe',
            description: 'Software developer and tech enthusiast',
            profile_image_url: 'https://pbs.twimg.com/profile_images/1234567890/avatar.jpg',
            verified: false,
            public_metrics: {,
              followers_count: 1500,
              following_count: 800,
              tweet_count: 2500,
              listed_count: 25},
            created_at: '2020-01-01T12:00:00.000Z',
            protected: false}),
      'GET https://api.twitter.com/2/users/1234567890/followers':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: '0987654321',
              name: 'Jane Smith',
              username: 'janesmith',
              verified: true,
              public_metrics: {,
                followers_count: 5000,
                following_count: 1200,
                tweet_count: 1800,
                listed_count: 40},
          ],
          meta: {,
            result_count: 1,
            next_token: 'next_page_token'}),
      'GET https://api.twitter.com/2/users/1234567890/following':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: '1111222233',
              name: 'Tech News',
              username: 'technews',
              verified: true,
              public_metrics: {,
                followers_count: 100000,
                following_count: 500,
                tweet_count: 15000,
                listed_count: 200},
          ],
          meta: {,
            result_count: 1}),
      'POST https://api.twitter.com/2/users/1234567890/following':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            following: true,
            pending_follow: false}),
      'DELETE https://api.twitter.com/2/users/1234567890/following/0987654321':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            following: false}),
      'GET https://api.twitter.com/2/tweets/1111111111111111111':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: '1111111111111111111',
            text: 'Hello Twitter! This is my first tweet.',
            author_id: '1234567890',
            created_at: '2024-01-01T12:00:00.000Z',
            conversation_id: '1111111111111111111',
            public_metrics: {,
              retweet_count: 5,
              like_count: 25,
              reply_count: 3,
              quote_count: 1,
              bookmark_count: 8,
              impression_count: 500},
            reply_settings: 'everyone',
            lang: 'en'}),
      'GET https://api.twitter.com/2/users/1234567890/tweets':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: '1111111111111111111',
              text: 'Hello Twitter! This is my first tweet.',
              author_id: '1234567890',
              created_at: '2024-01-01T12:00:00.000Z',
              conversation_id: '1111111111111111111',
              public_metrics: {,
                retweet_count: 5,
                like_count: 25,
                reply_count: 3,
                quote_count: 1},
              reply_settings: 'everyone'},
            {
              id: '2222222222222222222',
              text: 'Working on some exciting new features!',
              author_id: '1234567890',
              created_at: '2024-01-02T10:30:00.000Z',
              conversation_id: '2222222222222222222',
              public_metrics: {,
                retweet_count: 12,
                like_count: 45,
                reply_count: 8,
                quote_count: 3},
              reply_settings: 'everyone'},
          ],
          meta: {,
            result_count: 2,
            newest_id: '2222222222222222222',
            oldest_id: '1111111111111111111'}),
      'GET https://api.twitter.com/2/users/1234567890/timelines/reverse_chronological':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: '3333333333333333333',
              text: 'Great article about software architecture patterns!',
              author_id: '1111222233',
              created_at: '2024-01-03T08:15:00.000Z',
              conversation_id: '3333333333333333333',
              public_metrics: {,
                retweet_count: 100,
                like_count: 350,
                reply_count: 25,
                quote_count: 15},
              reply_settings: 'everyone'},
          ],
          meta: {,
            result_count: 1}),
      'POST https://api.twitter.com/2/tweets': IntegrationTestHelper.createMockApiResponse({,
        data: {
          id: '4444444444444444444',
          text: 'Just posted a new tweet via API!'}),
      'DELETE https://api.twitter.com/2/tweets/1111111111111111111':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            deleted: true}),
      'POST https://api.twitter.com/2/users/1234567890/likes':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            liked: true}),
      'DELETE https://api.twitter.com/2/users/1234567890/likes/1111111111111111111':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            liked: false}),
      'POST https://api.twitter.com/2/users/1234567890/retweets':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            retweeted: true}),
      'DELETE https://api.twitter.com/2/users/1234567890/retweets/1111111111111111111':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            retweeted: false}),
      'GET https://api.twitter.com/2/tweets/search/recent':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: '5555555555555555555',
              text: 'Search result tweet about JavaScript frameworks',
              author_id: '0987654321',
              created_at: '2024-01-04T14:20:00.000Z',
              public_metrics: {,
                retweet_count: 8,
                like_count: 32,
                reply_count: 5,
                quote_count: 2},
              entities: {,
                hashtags: [
                  {
                    start: 20,
                    end: 31,
                    tag: 'JavaScript'},
                ]},
          ],
          meta: {,
            result_count: 1}),
      'GET https://api.twitter.com/2/users/search': IntegrationTestHelper.createMockApiResponse({,
        data: [
          {
            id: '6666666666666666666',
            name: 'JavaScript Developer',
            username: 'jsdev',
            description: 'Full-stack JavaScript developer',
            verified: false,
            public_metrics: {,
              followers_count: 2500,
              following_count: 900,
              tweet_count: 1200,
              listed_count: 15},
        ],
        meta: {,
          result_count: 1}),
      'GET https://api.twitter.com/2/users/1234567890/owned_lists':
        IntegrationTestHelper.createMockApiResponse({
          data: [
            {
              id: 'list123456789',
              name: 'Tech Influencers',
              description: 'List of technology thought leaders',
              follower_count: 150,
              member_count: 50,
              private: false,
              owner_id: '1234567890',
              created_at: '2023-06-01T10:00:00.000Z'},
          ],
          meta: {,
            result_count: 1}),
      'POST https://api.twitter.com/2/lists': IntegrationTestHelper.createMockApiResponse({,
        data: {
          id: 'newlist789',
          name: 'New List'}),
      'DELETE https://api.twitter.com/2/lists/list123456789':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            deleted: true}),
      'POST https://api.twitter.com/2/lists/list123456789/members':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            is_member: true}),
      'DELETE https://api.twitter.com/2/lists/list123456789/members/0987654321':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            is_member: false}),
      'GET https://api.twitter.com/2/dm_events': IntegrationTestHelper.createMockApiResponse({,
        data: [
          {
            id: 'dm123456789',
            text: 'Hello! Thanks for following.',
            created_at: '2024-01-05T16:30:00.000Z',
            sender_id: '0987654321',
            dm_conversation_id: 'conv-1234567890-0987654321'},
        ],
        meta: {,
          result_count: 1}),
      'POST https://api.twitter.com/2/dm_conversations/with/:participant_id/messages':
        IntegrationTestHelper.createMockApiResponse({
          data: {,
            id: 'dm987654321',
            text: 'Thanks for the message!'}),
      'GET https://api.twitter.com/2/spaces/search': IntegrationTestHelper.createMockApiResponse({,
        data: [
          {
            id: 'space123456789',
            state: 'live',
            created_at: '2024-01-05T18:00:00.000Z',
            host_ids: ['1234567890'],
            is_ticketed: false,
            title: 'Tech Talk: Future of AI',
            participant_count: 150,
            subscriber_count: 300},
        ],
        meta: {,
          result_count: 1})})
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
        redirectUri: 'http://localhost:3000/callback',
        codeVerifier: 'challenge'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresIn: 7200,
        userId: '1234567890',
        userInfo: {,
          id: '1234567890',
          name: 'John Doe',
          email: 'johndoe'})
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
        id: '1234567890',
        name: 'John Doe',
        email: 'johndoe'})
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
        tweets: expect.arrayContaining([
          expect.objectContaining({
            id: '1111111111111111111',
            text: 'Hello Twitter! This is my first tweet.'}),
        ]),
        user: expect.objectContaining({,
          id: '1234567890',
          name: 'John Doe',
          username: 'johndoe'}),
        lists: expect.arrayContaining([
          expect.objectContaining({
            id: 'list123456789',
            name: 'Tech Influencers'}),
        ]),
        syncedAt: expect.any(String)})
    })

    it('should handle partial sync failures gracefully', async () => {
      fetchMock.mockImplementationOnce(url => {
        if (url.includes('/users/1234567890/tweets')) {
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

  describe('User Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get current user successfully', async () => {
      const _user = await integration.getCurrentUser()
    }

      expect(user).toMatchObject({
        id: '1234567890',
        name: 'John Doe',
        username: 'johndoe',
        verified: false,
        public_metrics: {,
          followers_count: 1500,
          following_count: 800,
          tweet_count: 2500,
          listed_count: 25})
      }
    })

    it('should get user by ID successfully', async () => {
      const _user = await integration.getUserById('1234567890')
    }

      expect(user).toMatchObject({
        id: '1234567890',
        name: 'John Doe',
        username: 'johndoe'})
    })

    it('should get user by username successfully', async () => {
      const _user = await integration.getUserByUsername('johndoe')
    }

      expect(user).toMatchObject({
        id: '1234567890',
        name: 'John Doe',
        username: 'johndoe'})
    })

    it('should get followers successfully', async () => {
      const followers = await integration.getFollowers()
    }

      expect(followers).toHaveLength(1)
      expect(followers[0]).toMatchObject({
        id: '0987654321',
        name: 'Jane Smith',
        username: 'janesmith',
        verified: true})
    })

    it('should get following successfully', async () => {
      const following = await integration.getFollowing()
    }

      expect(following).toHaveLength(1)
      expect(following[0]).toMatchObject({
        id: '1111222233',
        name: 'Tech News',
        username: 'technews',
        verified: true})
    })

    it('should follow user successfully', async () => {
      const result = await integration.followUser('0987654321')
    }

      expect(result).toBe(true)
    })

    it('should unfollow user successfully', async () => {
      const result = await integration.unfollowUser('0987654321')
    }

      expect(result).toBe(true)
    })
  })

  describe('Tweet Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get tweet by ID successfully', async () => {
      const tweet = await integration.getTweet('1111111111111111111')
    }

      expect(tweet).toMatchObject({
        id: '1111111111111111111',
        text: 'Hello Twitter! This is my first tweet.',
        author_id: '1234567890'})
    })

    it('should get user tweets successfully', async () => {
      const tweets = await integration.getUserTweets()
    }

      expect(tweets).toHaveLength(2)
      expect(tweets[0]).toMatchObject({
        id: '1111111111111111111',
        text: 'Hello Twitter! This is my first tweet.'})
      expect(tweets[1]).toMatchObject({
        id: '2222222222222222222',
        text: 'Working on some exciting new features!'})
    })

    it('should get home timeline successfully', async () => {
      const timeline = await integration.getHomeTimeline()
    }

      expect(timeline).toHaveLength(1)
      expect(timeline[0]).toMatchObject({
        id: '3333333333333333333',
        text: 'Great article about software architecture patterns!'})
    })

    it('should create tweet successfully', async () => {
      const tweet = await integration.createTweet('Just posted a new tweet via API!')
    }

      expect(tweet).toMatchObject({
        id: '4444444444444444444',
        text: 'Just posted a new tweet via API!'})
    })

    it('should create tweet with reply successfully', async () => {
      const tweet = await integration.createTweet('This is a reply!', {
        replyTo: '1111111111111111111'})
    }

      expect(tweet).toMatchObject({
        id: '4444444444444444444',
        text: 'Just posted a new tweet via API!'})
    })

    it('should delete tweet successfully', async () => {
      const result = await integration.deleteTweet('1111111111111111111')
    }

      expect(result).toBe(true)
    })

    it('should like tweet successfully', async () => {
      const result = await integration.likeTweet('1111111111111111111')
    }

      expect(result).toBe(true)
    })

    it('should unlike tweet successfully', async () => {
      const result = await integration.unlikeTweet('1111111111111111111')
    }

      expect(result).toBe(true)
    })

    it('should retweet successfully', async () => {
      const result = await integration.retweetTweet('1111111111111111111')
    }

      expect(result).toBe(true)
    })

    it('should unretweet successfully', async () => {
      const result = await integration.unretweetTweet('1111111111111111111')
    }

      expect(result).toBe(true)
    })
  })

  describe('Search Functionality', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should search tweets successfully', async () => {
      const tweets = await integration.searchTweets('JavaScript frameworks')
    }

      expect(tweets).toHaveLength(1)
      expect(tweets[0]).toMatchObject({
        id: '5555555555555555555',
        text: 'Search result tweet about JavaScript frameworks',
        entities: {,
          hashtags: [
            {
              start: 20,
              end: 31,
              tag: 'JavaScript'},
          ]})
      }
    })

    it('should search tweets with _options successfully', async () => {
      const tweets = await integration.searchTweets('JavaScript', 50, {
        sortOrder: 'recency',
        startTime: '2024-01-01T00Z',
        endTime: '2024-01-31T23:59:59Z'})
    }

      expect(tweets).toHaveLength(1)
    })

    it('should search users successfully', async () => {
      const users = await integration.searchUsers('JavaScript developer')
    }

      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        id: '6666666666666666666',
        name: 'JavaScript Developer',
        username: 'jsdev'})
    })
  })

  describe('Lists Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get lists successfully', async () => {
      const lists = await integration.getLists()
    }

      expect(lists).toHaveLength(1)
      expect(lists[0]).toMatchObject({
        id: 'list123456789',
        name: 'Tech Influencers',
        description: 'List of technology thought leaders',
        private: false})
    })

    it('should create list successfully', async () => {
      const list = await integration.createList('New List', 'A new test list', false)
    }

      expect(list).toMatchObject({
        id: 'newlist789',
        name: 'New List'})
    })

    it('should delete list successfully', async () => {
      const result = await integration.deleteList('list123456789')
    }

      expect(result).toBe(true)
    })

    it('should add list member successfully', async () => {
      const result = await integration.addListMember('list123456789', '0987654321')
    }

      expect(result).toBe(true)
    })

    it('should remove list member successfully', async () => {
      const result = await integration.removeListMember('list123456789', '0987654321')
    }

      expect(result).toBe(true)
    })
  })

  describe('Direct Messages', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get direct messages successfully', async () => {
      const messages = await integration.getDirectMessages()
    }

      expect(messages).toHaveLength(1)
      expect(messages[0]).toMatchObject({
        id: 'dm123456789',
        text: 'Hello! Thanks for following.',
        sender_id: '0987654321'})
    })

    it('should send direct message successfully', async () => {
      const message = await integration.sendDirectMessage('0987654321', 'Thanks for the message!')
    }

      expect(message).toMatchObject({
        id: 'dm987654321',
        text: 'Thanks for the message!'})
    })
  })

  describe('Spaces', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should get spaces successfully', async () => {
      const spaces = await integration.getSpaces()
    }

      expect(spaces).toHaveLength(1)
      expect(spaces[0]).toMatchObject({
        id: 'space123456789',
        state: 'live',
        title: 'Tech Talk: Future of AI',
        host_ids: ['1234567890']})
    })
  })

  describe('Webhook Handling', () => {
    it('should process valid webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'x-twitter-webhooks-signature': 'valid-signature'},
        body: JSON.stringify({,
          tweet_create_events: [
            {
              id: '7777777777777777777',
              text: 'New tweet from webhook',
              user: {,
                id: '1234567890',
                screen_name: 'johndoe'},
          ]}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should reject invalid webhook signatures', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {},
        body: JSON.stringify({,
          tweet_create_events: []}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).rejects.toThrow(
        'Invalid webhook signature',
      )
    })

    it('should handle direct message webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'x-twitter-webhooks-signature': 'valid-signature'},
        body: JSON.stringify({,
          direct_message_events: [
            {
              id: 'dm999888777',
              text: 'New DM from webhook',
              sender_id: '0987654321'},
          ]}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should handle follow _event webhooks', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'x-twitter-webhooks-signature': 'valid-signature'},
        body: JSON.stringify({,
          follow_events: [
            {
              type: 'follow',
              source: { id: '0987654321' },
              target: { id: '1234567890' },
          ]}),
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
            'x-rate-limit-reset': '1640995200'}),
        ),
      )
  }
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')

      await expect(integration.getCurrentUser()).rejects.toThrow('API request failed')
    })

    it('should handle network errors gracefully', async () => {
      fetchMock.mockImplementationOnce(() => Promise.reject(new Error('Network error')))
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')

      await expect(integration.getCurrentUser()).rejects.toThrow('Network error')
    })

    it('should handle invalid tokens', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(401, 'Unauthorized')),
      )
    }

      mocks.encryptionService.decryptToken.mockResolvedValue('invalid_token')

      await expect(integration.getCurrentUser()).rejects.toThrow('API request failed')
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('valid_access_token')
    })
  }

    it('should cache user information', async () => {
      await integration.getCurrentUser()
    }

      // Second call should use cache
      fetchMock.mockClear()
      await integration.getUserById('1234567890')

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should cache tweets', async () => {
      await integration.getUserTweets()
    }

      // Verify cache is populated
      expect(integration['tweetsCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getCurrentUser()
      await integration.getUserTweets()
    }

      integration.clearCache()

      expect(integration['userCache'].size).toBe(0)
      expect(integration['tweetsCache'].size).toBe(0)
      expect(integration['listsCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'social',
        'content',
        'messaging',
        'analytics',
        'webhooks',
        'search',
        'realtime',
        'media',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('twitter')
      expect(integration.name).toBe('Twitter')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
