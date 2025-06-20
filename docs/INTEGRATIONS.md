# Aurelius AI - Integrations Documentation

## Table of Contents
1. [Overview](#overview)
2. [Integration Architecture](#integration-architecture)
3. [OAuth 2.0 Implementation](#oauth-20-implementation)
4. [Google Workspace Integration](#google-workspace-integration)
5. [Microsoft 365 Integration](#microsoft-365-integration)
6. [Slack Integration](#slack-integration)
7. [Email Providers](#email-providers)
8. [Calendar Systems](#calendar-systems)
9. [Task Management Tools](#task-management-tools)
10. [AI Services](#ai-services)
11. [Payment Processing](#payment-processing)
12. [Webhook Management](#webhook-management)
13. [Security & Compliance](#security--compliance)
14. [Testing Integrations](#testing-integrations)

## Overview

Aurelius AI provides seamless integration with various third-party services to create a unified workspace for users. The integration system is designed to be secure, scalable, and maintainable with a focus on user privacy and data protection.

### Key Principles

- **Security First**: All tokens encrypted at rest, minimal scope requests
- **User Control**: Users can connect/disconnect integrations at any time
- **Data Privacy**: No unnecessary data storage, comply with provider policies
- **Reliability**: Automatic retry mechanisms, graceful degradation
- **Extensibility**: Easy to add new integrations following established patterns

## Integration Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Action                          │
│                   (Connect Integration)                     │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   OAuth Flow Initiation                     │
│              • Generate state parameter                     │
│              • Store temporary session                      │
│              • Redirect to provider                         │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Provider Authorization                   │
│              • User grants permissions                      │
│              • Provider redirects back                      │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Token Exchange                          │
│              • Verify state parameter                       │
│              • Exchange code for tokens                     │
│              • Encrypt and store tokens                     │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Initial Data Sync                        │
│              • Fetch user profile                           │
│              • Queue background sync                        │
│              • Update UI status                             │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```prisma
model Integration {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  
  provider          String   // google-gmail, microsoft-outlook, slack, etc.
  providerAccountId String?  // External account ID
  
  // Encrypted tokens
  accessToken       String   @db.Text
  refreshToken      String?  @db.Text
  tokenExpiry       DateTime?
  tokenType         String?
  
  // Status tracking
  status            String   @default("active") // active, expired, error, disabled
  lastSyncAt        DateTime?
  nextSyncAt        DateTime?
  syncError         String?
  errorCount        Int      @default(0)
  
  // Permissions & Settings
  scopes            String[]
  permissions       Json     @default("{}")
  settings          Json     @default("{}")
  
  // Metadata
  accountEmail      String?
  accountName       String?
  webhookUrl        String?
  webhookSecret     String?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([userId, provider])
  @@index([provider, status])
}
```

## OAuth 2.0 Implementation

### Base OAuth Strategy

```typescript
// modules/integrations/base/oauth.strategy.ts
export abstract class BaseOAuthStrategy {
  constructor(
    protected readonly config: ConfigService,
    protected readonly integrationService: IntegrationsService,
    protected readonly encryption: EncryptionService,
  ) {}

  abstract getAuthorizationUrl(state: string): string;
  abstract exchangeCodeForTokens(code: string): Promise<TokenResponse>;
  abstract refreshAccessToken(refreshToken: string): Promise<TokenResponse>;
  
  async handleCallback(userId: string, code: string, state: string) {
    // Verify state to prevent CSRF
    const isValidState = await this.verifyState(state);
    if (!isValidState) {
      throw new UnauthorizedException('Invalid state parameter');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code);
    
    // Encrypt tokens before storage
    const encryptedTokens = {
      accessToken: await this.encryption.encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken 
        ? await this.encryption.encrypt(tokens.refreshToken)
        : null,
      tokenExpiry: tokens.expiresIn 
        ? new Date(Date.now() + tokens.expiresIn * 1000)
        : null,
    };

    // Store integration
    await this.integrationService.upsert({
      userId,
      provider: this.getProviderName(),
      ...encryptedTokens,
      scopes: tokens.scope?.split(' ') || [],
      status: 'active',
    });

    // Queue initial sync
    await this.queueInitialSync(userId);
  }

  protected async makeAuthenticatedRequest(
    integration: Integration,
    url: string,
    options: RequestOptions = {},
  ) {
    // Decrypt token
    const accessToken = await this.encryption.decrypt(integration.accessToken);
    
    // Check token expiry
    if (integration.tokenExpiry && integration.tokenExpiry < new Date()) {
      await this.refreshToken(integration);
      return this.makeAuthenticatedRequest(integration, url, options);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        await this.refreshToken(integration);
        return this.makeAuthenticatedRequest(integration, url, options);
      }

      return response;
    } catch (error) {
      await this.handleRequestError(integration, error);
      throw error;
    }
  }

  private async refreshToken(integration: Integration) {
    if (!integration.refreshToken) {
      throw new Error('No refresh token available');
    }

    const decryptedRefresh = await this.encryption.decrypt(integration.refreshToken);
    const newTokens = await this.refreshAccessToken(decryptedRefresh);
    
    await this.integrationService.updateTokens(integration.id, {
      accessToken: await this.encryption.encrypt(newTokens.accessToken),
      tokenExpiry: new Date(Date.now() + newTokens.expiresIn * 1000),
    });
  }

  abstract getProviderName(): string;
  abstract queueInitialSync(userId: string): Promise<void>;
}
```

## Google Workspace Integration

### Google OAuth Configuration

```typescript
// modules/integrations/google/google-oauth.strategy.ts
@Injectable()
export class GoogleOAuthStrategy extends BaseOAuthStrategy {
  private readonly oauth2Client: OAuth2Client;
  
  constructor(
    config: ConfigService,
    integrationService: IntegrationsService,
    encryption: EncryptionService,
  ) {
    super(config, integrationService, encryption);
    
    this.oauth2Client = new google.auth.OAuth2(
      config.get('GOOGLE_CLIENT_ID'),
      config.get('GOOGLE_CLIENT_SECRET'),
      config.get('GOOGLE_REDIRECT_URI'),
    );
  }

  getAuthorizationUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/tasks',
      ],
      state,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expiry_date 
        ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
        : 3600,
      scope: tokens.scope,
    };
  }
}
```

### Gmail Integration

```typescript
// modules/integrations/google/gmail.service.ts
@Injectable()
export class GmailService {
  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly encryption: EncryptionService,
    private readonly prisma: PrismaService,
    @InjectQueue('email-sync') private emailQueue: Queue,
  ) {}

  async syncEmails(userId: string) {
    const integration = await this.integrationService.getIntegration(
      userId,
      'google-gmail'
    );
    
    if (!integration) {
      throw new Error('Gmail integration not found');
    }

    const gmail = await this.getGmailClient(integration);
    
    // Fetch messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      q: 'is:unread',
    });

    const messages = response.data.messages || [];
    
    // Queue processing for each message
    const jobs = messages.map(message => ({
      name: 'process-email',
      data: {
        userId,
        messageId: message.id,
        integrationId: integration.id,
      },
    }));

    await this.emailQueue.addBulk(jobs);
  }

  async sendEmail(userId: string, email: ComposeEmailDto) {
    const integration = await this.integrationService.getIntegration(
      userId,
      'google-gmail'
    );

    const gmail = await this.getGmailClient(integration);
    
    // Create message
    const message = this.createMimeMessage(email);
    const encodedMessage = Buffer.from(message).toString('base64url');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    // Store sent email
    await this.prisma.email.create({
      data: {
        userId,
        messageId: result.data.id,
        from: email.from,
        to: email.to,
        subject: email.subject,
        body: email.body,
        status: 'sent',
        sentAt: new Date(),
        externalProvider: 'google-gmail',
        externalId: result.data.id,
      },
    });

    return result.data;
  }

  private async getGmailClient(integration: Integration) {
    const accessToken = await this.encryption.decrypt(integration.accessToken);
    
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  private createMimeMessage(email: ComposeEmailDto): string {
    const boundary = '----=_Part_0_1234567890';
    
    let message = [
      `From: ${email.from}`,
      `To: ${email.to.join(', ')}`,
      email.cc?.length ? `Cc: ${email.cc.join(', ')}` : '',
      `Subject: ${email.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      email.body,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      email.bodyHtml || email.body,
      '',
      `--${boundary}--`,
    ].filter(Boolean).join('\r\n');

    return message;
  }
}
```

### Google Calendar Integration

```typescript
// modules/integrations/google/calendar.service.ts
@Injectable()
export class GoogleCalendarService {
  async syncCalendarEvents(userId: string) {
    const integration = await this.integrationService.getIntegration(
      userId,
      'google-calendar'
    );

    const calendar = await this.getCalendarClient(integration);
    
    // Fetch events for next 30 days
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    const events = response.data.items || [];
    
    // Upsert events
    for (const event of events) {
      await this.upsertCalendarEvent(userId, event);
    }

    // Update sync timestamp
    await this.integrationService.updateSyncStatus(integration.id, {
      lastSyncAt: new Date(),
      nextSyncAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });
  }

  async createEvent(userId: string, eventData: CreateEventDto) {
    const integration = await this.integrationService.getIntegration(
      userId,
      'google-calendar'
    );

    const calendar = await this.getCalendarClient(integration);
    
    const event = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timezone || 'UTC',
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timezone || 'UTC',
      },
      attendees: eventData.attendees?.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    });

    // Store in database
    await this.prisma.calendarEvent.create({
      data: {
        userId,
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        startTime: new Date(eventData.startTime),
        endTime: new Date(eventData.endTime),
        timezone: eventData.timezone || 'UTC',
        externalId: result.data.id,
        externalProvider: 'google-calendar',
        status: result.data.status || 'confirmed',
      },
    });

    return result.data;
  }

  private async upsertCalendarEvent(userId: string, googleEvent: any) {
    const eventData = {
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      location: googleEvent.location,
      startTime: new Date(
        googleEvent.start.dateTime || googleEvent.start.date
      ),
      endTime: new Date(
        googleEvent.end.dateTime || googleEvent.end.date
      ),
      allDay: !googleEvent.start.dateTime,
      status: googleEvent.status || 'confirmed',
      organizer: googleEvent.organizer?.email,
      attendees: googleEvent.attendees?.map((a: any) => ({
        email: a.email,
        name: a.displayName,
        status: a.responseStatus,
      })) || [],
      conferenceData: googleEvent.conferenceData,
    };

    await this.prisma.calendarEvent.upsert({
      where: {
        externalId_externalProvider: {
          externalId: googleEvent.id,
          externalProvider: 'google-calendar',
        },
      },
      create: {
        userId,
        externalId: googleEvent.id,
        externalProvider: 'google-calendar',
        ...eventData,
      },
      update: eventData,
    });
  }
}
```

## Microsoft 365 Integration

### Microsoft OAuth Configuration

```typescript
// modules/integrations/microsoft/microsoft-oauth.strategy.ts
@Injectable()
export class MicrosoftOAuthStrategy extends BaseOAuthStrategy {
  private readonly msalConfig: Configuration;
  private readonly pca: PublicClientApplication;
  
  constructor(
    config: ConfigService,
    integrationService: IntegrationsService,
    encryption: EncryptionService,
  ) {
    super(config, integrationService, encryption);
    
    this.msalConfig = {
      auth: {
        clientId: config.get('MICROSOFT_CLIENT_ID'),
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: config.get('MICROSOFT_REDIRECT_URI'),
      },
    };
    
    this.pca = new PublicClientApplication(this.msalConfig);
  }

  getAuthorizationUrl(state: string): string {
    const authCodeUrlParameters = {
      scopes: [
        'User.Read',
        'Mail.Read',
        'Mail.Send',
        'Calendars.ReadWrite',
        'Tasks.ReadWrite',
        'Files.ReadWrite',
        'offline_access',
      ],
      redirectUri: this.config.get('MICROSOFT_REDIRECT_URI'),
      state,
      prompt: 'consent',
    };

    return this.pca.getAuthCodeUrl(authCodeUrlParameters);
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const tokenRequest = {
      code,
      scopes: [
        'User.Read',
        'Mail.Read',
        'Mail.Send',
        'offline_access',
      ],
      redirectUri: this.config.get('MICROSOFT_REDIRECT_URI'),
      clientSecret: this.config.get('MICROSOFT_CLIENT_SECRET'),
    };

    const response = await this.pca.acquireTokenByCode(tokenRequest);
    
    return {
      accessToken: response.accessToken,
      refreshToken: response.account?.idTokenClaims?.refreshToken,
      expiresIn: Math.floor(
        (response.expiresOn.getTime() - Date.now()) / 1000
      ),
      scope: response.scopes.join(' '),
    };
  }
}
```

### Outlook Integration

```typescript
// modules/integrations/microsoft/outlook.service.ts
@Injectable()
export class OutlookService {
  private readonly graphClient: Client;
  
  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly encryption: EncryptionService,
  ) {
    this.graphClient = Client.init({
      authProvider: async (done) => {
        // This will be overridden per request
        done(null, '');
      },
    });
  }

  async syncEmails(userId: string) {
    const integration = await this.integrationService.getIntegration(
      userId,
      'microsoft-outlook'
    );

    const client = await this.getAuthenticatedClient(integration);
    
    // Fetch recent emails
    const messages = await client
      .api('/me/messages')
      .top(50)
      .select('id,subject,from,toRecipients,body,receivedDateTime')
      .filter('isRead eq false')
      .orderby('receivedDateTime DESC')
      .get();

    // Process emails
    for (const message of messages.value) {
      await this.processEmail(userId, message);
    }
  }

  async sendEmail(userId: string, email: ComposeEmailDto) {
    const integration = await this.integrationService.getIntegration(
      userId,
      'microsoft-outlook'
    );

    const client = await this.getAuthenticatedClient(integration);
    
    const message = {
      subject: email.subject,
      body: {
        contentType: 'HTML',
        content: email.bodyHtml || email.body,
      },
      toRecipients: email.to.map(email => ({
        emailAddress: { address: email },
      })),
      ccRecipients: email.cc?.map(email => ({
        emailAddress: { address: email },
      })),
    };

    const result = await client
      .api('/me/sendMail')
      .post({ message, saveToSentItems: true });

    return result;
  }

  private async getAuthenticatedClient(integration: Integration) {
    const accessToken = await this.encryption.decrypt(integration.accessToken);
    
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  private async processEmail(userId: string, outlookMessage: any) {
    await this.prisma.email.upsert({
      where: {
        externalId_externalProvider: {
          externalId: outlookMessage.id,
          externalProvider: 'microsoft-outlook',
        },
      },
      create: {
        userId,
        messageId: outlookMessage.internetMessageId,
        from: outlookMessage.from.emailAddress.address,
        to: outlookMessage.toRecipients.map((r: any) => r.emailAddress.address),
        subject: outlookMessage.subject,
        body: outlookMessage.body.content,
        bodyHtml: outlookMessage.body.contentType === 'HTML' 
          ? outlookMessage.body.content 
          : null,
        receivedAt: new Date(outlookMessage.receivedDateTime),
        isRead: false,
        status: 'received',
        externalId: outlookMessage.id,
        externalProvider: 'microsoft-outlook',
      },
      update: {
        isRead: outlookMessage.isRead,
      },
    });
  }
}
```

## Slack Integration

### Slack OAuth Implementation

```typescript
// modules/integrations/slack/slack-oauth.strategy.ts
@Injectable()
export class SlackOAuthStrategy extends BaseOAuthStrategy {
  private readonly slackClient: WebClient;
  
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.get('SLACK_CLIENT_ID'),
      scope: [
        'channels:read',
        'channels:write',
        'chat:write',
        'files:read',
        'files:write',
        'users:read',
        'users:read.email',
      ].join(','),
      redirect_uri: this.config.get('SLACK_REDIRECT_URI'),
      state,
    });

    return `https://slack.com/oauth/v2/authorize?${params}`;
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const slackClient = new WebClient();
    
    const result = await slackClient.oauth.v2.access({
      client_id: this.config.get('SLACK_CLIENT_ID'),
      client_secret: this.config.get('SLACK_CLIENT_SECRET'),
      code,
      redirect_uri: this.config.get('SLACK_REDIRECT_URI'),
    });

    if (!result.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return {
      accessToken: result.access_token as string,
      refreshToken: undefined, // Slack doesn't use refresh tokens
      expiresIn: undefined,
      scope: result.scope as string,
      teamId: result.team?.id,
      teamName: result.team?.name,
    };
  }
}
```

### Slack Service

```typescript
// modules/integrations/slack/slack.service.ts
@Injectable()
export class SlackService {
  async postMessage(
    userId: string,
    channel: string,
    message: string,
    options?: MessageOptions,
  ) {
    const integration = await this.integrationService.getIntegration(
      userId,
      'slack'
    );

    const client = await this.getSlackClient(integration);
    
    const result = await client.chat.postMessage({
      channel,
      text: message,
      ...options,
    });

    // Log the action
    await this.prisma.actionLog.create({
      data: {
        userId,
        type: 'slack_message',
        category: 'integration',
        metadata: {
          channel,
          ts: result.ts,
          messageLength: message.length,
        },
        status: result.ok ? 'success' : 'failed',
      },
    });

    return result;
  }

  async createTask(userId: string, task: CreateTaskDto) {
    const integration = await this.integrationService.getIntegration(
      userId,
      'slack'
    );

    const client = await this.getSlackClient(integration);
    
    // Post to designated tasks channel
    const taskMessage = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*New Task:* ${task.title}`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Priority:* ${task.priority || 'Medium'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Due:* ${task.dueDate || 'No due date'}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: task.description || 'No description provided',
          },
        },
      ],
    };

    await client.chat.postMessage({
      channel: integration.settings.tasksChannel || '#tasks',
      blocks: taskMessage.blocks,
      text: `New task: ${task.title}`,
    });
  }

  private async getSlackClient(integration: Integration) {
    const accessToken = await this.encryption.decrypt(integration.accessToken);
    return new WebClient(accessToken);
  }
}
```

## AI Services

### Anthropic Claude Integration

```typescript
// modules/integrations/ai/anthropic.service.ts
@Injectable()
export class AnthropicService {
  private anthropic: Anthropic;
  
  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
    private readonly usageService: UsageService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get('ANTHROPIC_API_KEY'),
    });
  }

  async complete(params: ClaudeRequest): Promise<AiResponse> {
    const cacheKey = this.generateCacheKey(params);
    
    // Check cache
    const cached = await this.cache.get<AiResponse>(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    try {
      const response = await this.anthropic.messages.create({
        model: params.model,
        max_tokens: params.maxTokens || 1024,
        temperature: params.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: params.prompt,
          },
        ],
        system: params.systemPrompt,
      });

      const result: AiResponse = {
        text: response.content[0].text,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        model: params.model,
        cost: this.calculateCost(response.usage, params.model),
        fromCache: false,
      };

      // Cache response
      await this.cache.set(cacheKey, result, {
        ttl: this.getCacheTTL(params.model),
        tags: ['ai', params.model],
      });

      return result;
    } catch (error) {
      if (error.status === 429) {
        throw new TooManyRequestsException('Rate limit exceeded');
      }
      throw error;
    }
  }

  private calculateCost(usage: any, model: string): number {
    const pricing = {
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
      'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    };

    const modelPricing = pricing[model];
    if (!modelPricing) return 0;

    return (
      (usage.input_tokens / 1_000_000) * modelPricing.input +
      (usage.output_tokens / 1_000_000) * modelPricing.output
    );
  }

  private getCacheTTL(model: string): number {
    // Longer cache for expensive models
    const ttlMap = {
      'claude-3-haiku-20240307': 3600, // 1 hour
      'claude-3-5-sonnet-20241022': 7200, // 2 hours
      'claude-3-opus-20240229': 14400, // 4 hours
    };
    return ttlMap[model] || 3600;
  }
}
```

### OpenAI Integration

```typescript
// modules/integrations/ai/openai.service.ts
@Injectable()
export class OpenAIService {
  private openai: OpenAI;
  
  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY'),
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }

  async complete(params: OpenAIRequest): Promise<AiResponse> {
    const response = await this.openai.chat.completions.create({
      model: params.model || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: params.systemPrompt || 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: params.prompt,
        },
      ],
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 1024,
    });

    const completion = response.choices[0];
    
    return {
      text: completion.message.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      model: response.model,
      cost: this.calculateCost(response.usage, response.model),
      fromCache: false,
    };
  }
}
```

## Payment Processing

### Stripe Integration

```typescript
// modules/integrations/stripe/stripe.service.ts
@Injectable()
export class StripeService {
  private stripe: Stripe;
  
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create or get customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
      
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId,
        },
      },
    });

    return session;
  }

  async handleWebhook(signature: string, payload: Buffer) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.get('STRIPE_WEBHOOK_SECRET'),
      );
    } catch (err) {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const userId = subscription.metadata.userId;
    if (!userId) return;

    const priceId = subscription.items.data[0].price.id;
    const tier = this.getTierFromPriceId(priceId);
    
    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        tier,
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        monthlyActionLimit: this.getActionLimit(tier),
        integrationLimit: this.getIntegrationLimit(tier),
        monthlyPrice: subscription.items.data[0].price.unit_amount! / 100,
        overageRate: this.getOverageRate(tier),
      },
      update: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }
}
```

## Webhook Management

### Webhook Service

```typescript
// modules/integrations/webhooks/webhook.service.ts
@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @InjectQueue('webhooks') private webhookQueue: Queue,
  ) {}

  async registerWebhook(
    integrationId: string,
    url: string,
    events: string[],
  ): Promise<WebhookRegistration> {
    const secret = this.generateWebhookSecret();
    const encryptedSecret = await this.encryption.encrypt(secret);
    
    await this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        webhookUrl: url,
        webhookSecret: encryptedSecret,
        settings: {
          webhookEvents: events,
        },
      },
    });

    return {
      url,
      secret,
      events,
    };
  }

  async handleIncomingWebhook(
    provider: string,
    headers: any,
    body: any,
  ): Promise<void> {
    // Verify webhook authenticity
    const isValid = await this.verifyWebhook(provider, headers, body);
    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Queue for processing
    await this.webhookQueue.add('process-webhook', {
      provider,
      headers,
      body,
      receivedAt: new Date(),
    }, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  private async verifyWebhook(
    provider: string,
    headers: any,
    body: any,
  ): Promise<boolean> {
    switch (provider) {
      case 'github':
        return this.verifyGitHubWebhook(headers, body);
      case 'stripe':
        return this.verifyStripeWebhook(headers, body);
      case 'slack':
        return this.verifySlackWebhook(headers, body);
      default:
        return false;
    }
  }

  private verifyGitHubWebhook(headers: any, body: any): boolean {
    const signature = headers['x-hub-signature-256'];
    if (!signature) return false;

    const secret = this.config.get('GITHUB_WEBHOOK_SECRET');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(body));
    const digest = `sha256=${hmac.digest('hex')}`;

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest),
    );
  }

  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

## Security & Compliance

### Encryption Service

```typescript
// modules/integrations/security/encryption.service.ts
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  
  constructor(private readonly config: ConfigService) {
    const masterKey = this.config.get('ENCRYPTION_KEY');
    this.key = crypto.scryptSync(masterKey, 'salt', 32);
  }

  async encrypt(text: string): Promise<string> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      authTag: authTag.toString('hex'),
      iv: iv.toString('hex'),
    });
  }

  async decrypt(encryptedData: string): Promise<string> {
    const { encrypted, authTag, iv } = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex'),
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### Data Privacy Compliance

```typescript
// modules/integrations/privacy/data-privacy.service.ts
@Injectable()
export class DataPrivacyService {
  async exportUserIntegrationData(userId: string): Promise<any> {
    const integrations = await this.prisma.integration.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            syncedItems: true,
          },
        },
      },
    });

    // Decrypt sensitive data for export
    const decryptedIntegrations = await Promise.all(
      integrations.map(async (integration) => ({
        provider: integration.provider,
        accountEmail: integration.accountEmail,
        connectedAt: integration.createdAt,
        lastSyncAt: integration.lastSyncAt,
        status: integration.status,
        scopes: integration.scopes,
        syncedItemsCount: integration._count.syncedItems,
      })),
    );

    return {
      integrations: decryptedIntegrations,
      exportedAt: new Date(),
    };
  }

  async deleteUserIntegrationData(
    userId: string,
    provider?: string,
  ): Promise<void> {
    const where = provider
      ? { userId, provider }
      : { userId };

    // Delete all related data
    await this.prisma.$transaction([
      // Delete synced items
      this.prisma.email.deleteMany({
        where: { userId, externalProvider: provider },
      }),
      this.prisma.calendarEvent.deleteMany({
        where: { userId, externalProvider: provider },
      }),
      this.prisma.task.deleteMany({
        where: { userId, externalProvider: provider },
      }),
      
      // Delete integration
      this.prisma.integration.deleteMany({ where }),
    ]);

    // Revoke tokens with provider
    if (provider) {
      await this.revokeProviderAccess(userId, provider);
    }
  }

  private async revokeProviderAccess(userId: string, provider: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { userId_provider: { userId, provider } },
    });

    if (!integration) return;

    switch (provider) {
      case 'google-gmail':
      case 'google-calendar':
        await this.revokeGoogleAccess(integration);
        break;
      case 'microsoft-outlook':
        await this.revokeMicrosoftAccess(integration);
        break;
    }
  }
}
```

## Testing Integrations

### Integration Testing

```typescript
// modules/integrations/__tests__/google-oauth.spec.ts
describe('GoogleOAuthStrategy', () => {
  let strategy: GoogleOAuthStrategy;
  let mockIntegrationService: jest.Mocked<IntegrationsService>;
  let mockEncryption: jest.Mocked<EncryptionService>;

  beforeEach(() => {
    mockIntegrationService = createMock<IntegrationsService>();
    mockEncryption = createMock<EncryptionService>();
    
    strategy = new GoogleOAuthStrategy(
      configService,
      mockIntegrationService,
      mockEncryption,
    );
  });

  describe('handleCallback', () => {
    it('should exchange code for tokens and store integration', async () => {
      const userId = 'user123';
      const code = 'auth_code';
      const state = 'valid_state';

      mockEncryption.encrypt.mockResolvedValueOnce('encrypted_access_token');
      mockEncryption.encrypt.mockResolvedValueOnce('encrypted_refresh_token');

      await strategy.handleCallback(userId, code, state);

      expect(mockIntegrationService.upsert).toHaveBeenCalledWith({
        userId,
        provider: 'google',
        accessToken: 'encrypted_access_token',
        refreshToken: 'encrypted_refresh_token',
        scopes: expect.any(Array),
        status: 'active',
      });
    });
  });
});
```

### Mock Provider Testing

```typescript
// modules/integrations/__tests__/mock-provider.ts
export class MockOAuthProvider {
  private users = new Map<string, any>();
  private tokens = new Map<string, any>();

  async simulateAuthorizationFlow(userId: string) {
    const code = this.generateAuthCode();
    const state = this.generateState();
    
    this.users.set(code, {
      userId,
      email: `test-${userId}@example.com`,
      name: `Test User ${userId}`,
    });

    return { code, state };
  }

  async exchangeCode(code: string) {
    const user = this.users.get(code);
    if (!user) {
      throw new Error('Invalid authorization code');
    }

    const accessToken = this.generateToken();
    const refreshToken = this.generateToken();
    
    this.tokens.set(accessToken, {
      user,
      expiresAt: Date.now() + 3600 * 1000,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      scope: 'read write',
    };
  }

  private generateAuthCode(): string {
    return `code_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateState(): string {
    return `state_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateToken(): string {
    return `token_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Best Practices

### Integration Guidelines

1. **Minimal Scope Requests**: Only request permissions absolutely necessary
2. **Token Rotation**: Implement automatic token refresh before expiry
3. **Error Recovery**: Graceful handling of API failures with retries
4. **Rate Limiting**: Respect provider rate limits with backoff strategies
5. **Data Minimization**: Only store necessary data from external services

### Security Checklist

- [ ] All tokens encrypted at rest using AES-256-GCM
- [ ] OAuth state parameter validated to prevent CSRF
- [ ] Webhook signatures verified for authenticity
- [ ] API keys stored in secure environment variables
- [ ] Regular security audits of integration permissions
- [ ] Automatic token revocation on integration disconnect
- [ ] Audit logging for all integration actions
- [ ] Data retention policies enforced

### Performance Optimization

1. **Batch Operations**: Group API calls when possible
2. **Caching**: Cache frequently accessed data with appropriate TTLs
3. **Queue Processing**: Use background jobs for non-urgent syncs
4. **Pagination**: Handle large datasets with cursor-based pagination
5. **Selective Sync**: Allow users to choose what data to sync