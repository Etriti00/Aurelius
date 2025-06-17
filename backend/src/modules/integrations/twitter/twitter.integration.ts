import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig
} from '../base/integration.interface'
import {
  ApiResponse,
  WebhookEvent,
  GenericWebhookPayload
} from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'
import * as crypto from 'crypto'

interface TwitterWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface TwitterTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  token_type: string
  scope: string
}

interface TwitterUser {
  id: string,
  name: string
  username: string
  description?: string
  profile_image_url?: string
  verified: boolean,
  public_metrics: {
    followers_count: number,
    following_count: number
    tweet_count: number,
    listed_count: number
  }
  created_at: string
  location?: string
  url?: string
  pinned_tweet_id?: string
  protected: boolean
  entities?: {
    url?: {
      urls: Array<{,
        start: number
        end: number,
        url: string
        expanded_url: string,
        display_url: string
      }>
    }
    description?: {
      urls: Array<{,
        start: number
        end: number,
        url: string
        expanded_url: string,
        display_url: string
      }>
      hashtags: Array<{,
        start: number
        end: number,
        tag: string
      }>
      mentions: Array<{,
        start: number
        end: number,
        username: string
      }>
    }
  }
}

interface TwitterTweet {
  id: string,
  text: string
  author_id: string,
  created_at: string
  conversation_id: string
  in_reply_to_user_id?: string
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to',
    id: string
  }>
  attachments?: {
    media_keys?: string[]
    poll_ids?: string[]
  }
  context_annotations?: Array<{
    domain: {,
      id: string
      name: string
      description?: string
    }
    entity: {,
      id: string
      name: string
      description?: string
    }
  }>
  entities?: {
    mentions?: Array<{
      start: number,
      end: number
      username: string,
      id: string
    }>
    hashtags?: Array<{
      start: number,
      end: number
      tag: string
    }>
    urls?: Array<{
      start: number,
      end: number
      url: string
      expanded_url?: string
      display_url?: string
      title?: string
      description?: string
    }>
    cashtags?: Array<{
      start: number,
      end: number
      tag: string
    }>
  }
  geo?: {
    coordinates?: {
      type: string,
      coordinates: [number, number]
    }
    place_id?: string
  }
  lang?: string
  public_metrics: {,
    retweet_count: number
    like_count: number,
    reply_count: number
    quote_count: number
    bookmark_count?: number
    impression_count?: number
  }
  reply_settings: 'everyone' | 'mentionedUsers' | 'following'
  source?: string
}

interface TwitterMedia {
  media_key: string,
  type: 'photo' | 'video' | 'animated_gif'
  duration_ms?: number
  height?: number
  preview_image_url?: string
  public_metrics?: {
    view_count?: number
  }
  url?: string
  width?: number
  alt_text?: string
}

interface TwitterList {
  id: string,
  name: string
  description?: string
  follower_count?: number
  member_count?: number
  private: boolean
  owner_id?: string
  created_at?: string
}

interface TwitterSpace {
  id: string,
  state: 'live' | 'scheduled' | 'ended'
  created_at: string
  ended_at?: string
  host_ids: string[]
  lang?: string
  is_ticketed: boolean
  invited_user_ids?: string[]
  speaker_ids?: string[]
  started_at?: string
  subscriber_count?: number
  topic_ids?: string[]
  title: string
  updated_at?: string
  scheduled_start?: string
  participant_count?: number
}

interface TwitterDirectMessage {
  id: string,
  text: string
  created_at: string,
  sender_id: string
  dm_conversation_id: string
  referenced_tweet?: {
    id: string,
    author_id: string
  }
  media_keys?: string[]
  attachments?: {
    media_keys: string[]
  }
}

interface TwitterPoll {
  id: string,
  options: Array<{
    position: number,
    label: string
    votes: number
  }>
  duration_minutes: number,
  end_datetime: string
  voting_status: 'open' | 'closed'
}

interface TwitterBookmark {
  bookmarked: boolean
  bookmark_count?: number
}

export class TwitterIntegration extends BaseIntegration {
  readonly provider = 'twitter'
  readonly name = 'Twitter / X'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://api.twitter.com'
  private readonly authBaseUrl = 'https://api.twitter.com'

  private userCache: Map<string, TwitterUser> = new Map()
  private tweetsCache: Map<string, TwitterTweet> = new Map()
  private listsCache: Map<string, TwitterList> = new Map()
  private spacesCache: Map<string, TwitterSpace> = new Map()
  private directMessagesCache: Map<string, TwitterDirectMessage> = new Map()
  private mediaCache: Map<string, TwitterMedia> = new Map()

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/2/users/me', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: [
          'tweet.read',
          'tweet.write',
          'users.read',
          'follows.read',
          'follows.write',
          'offline.access',
          'space.read',
          'mute.read',
          'mute.write',
          'like.read',
          'like.write',
          'list.read',
          'list.write',
          'bookmark.read',
          'bookmark.write',
        ],
        data: response.data
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }
    }
  }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }

      const response = await fetch(`${this.authBaseUrl}/2/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({,
          grant_type: 'refresh_token'
          refresh_token: this.refreshTokenValue,
          client_id: this.config.clientId
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: TwitterTokenResponse = await response.json()

      this.accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        this.refreshTokenValue = tokenData.refresh_token
      }

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope?.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }
    }
  }

  async getCapabilities(): Promise<IntegrationCapability[]> {
    return [
      IntegrationCapability.SOCIAL_MEDIA,
      IntegrationCapability.CONTENT_PUBLISHING,
      IntegrationCapability.MESSAGING,
      IntegrationCapability.ANALYTICS,
      IntegrationCapability.SEARCH,
      IntegrationCapability.REAL_TIME,
      IntegrationCapability.WEBHOOKS,
      IntegrationCapability.MEDIA_MANAGEMENT,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/2/users/me', 'GET')
      })

      const user = response.data

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          userId: user.id
          username: user.username,
          name: user.name
          followersCount: user.public_metrics?.followers_count,
          followingCount: user.public_metrics?.following_count
          tweetCount: user.public_metrics?.tweet_count,
          verified: user.verified
        }
      }
    } catch (error) {
      this.logError('testConnection', error as Error)
      return {
        status: 'error',
        lastChecked: new Date()
        error: (error as Error).message
      }
    }
  }

  async sync(): Promise<SyncResult> {
    try {
      const startTime = new Date()
      let totalProcessed = 0
      let totalErrors = 0
      const errors: string[] = []

      // Sync user profile
      try {
        const userResult = await this.syncUser()
        totalProcessed += userResult.processed
        totalErrors += userResult.errors
        if (userResult.errorMessages) {
          errors.push(...userResult.errorMessages)
        }
      } catch (error) {
        errors.push(`User sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync tweets
      try {
        const tweetResult = await this.syncTweets()
        totalProcessed += tweetResult.processed
        totalErrors += tweetResult.errors
        if (tweetResult.errorMessages) {
          errors.push(...tweetResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Tweet sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync lists
      try {
        const listResult = await this.syncLists()
        totalProcessed += listResult.processed
        totalErrors += listResult.errors
        if (listResult.errorMessages) {
          errors.push(...listResult.errorMessages)
        }
      } catch (error) {
        errors.push(`List sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync direct messages
      try {
        const dmResult = await this.syncDirectMessages()
        totalProcessed += dmResult.processed
        totalErrors += dmResult.errors
        if (dmResult.errorMessages) {
          errors.push(...dmResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Direct message sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      return {
        success: totalErrors === 0,
        timestamp: new Date()
        duration: Date.now() - startTime.getTime(),
        itemsProcessed: totalProcessed
        itemsAdded: totalProcessed - totalErrors,
        itemsUpdated: 0
        itemsDeleted: 0,
        errors: totalErrors
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      this.logError('sync', error as Error)
      throw new SyncError(`Twitter sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const twitterPayload = payload as TwitterWebhookPayload

      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload.body || '', payload.headers || {})) {
        throw new Error('Invalid webhook signature')
      }

      switch (twitterPayload.type) {
        case 'tweet.create':
        case 'tweet.update':
        case 'tweet.delete':
          await this.handleTweetWebhook(twitterPayload)
          break
        case 'user.follow':
        case 'user.unfollow':
          await this.handleFollowWebhook(twitterPayload)
          break
        case 'direct_message.create':
          await this.handleDirectMessageWebhook(twitterPayload)
          break
        case 'list.create':
        case 'list.update':
        case 'list.delete':
          await this.handleListWebhook(twitterPayload)
          break
        case 'space.create':
        case 'space.update':
        case 'space.end':
          await this.handleSpaceWebhook(twitterPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${twitterPayload.type}`)
      }

      return {
        success: true,
        data: { processed: true },
        message: 'Webhook processed successfully'
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      // Twitter doesn't have a specific disconnect endpoint
      // Clear local caches
      this.clearCache()
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncUser(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.user', async () => {
        return this.makeApiCall('/2/users/me', 'GET', undefined, {
          'user.fields':
            'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified'
        })
      })

      const user = response.data

      try {
        await this.processUser(user)
        return { processed: 1, errors: 0 }
      } catch (error) {
        return {
          processed: 0,
          errors: 1
          errorMessages: [`Failed to process user: ${(error as Error).message}`]
        }
      }
    } catch (error) {
      throw new SyncError(`User sync failed: ${(error as Error).message}`)
    }
  }

  private async syncTweets(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const userResponse = await this.executeWithProtection('sync.get_user', async () => {
        return this.makeApiCall('/2/users/me', 'GET')
      })

      const userId = userResponse.data.id

      const response = await this.executeWithProtection('sync.tweets', async () => {
        return this.makeApiCall(`/2/users/${userId}/tweets`, 'GET', undefined, {
          max_results: '100'
          'tweet.fields':
            'attachments,author_id,context_annotations,conversation_id,created_at,entities,geo,id,in_reply_to_user_id,lang,public_metrics,referenced_tweets,reply_settings,source,text',
          expansions: 'author_id,referenced_tweets.id,in_reply_to_user_id,attachments.media_keys'
        })
      })

      let processed = 0
      const errors: string[] = []

      const tweets = response.data || []

      for (const tweet of tweets) {
        try {
          await this.processTweet(tweet)
          processed++
        } catch (error) {
          errors.push(`Failed to process tweet ${tweet.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Tweet sync failed: ${(error as Error).message}`)
    }
  }

  private async syncLists(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const userResponse = await this.executeWithProtection('sync.get_user', async () => {
        return this.makeApiCall('/2/users/me', 'GET')
      })

      const userId = userResponse.data.id

      const response = await this.executeWithProtection('sync.lists', async () => {
        return this.makeApiCall(`/2/users/${userId}/owned_lists`, 'GET', undefined, {
          'list.fields':
            'id,name,description,follower_count,member_count,private,owner_id,created_at'
        })
      })

      let processed = 0
      const errors: string[] = []

      const lists = response.data || []

      for (const list of lists) {
        try {
          await this.processList(list)
          processed++
        } catch (error) {
          errors.push(`Failed to process list ${list.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`List sync failed: ${(error as Error).message}`)
    }
  }

  private async syncDirectMessages(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.direct_messages', async () => {
        return this.makeApiCall('/2/dm_events', 'GET', undefined, {
          max_results: '100'
          'dm_event.fields':
            'id,text,created_at,sender_id,dm_conversation_id,referenced_tweet,media_keys,attachments',
          expansions: 'sender_id,referenced_tweet.id,attachments.media_keys'
        })
      })

      let processed = 0
      const errors: string[] = []

      const messages = response.data || []

      for (const message of messages) {
        try {
          await this.processDirectMessage(message)
          processed++
        } catch (error) {
          errors.push(`Failed to process message ${message.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Direct message sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processUser(user: any): Promise<void> {
    this.logger.debug(`Processing Twitter user: @${user.username}`)
    this.userCache.set(user.id, user)
    // Process user data for Aurelius AI system
  }

  private async processTweet(tweet: any): Promise<void> {
    this.logger.debug(`Processing Twitter tweet: ${tweet.id}`)
    this.tweetsCache.set(tweet.id, tweet)
    // Process tweet data for Aurelius AI system
  }

  private async processList(list: any): Promise<void> {
    this.logger.debug(`Processing Twitter list: ${list.name}`)
    this.listsCache.set(list.id, list)
    // Process list data for Aurelius AI system
  }

  private async processDirectMessage(message: any): Promise<void> {
    this.logger.debug(`Processing Twitter direct message: ${message.id}`)
    this.directMessagesCache.set(message.id, message)
    // Process direct message data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleTweetWebhook(payload: TwitterWebhookPayload): Promise<void> {
    this.logger.debug(`Handling tweet webhook: ${payload.id}`)
    // Clear tweet cache to force refresh
    this.tweetsCache.clear()
    // Handle tweet webhook processing
  }

  private async handleFollowWebhook(payload: TwitterWebhookPayload): Promise<void> {
    this.logger.debug(`Handling follow webhook: ${payload.id}`)
    // Clear user cache to force refresh
    this.userCache.clear()
    // Handle follow webhook processing
  }

  private async handleDirectMessageWebhook(payload: TwitterWebhookPayload): Promise<void> {
    this.logger.debug(`Handling direct message webhook: ${payload.id}`)
    // Clear DM cache to force refresh
    this.directMessagesCache.clear()
    // Handle direct message webhook processing
  }

  private async handleListWebhook(payload: TwitterWebhookPayload): Promise<void> {
    this.logger.debug(`Handling list webhook: ${payload.id}`)
    // Clear list cache to force refresh
    this.listsCache.clear()
    // Handle list webhook processing
  }

  private async handleSpaceWebhook(payload: TwitterWebhookPayload): Promise<void> {
    this.logger.debug(`Handling space webhook: ${payload.id}`)
    // Clear space cache to force refresh
    this.spacesCache.clear()
    // Handle space webhook processing
  }

  // Helper method for webhook signature verification
  private verifyWebhookSignature(body: string, headers: Record<string, string>): boolean {
    try {
      const signature =
        headers['x-twitter-webhooks-signature'] || headers['X-Twitter-Webhooks-Signature']
      if (!signature || !this.config?.webhookSecret) {
        return false
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(body)
        .digest('base64')

      return signature === `sha256=${expectedSignature}`
    } catch (error) {
      this.logError('verifyWebhookSignature' error as Error)
      return false
    }
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
    body?: unknown,
    params?: Record<string, unknown>,
  ): Promise<any> {
    const url = new URL(`${this.apiBaseUrl}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString())
        }
      })
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Twitter API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getCurrentUser(): Promise<TwitterUser> {
    try {
      const response = await this.executeWithProtection('api.get_current_user', async () => {
        return this.makeApiCall('/2/users/me', 'GET', undefined, {
          'user.fields':
            'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified'
        })
      })

      const user = response.data
      this.userCache.set(user.id, user)
      return user
    } catch (error) {
      this.logError('getCurrentUser', error as Error)
      throw new Error(`Failed to get current user: ${(error as Error).message}`)
    }
  }

  async getUserById(userId: string): Promise<TwitterUser> {
    try {
      if (this.userCache.has(userId)) {
        return this.userCache.get(userId)!
      }

      const response = await this.executeWithProtection('api.get_user_by_id', async () => {
        return this.makeApiCall(`/2/users/${userId}`, 'GET', undefined, {
          'user.fields':
            'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified'
        })
      })

      const user = response.data
      this.userCache.set(user.id, user)
      return user
    } catch (error) {
      this.logError('getUserById', error as Error)
      throw new Error(`Failed to get user: ${(error as Error).message}`)
    }
  }

  async getUserByUsername(username: string): Promise<TwitterUser> {
    try {
      const response = await this.executeWithProtection('api.get_user_by_username', async () => {
        return this.makeApiCall(`/2/users/by/username/${username}`, 'GET', undefined, {
          'user.fields':
            'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified'
        })
      })

      const user = response.data
      this.userCache.set(user.id, user)
      return user
    } catch (error) {
      this.logError('getUserByUsername', error as Error)
      throw new Error(`Failed to get user by username: ${(error as Error).message}`)
    }
  }

  async getFollowers(userId?: string, maxResults: number = 100): Promise<TwitterUser[]> {
    try {
      const targetUserId = userId || (await this.getCurrentUser()).id

      const response = await this.executeWithProtection('api.get_followers', async () => {
        return this.makeApiCall(`/2/users/${targetUserId}/followers`, 'GET', undefined, {
          max_results: maxResults.toString()
          'user.fields':
            'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified'
        })
      })

      const followers = response.data || []
      followers.forEach((user: TwitterUser) => this.userCache.set(user.id, user))
      return followers
    } catch (error) {
      this.logError('getFollowers', error as Error)
      throw new Error(`Failed to get followers: ${(error as Error).message}`)
    }
  }

  async getFollowing(userId?: string, maxResults: number = 100): Promise<TwitterUser[]> {
    try {
      const targetUserId = userId || (await this.getCurrentUser()).id

      const response = await this.executeWithProtection('api.get_following', async () => {
        return this.makeApiCall(`/2/users/${targetUserId}/following`, 'GET', undefined, {
          max_results: maxResults.toString()
          'user.fields':
            'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified'
        })
      })

      const following = response.data || []
      following.forEach((user: TwitterUser) => this.userCache.set(user.id, user))
      return following
    } catch (error) {
      this.logError('getFollowing', error as Error)
      throw new Error(`Failed to get following: ${(error as Error).message}`)
    }
  }

  async followUser(userId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser()

      const response = await this.executeWithProtection('api.follow_user', async () => {
        return this.makeApiCall(`/2/users/${currentUser.id}/following`, 'POST', {
          target_user_id: userId
        })
      })

      return response.data.following
    } catch (error) {
      this.logError('followUser', error as Error)
      throw new Error(`Failed to follow user: ${(error as Error).message}`)
    }
  }

  async unfollowUser(userId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser()

      const response = await this.executeWithProtection('api.unfollow_user', async () => {
        return this.makeApiCall(`/2/users/${currentUser.id}/following/${userId}`, 'DELETE')
      })

      return response.data.following === false
    } catch (error) {
      this.logError('unfollowUser', error as Error)
      throw new Error(`Failed to unfollow user: ${(error as Error).message}`)
    }
  }

  async getTweet(tweetId: string): Promise<TwitterTweet> {
    try {
      if (this.tweetsCache.has(tweetId)) {
        return this.tweetsCache.get(tweetId)!
      }

      const response = await this.executeWithProtection('api.get_tweet', async () => {
        return this.makeApiCall(`/2/tweets/${tweetId}`, 'GET', undefined, {
          'tweet.fields':
            'attachments,author_id,context_annotations,conversation_id,created_at,entities,geo,id,in_reply_to_user_id,lang,public_metrics,referenced_tweets,reply_settings,source,text',
          expansions: 'author_id,referenced_tweets.id,in_reply_to_user_id,attachments.media_keys'
        })
      })

      const tweet = response.data
      this.tweetsCache.set(tweet.id, tweet)
      return tweet
    } catch (error) {
      this.logError('getTweet', error as Error)
      throw new Error(`Failed to get tweet: ${(error as Error).message}`)
    }
  }

  async getUserTweets(userId?: string, maxResults: number = 100): Promise<TwitterTweet[]> {
    try {
      const targetUserId = userId || (await this.getCurrentUser()).id

      const response = await this.executeWithProtection('api.get_user_tweets', async () => {
        return this.makeApiCall(`/2/users/${targetUserId}/tweets`, 'GET', undefined, {
          max_results: maxResults.toString()
          'tweet.fields':
            'attachments,author_id,context_annotations,conversation_id,created_at,entities,geo,id,in_reply_to_user_id,lang,public_metrics,referenced_tweets,reply_settings,source,text',
          expansions: 'author_id,referenced_tweets.id,in_reply_to_user_id,attachments.media_keys',
          exclude: 'retweets,replies'
        })
      })

      const tweets = response.data || []
      tweets.forEach((tweet: TwitterTweet) => this.tweetsCache.set(tweet.id, tweet))
      return tweets
    } catch (error) {
      this.logError('getUserTweets', error as Error)
      throw new Error(`Failed to get user tweets: ${(error as Error).message}`)
    }
  }

  async createTweet(
    text: string
    options?: {
      replyTo?: string
      mediaIds?: string[]
      poll?: {
        options: string[],
        duration_minutes: number
      }
      geo?: {
        place_id: string
      }
    },
  ): Promise<TwitterTweet> {
    try {
      const tweetData: unknown = { text }

      if (options?.replyTo) {
        tweetData.reply = { in_reply_to_tweet_id: options.replyTo }
      }

      if (options?.mediaIds && options.mediaIds.length > 0) {
        tweetData.media = { media_ids: options.mediaIds }
      }

      if (options?.poll) {
        tweetData.poll = {
          options: options.poll.options,
          duration_minutes: options.poll.duration_minutes
        }
      }

      if (options?.geo) {
        tweetData.geo = options.geo
      }

      const response = await this.executeWithProtection('api.create_tweet', async () => {
        return this.makeApiCall('/2/tweets', 'POST', tweetData)
      })

      const tweet = response.data
      this.tweetsCache.set(tweet.id, tweet)
      return tweet
    } catch (error) {
      this.logError('createTweet', error as Error)
      throw new Error(`Failed to create tweet: ${(error as Error).message}`)
    }
  }

  async deleteTweet(tweetId: string): Promise<boolean> {
    try {
      const response = await this.executeWithProtection('api.delete_tweet', async () => {
        return this.makeApiCall(`/2/tweets/${tweetId}`, 'DELETE')
      })

      if (response.data.deleted) {
        this.tweetsCache.delete(tweetId)
      }

      return response.data.deleted
    } catch (error) {
      this.logError('deleteTweet', error as Error)
      throw new Error(`Failed to delete tweet: ${(error as Error).message}`)
    }
  }

  async likeTweet(tweetId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser()

      const response = await this.executeWithProtection('api.like_tweet', async () => {
        return this.makeApiCall(`/2/users/${currentUser.id}/likes`, 'POST', {
          tweet_id: tweetId
        })
      })

      return response.data.liked
    } catch (error) {
      this.logError('likeTweet', error as Error)
      throw new Error(`Failed to like tweet: ${(error as Error).message}`)
    }
  }

  async unlikeTweet(tweetId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser()

      const response = await this.executeWithProtection('api.unlike_tweet', async () => {
        return this.makeApiCall(`/2/users/${currentUser.id}/likes/${tweetId}`, 'DELETE')
      })

      return response.data.liked === false
    } catch (error) {
      this.logError('unlikeTweet', error as Error)
      throw new Error(`Failed to unlike tweet: ${(error as Error).message}`)
    }
  }

  async retweetTweet(tweetId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser()

      const response = await this.executeWithProtection('api.retweet_tweet', async () => {
        return this.makeApiCall(`/2/users/${currentUser.id}/retweets`, 'POST', {
          tweet_id: tweetId
        })
      })

      return response.data.retweeted
    } catch (error) {
      this.logError('retweetTweet', error as Error)
      throw new Error(`Failed to retweet: ${(error as Error).message}`)
    }
  }

  async unretweetTweet(tweetId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser()

      const response = await this.executeWithProtection('api.unretweet_tweet', async () => {
        return this.makeApiCall(`/2/users/${currentUser.id}/retweets/${tweetId}`, 'DELETE')
      })

      return response.data.retweeted === false
    } catch (error) {
      this.logError('unretweetTweet', error as Error)
      throw new Error(`Failed to unretweet: ${(error as Error).message}`)
    }
  }

  async bookmarkTweet(tweetId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser()

      const response = await this.executeWithProtection('api.bookmark_tweet', async () => {
        return this.makeApiCall(`/2/users/${currentUser.id}/bookmarks`, 'POST', {
          tweet_id: tweetId
        })
      })

      return response.data.bookmarked
    } catch (error) {
      this.logError('bookmarkTweet', error as Error)
      throw new Error(`Failed to bookmark tweet: ${(error as Error).message}`)
    }
  }

  async unbookmarkTweet(tweetId: string): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser()

      const response = await this.executeWithProtection('api.unbookmark_tweet', async () => {
        return this.makeApiCall(`/2/users/${currentUser.id}/bookmarks/${tweetId}`, 'DELETE')
      })

      return response.data.bookmarked === false
    } catch (error) {
      this.logError('unbookmarkTweet', error as Error)
      throw new Error(`Failed to unbookmark tweet: ${(error as Error).message}`)
    }
  }

  async searchTweets(
    query: string,
    maxResults: number = 100
    options?: {
      sortOrder?: 'recency' | 'relevancy'
      startTime?: string
      endTime?: string
    },
  ): Promise<TwitterTweet[]> {
    try {
      const params: unknown = {
        query,
        max_results: maxResults.toString()
        'tweet.fields':
          'attachments,author_id,context_annotations,conversation_id,created_at,entities,geo,id,in_reply_to_user_id,lang,public_metrics,referenced_tweets,reply_settings,source,text',
        expansions: 'author_id,referenced_tweets.id,in_reply_to_user_id,attachments.media_keys'
      }

      if (options?.sortOrder) {
        params.sort_order = options.sortOrder
      }

      if (options?.startTime) {
        params.start_time = options.startTime
      }

      if (options?.endTime) {
        params.end_time = options.endTime
      }

      const response = await this.executeWithProtection('api.search_tweets', async () => {
        return this.makeApiCall('/2/tweets/search/recent', 'GET', undefined, params)
      })

      const tweets = response.data || []
      tweets.forEach((tweet: TwitterTweet) => this.tweetsCache.set(tweet.id, tweet))
      return tweets
    } catch (error) {
      this.logError('searchTweets', error as Error)
      throw new Error(`Failed to search tweets: ${(error as Error).message}`)
    }
  }

  async searchUsers(query: string, maxResults: number = 100): Promise<TwitterUser[]> {
    try {
      const response = await this.executeWithProtection('api.search_users', async () => {
        return this.makeApiCall('/2/users/search', 'GET', undefined, {
          query,
          max_results: maxResults.toString()
          'user.fields':
            'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified'
        })
      })

      const users = response.data || []
      users.forEach((user: TwitterUser) => this.userCache.set(user.id, user))
      return users
    } catch (error) {
      this.logError('searchUsers', error as Error)
      throw new Error(`Failed to search users: ${(error as Error).message}`)
    }
  }

  async getLists(userId?: string): Promise<TwitterList[]> {
    try {
      const targetUserId = userId || (await this.getCurrentUser()).id

      const response = await this.executeWithProtection('api.get_lists', async () => {
        return this.makeApiCall(`/2/users/${targetUserId}/owned_lists`, 'GET', undefined, {
          'list.fields':
            'id,name,description,follower_count,member_count,private,owner_id,created_at'
        })
      })

      const lists = response.data || []
      lists.forEach((list: TwitterList) => this.listsCache.set(list.id, list))
      return lists
    } catch (error) {
      this.logError('getLists', error as Error)
      throw new Error(`Failed to get lists: ${(error as Error).message}`)
    }
  }

  async createList(
    name: string
    description?: string,
    isPrivate: boolean = false
  ): Promise<TwitterList> {
    try {
      const response = await this.executeWithProtection('api.create_list', async () => {
        return this.makeApiCall('/2/lists', 'POST', {
          name,
          description,
          private: isPrivate
        })
      })

      const list = response.data
      this.listsCache.set(list.id, list)
      return list
    } catch (error) {
      this.logError('createList', error as Error)
      throw new Error(`Failed to create list: ${(error as Error).message}`)
    }
  }

  async deleteList(listId: string): Promise<boolean> {
    try {
      const response = await this.executeWithProtection('api.delete_list', async () => {
        return this.makeApiCall(`/2/lists/${listId}`, 'DELETE')
      })

      if (response.data.deleted) {
        this.listsCache.delete(listId)
      }

      return response.data.deleted
    } catch (error) {
      this.logError('deleteList', error as Error)
      throw new Error(`Failed to delete list: ${(error as Error).message}`)
    }
  }

  async addListMember(listId: string, userId: string): Promise<boolean> {
    try {
      const response = await this.executeWithProtection('api.add_list_member', async () => {
        return this.makeApiCall(`/2/lists/${listId}/members`, 'POST', {
          user_id: userId
        })
      })

      return response.data.is_member
    } catch (error) {
      this.logError('addListMember', error as Error)
      throw new Error(`Failed to add list member: ${(error as Error).message}`)
    }
  }

  async removeListMember(listId: string, userId: string): Promise<boolean> {
    try {
      const response = await this.executeWithProtection('api.remove_list_member', async () => {
        return this.makeApiCall(`/2/lists/${listId}/members/${userId}`, 'DELETE')
      })

      return response.data.is_member === false
    } catch (error) {
      this.logError('removeListMember', error as Error)
      throw new Error(`Failed to remove list member: ${(error as Error).message}`)
    }
  }

  async getSpaces(userIds?: string[]): Promise<TwitterSpace[]> {
    try {
      const params: unknown = {
        'space.fields':
          'created_at,ended_at,host_ids,id,is_ticketed,lang,participant_count,speaker_ids,started_at,state,subscriber_count,title,topic_ids,updated_at'
      }

      if (userIds && userIds.length > 0) {
        params.user_ids = userIds.join(',')
      }

      const response = await this.executeWithProtection('api.get_spaces', async () => {
        return this.makeApiCall('/2/spaces/search', 'GET', undefined, params)
      })

      const spaces = response.data || []
      spaces.forEach((space: TwitterSpace) => this.spacesCache.set(space.id, space))
      return spaces
    } catch (error) {
      this.logError('getSpaces', error as Error)
      throw new Error(`Failed to get spaces: ${(error as Error).message}`)
    }
  }

  // Cleanup method
  clearCache(): void {
    this.userCache.clear()
    this.tweetsCache.clear()
    this.listsCache.clear()
    this.spacesCache.clear()
    this.directMessagesCache.clear()
    this.mediaCache.clear()
  }
}
