# AURELIUS BACKEND DEVELOPMENT GUIDE

## 🚨 CRITICAL: READ THIS FIRST 🚨

This guide defines the **ABSOLUTE REQUIREMENTS** for building the Aurelius backend from scratch. Every rule must be followed exactly. No exceptions. No shortcuts. No compromises.

---

## PROJECT OVERVIEW

Aurelius is a revolutionary AI Personal Assistant that acts as a "digital chief of staff," transitioning users from managing "to-do" lists to benefiting from "done" lists. The backend must support deep workspace integration, proactive task execution, perfect memory of user interactions, and voice-based interaction.

**Core Philosophy:**
- **"No Compromises"**: Excellence in every aspect - no shortcuts
- **Security First**: Every piece of data is sensitive
- **Type Safety**: STRICT TypeScript - NO `any` or `unknown` types
- **Cost Optimization**: Smart AI model selection and aggressive caching
- **Memory Efficiency**: Minimal code footprint with maximum functionality
- **Voice-First Ready**: Full voice interaction support via ElevenLabs

---

## TECHNOLOGY STACK (MANDATORY)

```typescript
// EXACT VERSIONS TO USE - NO DEVIATIONS
{
  "runtime": "Node.js LTS (v20.x)",
  "framework": "NestJS 10.x",
  "database": "PostgreSQL 16 with pgvector",
  "orm": "Prisma 5.x",
  "cache": "Redis 7.x",
  "queue": "Bull with Redis",
  "auth": "Passport + JWT (Google, Microsoft, Apple)",
  "validation": "class-validator + class-transformer",
  "ai": {
    "reasoning": "Anthropic SDK with smart model selection",
    "voice": "ElevenLabs API (speech-to-text + text-to-speech)"
  },
  "realtime": "Socket.io 4.x",
  "documentation": "Swagger/OpenAPI",
  "testing": "Jest + Supertest",
  "monitoring": "Winston + Sentry"
}
```

**Package Manager**: npm ONLY (not yarn, not pnpm)

---

## TYPESCRIPT CONFIGURATION (STRICT MODE)

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**🚨 RULE: NO `any` OR `unknown` TYPES EVER! Define proper interfaces for everything.**

---

## AI MODEL SELECTION & COST OPTIMIZATION

```typescript
interface AIModelSelection {
  // SMART MODEL ROUTING - COST-OPTIMIZED
  models: {
    'claude-3-haiku': {
      cost: '$0.00025/1K tokens',
      use: ['simple queries', 'data extraction', 'basic classification', 'quick responses'],
      maxTokens: 4096,
      temperature: 0.3
    },
    'claude-3-5-sonnet': {
      cost: '$0.003/1K tokens', 
      use: ['complex reasoning', 'content generation', 'email drafting', 'analysis'],
      maxTokens: 8192,
      temperature: 0.7
    },
    'claude-3-opus': {
      cost: '$0.015/1K tokens',
      use: ['critical decisions', 'complex workflows', 'strategic planning'],
      maxTokens: 16384,
      temperature: 0.5
    }
  }
}

// INTELLIGENT REQUEST ANALYZER
@Injectable()
export class AIModelSelector {
  private readonly complexityPatterns = {
    simple: /^(what|when|where|who|list|show|get)/i,
    medium: /^(how|why|analyze|compare|suggest|draft)/i,
    complex: /^(strategize|plan|design|architect|optimize)/i
  };

  selectModel(request: AIRequest): ModelSelection {
    const complexity = this.analyzeComplexity(request);
    const userTier = request.user.subscription.tier;
    const urgency = request.metadata?.urgency || 'normal';
    
    // Default to cheapest model that can handle the task
    if (complexity === 'simple' && urgency !== 'high') {
      return 'claude-3-haiku';
    }
    
    if (complexity === 'medium' || userTier === 'pro') {
      return 'claude-3-5-sonnet';
    }
    
    // Only use expensive models for Max tier or critical operations
    if (userTier === 'max' && complexity === 'complex') {
      return 'claude-3-opus';
    }
    
    return 'claude-3-5-sonnet'; // Safe default
  }
  
  private analyzeComplexity(request: AIRequest): 'simple' | 'medium' | 'complex' {
    // Analyze prompt length, keywords, task type, context requirements
    const prompt = request.prompt.toLowerCase();
    
    if (prompt.length < 50 && this.complexityPatterns.simple.test(prompt)) {
      return 'simple';
    }
    
    if (prompt.length > 200 || this.complexityPatterns.complex.test(prompt)) {
      return 'complex';
    }
    
    return 'medium';
  }
}
```

---

## VOICE INTEGRATION (ELEVENLABS)

```typescript
// VOICE CONTROLLER - MAIN ENTRY POINT FOR VOICE COMMANDS
@Controller('api/v1/voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly aiGateway: AIGatewayService,
    private readonly proactivityEngine: ProactivityEngine
  ) {}

  @Post('process')
  @UseInterceptors(FileInterceptor('audio'))
  async processVoiceCommand(
    @UploadedFile() audioFile: Express.Multer.File,
    @User() user: UserEntity,
    @Body() metadata: VoiceMetadata
  ): Promise<VoiceResponse> {
    // 1. Convert speech to text via ElevenLabs
    const transcript = await this.voiceService.speechToText(audioFile);
    
    // 2. Enhance transcript with context
    const enhancedRequest = await this.voiceService.enhanceWithContext(
      transcript,
      user,
      metadata
    );
    
    // 3. Process through AI Gateway with smart model selection
    const aiResponse = await this.aiGateway.processRequest(enhancedRequest);
    
    // 4. Convert response to speech
    const audioResponse = await this.voiceService.textToSpeech(
      aiResponse.text,
      user.preferences.voiceId || 'rachel' // Default voice
    );
    
    // 5. Return both text and audio
    return {
      text: aiResponse.text,
      audioUrl: audioResponse.url,
      actions: aiResponse.suggestedActions,
      confidence: aiResponse.confidence
    };
  }
}

// VOICE SERVICE IMPLEMENTATION
@Injectable()
export class VoiceService {
  constructor(
    private readonly elevenLabs: ElevenLabsService,
    private readonly cache: CacheService,
    private readonly logger: LoggerService
  ) {}

  async speechToText(audio: Express.Multer.File): Promise<string> {
    // Check cache first
    const audioHash = this.generateAudioHash(audio.buffer);
    const cached = await this.cache.get(`stt:${audioHash}`);
    if (cached) return cached;

    try {
      const transcript = await this.elevenLabs.transcribe({
        audio: audio.buffer,
        language: 'en',
        model: 'whisper_large'
      });
      
      // Cache for 24 hours
      await this.cache.set(`stt:${audioHash}`, transcript, 86400);
      
      return transcript;
    } catch (error) {
      this.logger.error('Speech-to-text failed', error);
      throw new AppException('Voice processing failed', 500, 'VOICE_ERROR');
    }
  }

  async textToSpeech(text: string, voiceId: string): Promise<AudioResponse> {
    // Smart caching for common phrases
    const textHash = this.generateTextHash(text);
    const cacheKey = `tts:${voiceId}:${textHash}`;
    
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const audio = await this.elevenLabs.generate({
      text: this.optimizeForSpeech(text),
      voice_id: voiceId,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.75,
        similarity_boost: 0.75
      }
    });

    // Store in CDN and cache URL
    const audioUrl = await this.uploadToCDN(audio);
    const response = { url: audioUrl, duration: audio.duration };
    
    await this.cache.set(cacheKey, response, 604800); // 7 days
    
    return response;
  }
  
  private optimizeForSpeech(text: string): string {
    // Remove markdown, clean up for natural speech
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }
}
```

---

## ENHANCED PROACTIVITY ENGINE (TASA++)

```typescript
// ADVANCED TASA LOOP: Trigger → Analysis → Suggestion → Action → Learning
interface EnhancedTASAEngine {
  version: '2.0',
  
  workflow: {
    // PHASE 1: INTELLIGENT TRIGGERING
    trigger: {
      sources: {
        temporal: 'Cron-based scheduled checks',
        event: 'Webhook and real-time events',
        contextual: 'AI-detected patterns',
        predictive: 'ML-based anticipation'
      },
      
      prioritization: {
        urgent: 'Immediate processing',
        important: 'Within 5 minutes',
        routine: 'Batch processing'
      }
    },
    
    // PHASE 2: DEEP ANALYSIS
    analysis: {
      steps: [
        'Context gathering from multiple sources',
        'Historical pattern matching',
        'Impact assessment',
        'Confidence scoring',
        'Alternative solution generation'
      ],
      
      contextSources: [
        'User calendar and availability',
        'Recent email/chat conversations',
        'Active projects and deadlines',
        'Team member status',
        'External factors (weather, traffic, news)'
      ]
    },
    
    // PHASE 3: INTELLIGENT SUGGESTION
    suggestion: {
      components: {
        primary: 'Main recommended action',
        alternatives: 'Other viable options',
        reasoning: 'Why this suggestion',
        impact: 'Expected outcomes',
        confidence: 'Certainty level (0-100)'
      },
      
      personalization: {
        userPreferences: 'Learned behavior patterns',
        workStyle: 'Optimal timing and approach',
        communication: 'Preferred channels and tone'
      }
    },
    
    // PHASE 4: SMART ACTION EXECUTION
    action: {
      types: {
        immediate: 'No approval needed (low risk)',
        approval: 'Requires user confirmation',
        scheduled: 'Delayed execution',
        conditional: 'Based on future events'
      },
      
      execution: {
        validation: 'Pre-flight checks',
        rollback: 'Undo capability',
        notification: 'Status updates',
        verification: 'Success confirmation'
      }
    },
    
    // PHASE 5: CONTINUOUS LEARNING
    learning: {
      feedback: {
        explicit: 'User ratings and corrections',
        implicit: 'Usage patterns and modifications',
        outcomes: 'Result tracking'
      },
      
      optimization: {
        modelTuning: 'Adjust AI parameters',
        patternUpdate: 'Refine trigger conditions',
        personalization: 'Update user preferences'
      }
    }
  }
}

// IMPLEMENTATION
@Injectable()
export class EnhancedProactivityEngine {
  constructor(
    private readonly aiGateway: AIGatewayService,
    private readonly contextService: ContextService,
    private readonly learningService: LearningService,
    private readonly actionExecutor: ActionExecutorService,
    private readonly websocket: WebSocketGateway
  ) {}

  async processTrigger(trigger: EnhancedTrigger): Promise<void> {
    // Phase 1: Validate and prioritize
    const priority = await this.prioritizeTrigger(trigger);
    if (priority === 'ignore') return;
    
    // Phase 2: Gather comprehensive context
    const context = await this.contextService.gatherContext({
      userId: trigger.userId,
      scope: trigger.scope,
      depth: this.getContextDepth(priority),
      sources: ['calendar', 'email', 'tasks', 'integrations', 'history']
    });
    
    // Phase 3: Analyze with appropriate AI model
    const model = this.selectAIModel(trigger, context, priority);
    const analysis = await this.aiGateway.analyze({
      trigger,
      context,
      model,
      options: {
        generateAlternatives: true,
        includeReasoning: true,
        confidenceThreshold: 0.7
      }
    });
    
    // Phase 4: Generate rich suggestion
    const suggestion = await this.buildEnhancedSuggestion({
      analysis,
      userPreferences: context.user.preferences,
      historicalSuccess: await this.learningService.getSuccessRate(
        trigger.type,
        context.user.id
      )
    });
    
    // Phase 5: Determine action strategy
    const actionStrategy = this.determineActionStrategy(
      suggestion,
      context.user.subscription.tier
    );
    
    if (actionStrategy === 'immediate' && suggestion.confidence > 0.9) {
      // Execute without approval for high-confidence, low-risk actions
      await this.executeAction(suggestion, context);
    } else {
      // Send to user for approval
      await this.websocket.sendToUser(context.user.id, {
        type: 'suggestion:enhanced',
        payload: {
          suggestion,
          context: context.summary,
          expiresAt: this.calculateExpiry(priority)
        }
      });
    }
    
    // Phase 6: Track for learning
    await this.learningService.trackSuggestion(suggestion);
  }
  
  private async executeAction(
    suggestion: EnhancedSuggestion,
    context: UserContext
  ): Promise<ActionResult> {
    try {
      // Pre-execution validation
      await this.actionExecutor.validate(suggestion.action);
      
      // Execute with rollback capability
      const result = await this.actionExecutor.executeWithRollback(
        suggestion.action,
        context
      );
      
      // Notify user of completion
      await this.websocket.sendToUser(context.user.id, {
        type: 'action:completed',
        payload: { result, suggestion }
      });
      
      // Learn from execution
      await this.learningService.recordOutcome(suggestion.id, result);
      
      return result;
    } catch (error) {
      // Intelligent error handling
      await this.handleActionError(error, suggestion, context);
      throw error;
    }
  }
}
```

---

## MULTI-LAYER CACHING STRATEGY

```typescript
// AGGRESSIVE CACHING FOR COST OPTIMIZATION
interface CacheStrategy {
  layers: {
    L0_Local: { 
      ttl: '30s', 
      size: '10MB',
      use: 'Hot paths, active sessions'
    },
    L1_Memory: { 
      ttl: '5m', 
      size: '100MB',
      use: 'Frequent queries, user context'
    },
    L2_Redis: { 
      ttl: '1h', 
      size: '1GB',
      use: 'AI responses, computed results'
    },
    L3_Database: { 
      ttl: '24h', 
      size: 'unlimited',
      use: 'Historical data, embeddings'
    }
  },
  
  patterns: {
    'ai-responses': { 
      ttl: '72h', 
      strategy: 'semantic-dedup',
      invalidateOn: ['data-change', 'model-update']
    },
    'voice-transcripts': {
      ttl: '24h',
      strategy: 'exact-match',
      invalidateOn: ['user-request']
    },
    'tts-audio': {
      ttl: '7d',
      strategy: 'content-hash',
      invalidateOn: ['voice-change']
    },
    'user-context': { 
      ttl: '24h', 
      strategy: 'sliding-window',
      invalidateOn: ['login', 'logout', 'preference-change']
    },
    'integration-data': { 
      ttl: '5m', 
      strategy: 'refresh-ahead',
      invalidateOn: ['webhook', 'sync', 'user-action']
    },
    'vector-search': { 
      ttl: '48h', 
      strategy: 'similarity-threshold',
      invalidateOn: ['embedding-update', 'reindex']
    }
  }
}

// MEMORY-EFFICIENT CACHE DECORATOR
export function SmartCache(options: CacheOptions) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = generateCacheKey(target.constructor.name, propertyName, args);
      
      // Multi-layer cache check
      const cached = await checkAllCacheLayers(cacheKey);
      if (cached) return cached;
      
      // Execute and cache
      const result = await originalMethod.apply(this, args);
      await setMultiLayerCache(cacheKey, result, options);
      
      return result;
    };
  };
}

// USAGE EXAMPLE
@Injectable()
export class TaskService {
  @SmartCache({ ttl: 3600, layers: ['L1', 'L2'], strategy: 'user-scoped' })
  async getUserTasks(userId: string, filters?: TaskFilters): Promise<Task[]> {
    // Implementation
  }
}
```

---

## AUTHENTICATION WITH APPLE

```typescript
// ENHANCED AUTH MODULE WITH APPLE SIGN-IN
@Module({
  imports: [PassportModule, JwtModule, UsersModule],
  providers: [
    AuthService,
    GoogleStrategy,
    MicrosoftStrategy,
    AppleStrategy, // NEW
    JwtStrategy,
    RefreshTokenStrategy
  ],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}

// APPLE STRATEGY IMPLEMENTATION
@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService
  ) {
    super({
      clientID: configService.get('APPLE_CLIENT_ID'),
      teamID: configService.get('APPLE_TEAM_ID'),
      keyID: configService.get('APPLE_KEY_ID'),
      privateKeyLocation: configService.get('APPLE_PRIVATE_KEY_PATH'),
      callbackURL: configService.get('APPLE_CALLBACK_URL'),
      scope: ['email', 'name']
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any
  ): Promise<User> {
    const { id, email, name } = idToken;
    
    // Find or create user
    let user = await this.usersService.findByAppleId(id);
    
    if (!user) {
      user = await this.usersService.create({
        appleId: id,
        email,
        name: name ? `${name.firstName} ${name.lastName}` : undefined,
        provider: 'apple'
      });
    }
    
    return user;
  }
}

// AUTH CONTROLLER UPDATE
@Controller('api/v1/auth')
export class AuthController {
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  async appleAuth() {
    // Initiates Apple OAuth flow
  }

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleCallback(@User() user: UserEntity) {
    const tokens = await this.authService.generateTokens(user);
    return { success: true, ...tokens };
  }
}
```

---

## COMPLETE INTEGRATION LIST (99 TOTAL)

```typescript
// ALL INTEGRATIONS MUST BE IMPLEMENTED WITH PROFESSIONAL QUALITY
export const REQUIRED_INTEGRATIONS = {
  // 1. GOOGLE WORKSPACE SUITE (12 integrations)
  googleWorkspace: [
    'google-gmail',       // Email management
    'google-calendar',    // Calendar sync
    'google-drive',       // File storage
    'google-tasks',       // Task management
    'google-contacts',    // Contact sync
    'google-keep',        // Notes
    'google-meet',        // Video meetings
    'google-chat',        // Team messaging
    'google-forms',       // Form responses
    'google-sheets',      // Spreadsheet data
    'google-docs',        // Document access
    'google-slides'       // Presentation access
  ],

  // 2. MICROSOFT 365 SUITE (12 integrations)
  microsoft365: [
    'microsoft-outlook',      // Email & calendar
    'microsoft-teams',        // Team collaboration
    'microsoft-onedrive',     // File storage
    'microsoft-sharepoint',   // Document management
    'microsoft-planner',      // Task management
    'microsoft-todo',         // Personal tasks
    'microsoft-power-automate', // Workflow automation
    'microsoft-excel',        // Spreadsheet access
    'microsoft-word',         // Document access
    'microsoft-powerpoint',   // Presentation access
    'microsoft-dynamics-365', // CRM integration
    'microsoft-azure-devops'  // Development tracking
  ],

  // 3. COMMUNICATION PLATFORMS (5 integrations)
  communication: [
    'slack',              // Team messaging
    'discord',            // Community chat
    'zoom',               // Video conferencing
    'telegram',           // Messaging
    'whatsapp-business'   // Business messaging
  ],

  // 4. PROJECT MANAGEMENT (9 integrations)
  projectManagement: [
    'jira',         // Issue tracking
    'trello',       // Kanban boards
    'asana',        // Work management
    'linear',       // Issue tracking
    'clickup',      // All-in-one PM
    'monday',       // Work OS
    'basecamp',     // Team projects
    'wrike',        // Collaborative PM
    'smartsheet'    // Work execution
  ],

  // 5. CRM & SALES (6 integrations)
  crmSales: [
    'salesforce',   // Enterprise CRM
    'hubspot',      // Inbound marketing
    'pipedrive',    // Sales CRM
    'zoho-crm',     // Business CRM
    'freshsales',   // AI-powered CRM
    'copper'        // Google Workspace CRM
  ],

  // 6. DEVELOPER TOOLS (8 integrations)
  developerTools: [
    'github',       // Code repository
    'gitlab',       // DevOps platform
    'bitbucket',    // Git repository
    'jenkins',      // CI/CD
    'circleci',     // Continuous integration
    'vercel',       // Deployment
    'netlify',      // Web deployment
    'docker-hub'    // Container registry
  ],

  // 7. PRODUCTIVITY & NOTE-TAKING (9 integrations)
  productivity: [
    'notion',        // All-in-one workspace
    'todoist',       // Task management
    'obsidian',      // Knowledge base
    'evernote',      // Note-taking
    'onenote',       // Digital notebook
    'roam-research', // Networked thought
    'bear',          // Writing app
    'apple-notes',   // iOS notes
    'craft'          // Documents & notes
  ],

  // 8. CALENDAR & SCHEDULING (5 integrations)
  scheduling: [
    'apple-calendar', // iOS calendar
    'calendly',       // Meeting scheduling
    'cal-com',        // Open scheduling
    'fantastical',    // Calendar app
    'any-do-cal'      // Calendar & tasks
  ],

  // 9. FINANCE & ACCOUNTING (8 integrations)
  finance: [
    'stripe',      // Payment processing
    'quickbooks',  // Accounting
    'xero',        // Cloud accounting
    'paypal',      // Payments
    'square',      // Commerce platform
    'plaid',       // Financial data
    'freshbooks',  // Small business accounting
    'wave'         // Financial software
  ],

  // 10. CUSTOMER SUPPORT (6 integrations)
  support: [
    'zendesk',     // Help desk
    'intercom',    // Customer messaging
    'freshdesk',   // Support software
    'help-scout',  // Help desk
    'drift',       // Conversational marketing
    'livechat'     // Live chat software
  ],

  // 11. AUTOMATION PLATFORMS (5 integrations)
  automation: [
    'zapier',      // Workflow automation
    'make',        // Visual automation
    'ifttt',       // Simple automation
    'n8n',         // Fair-code automation
    'workato'      // Enterprise automation
  ],

  // 12. SOCIAL MEDIA & MARKETING (6 integrations)
  socialMedia: [
    'twitter',           // Social platform
    'linkedin',          // Professional network
    'facebook-pages',    // Business pages
    'instagram-business', // Business account
    'buffer',            // Social scheduling
    'hootsuite'          // Social management
  ],

  // 13. E-COMMERCE & MARKETPLACES (6 integrations)
  ecommerce: [
    'shopify',      // E-commerce platform
    'woocommerce',  // WordPress commerce
    'amazon-seller', // Marketplace
    'ebay',         // Online marketplace
    'etsy',         // Creative marketplace
    'bigcommerce'   // E-commerce platform
  ],

  // 14. ANALYTICS & MONITORING (6 integrations)
  analytics: [
    'google-analytics', // Web analytics
    'mixpanel',         // Product analytics
    'segment',          // Customer data
    'amplitude',        // Product intelligence
    'datadog',          // Monitoring
    'new-relic'         // Performance monitoring
  ],

  // 15. CLOUD STORAGE & FILE MANAGEMENT (4 integrations)
  cloudStorage: [
    'dropbox',      // File storage
    'box',          // Cloud content
    'aws-s3',       // Object storage
    'icloud-drive'  // Apple cloud storage
  ]
};
```

---

## MEMORY-EFFICIENT INTEGRATION PATTERN

```typescript
// BASE INTEGRATION CLASS - MINIMIZE CODE DUPLICATION
abstract class BaseIntegration {
  protected readonly cache: CacheService;
  protected readonly logger: LoggerService;
  protected readonly config: ConfigService;
  
  constructor(protected readonly moduleRef: ModuleRef) {
    // Lazy load services only when needed
    this.cache = this.moduleRef.get(CacheService, { strict: false });
    this.logger = this.moduleRef.get(LoggerService, { strict: false });
    this.config = this.moduleRef.get(ConfigService, { strict: false });
  }
  
  // Common OAuth flow - reused by all integrations
  protected async handleOAuth(provider: string, credentials: OAuthCredentials) {
    const tokens = await this.exchangeTokens(credentials);
    await this.storeEncryptedTokens(provider, tokens);
    return this.createIntegrationRecord(provider, tokens);
  }
  
  // Common API request handler with rate limiting
  protected async makeApiRequest<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<T> {
    await this.checkRateLimit(options.provider);
    
    const cached = await this.cache.get(`api:${endpoint}`);
    if (cached) return cached;
    
    const response = await this.executeRequest(endpoint, options);
    await this.cache.set(`api:${endpoint}`, response, options.cacheTtl || 300);
    
    return response;
  }
  
  // Abstract methods to be implemented by each integration
  abstract getAuthUrl(): string;
  abstract fetchData(params: any): Promise<any>;
  abstract processWebhook(payload: any): Promise<void>;
}

// EXAMPLE: GMAIL INTEGRATION (MEMORY-EFFICIENT)
@Injectable()
export class GmailIntegration extends BaseIntegration {
  private gmail: gmail_v1.Gmail | null = null;
  
  // Lazy initialization - only create client when needed
  private getClient(): gmail_v1.Gmail {
    if (!this.gmail) {
      this.gmail = google.gmail({ version: 'v1', auth: this.getAuth() });
    }
    return this.gmail;
  }
  
  async fetchEmails(userId: string, options: EmailFetchOptions): Promise<Email[]> {
    // Use base class caching
    const cacheKey = `gmail:${userId}:${JSON.stringify(options)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    
    const emails = await this.getClient().users.messages.list({
      userId: 'me',
      maxResults: options.limit || 10,
      q: options.query
    });
    
    // Process in batches to minimize memory usage
    const results = await this.processBatch(emails.data.messages || []);
    
    await this.cache.set(cacheKey, results, 300); // 5 min cache
    return results;
  }
  
  // Implement required abstract methods
  getAuthUrl(): string {
    return `https://accounts.google.com/o/oauth2/v2/auth?${this.buildAuthParams()}`;
  }
  
  async processWebhook(payload: any): Promise<void> {
    // Minimal processing, queue heavy work
    await this.queue.add('gmail-webhook', payload);
  }
}
```

---

## DATABASE SCHEMA (OPTIMIZED)

```prisma
// CORE ENTITIES WITH MEMORY-EFFICIENT DESIGN

model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String?
  avatar            String?
  
  // OAuth providers
  googleId          String?  @unique
  microsoftId       String?  @unique
  appleId           String?  @unique // NEW
  
  // Subscription
  subscription      Subscription?
  stripeCustomerId  String?  @unique
  
  // Voice preferences
  voiceId           String?  @default("rachel")
  voiceSpeed        Float    @default(1.0)
  
  // Security
  mfaEnabled        Boolean  @default(false)
  mfaSecret         String?  @db.Text
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  lastActiveAt      DateTime?
  preferences       Json     @default("{}")
  
  // Relations - lazy loaded
  integrations      Integration[]
  tasks             Task[]
  embeddings        VectorEmbedding[]
  aiUsage           AIUsageLog[]
  
  @@index([email])
  @@index([stripeCustomerId])
  @@index([lastActiveAt])
}

model Integration {
  id                String   @id @default(cuid())
  userId            String
  provider          String   // 'google-gmail', 'slack', etc.
  
  // Encrypted tokens
  accessToken       String   @db.Text
  refreshToken      String?  @db.Text
  tokenExpiry       DateTime?
  
  // Integration status
  status            String   @default("active") // active, paused, error
  lastSyncAt        DateTime?
  syncError         String?
  
  // Metadata
  settings          Json     @default("{}")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, provider])
  @@index([userId, status])
  @@index([provider, lastSyncAt])
}

model VectorEmbedding {
  id          String   @id @default(cuid())
  userId      String
  contentType String   // 'email' | 'task' | 'document' | 'voice'
  contentId   String   // Reference to original content
  contentHash String   // For deduplication
  
  // pgvector - 1536 dimensions
  embedding   Float[]  @db.Vector(1536)
  
  // Metadata for filtering
  metadata    Json
  createdAt   DateTime @default(now())
  expiresAt   DateTime // Auto-cleanup old embeddings
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([contentHash, userId])
  @@index([userId, contentType])
  @@index([expiresAt])
  @@index([embedding] opclass: vector_cosine_ops)
}

model AIUsageLog {
  id          String   @id @default(cuid())
  userId      String
  model       String   // 'claude-3-haiku', etc.
  action      String   // 'email-draft', 'task-analysis', etc.
  
  // Metrics
  inputTokens  Int
  outputTokens Int
  totalCost    Decimal  @db.Decimal(10, 6)
  duration     Int      // milliseconds
  
  // Cache info
  cacheHit     Boolean  @default(false)
  
  createdAt    DateTime @default(now())
  
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt])
  @@index([model, action])
}
```

---

## SECURITY IMPLEMENTATION (ENHANCED)

```typescript
// COMPREHENSIVE SECURITY CONFIGURATION
interface SecurityConfig {
  encryption: {
    algorithm: 'AES-256-GCM',
    keyRotation: 'quarterly',
    tokenStorage: 'encrypted-at-rest',
    tlsVersion: '1.3-only'
  },
  
  authentication: {
    providers: ['google', 'microsoft', 'apple'],
    jwt: { 
      expiresIn: '15m', 
      algorithm: 'RS256',
      issuer: 'aurelius.ai'
    },
    refreshToken: { 
      rotation: true, 
      expiresIn: '7d',
      family: 'track-reuse-detection'
    },
    mfa: { 
      required: ['teams', 'max'], 
      optional: ['pro'],
      methods: ['totp', 'sms']
    }
  },
  
  rateLimit: {
    global: { windowMs: 60000, max: 100 },
    ai: { windowMs: 60000, max: 50 },
    voice: { windowMs: 60000, max: 30 },
    auth: { windowMs: 900000, max: 5 }
  },
  
  validation: {
    input: 'class-validator + DOMPurify',
    output: 'response filtering + PII masking',
    fileUpload: {
      maxSize: '10MB',
      allowedTypes: ['audio/mp3', 'audio/wav', 'audio/webm'],
      virusScan: true
    }
  },
  
  headers: {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'"
  }
}
```

---

## PERFORMANCE OPTIMIZATION

```typescript
// MEMORY-EFFICIENT PATTERNS
interface PerformanceOptimizations {
  patterns: {
    lazyLoading: {
      description: 'Load modules only when needed',
      implementation: 'Dynamic imports with webpack',
      savings: '40% initial bundle size'
    },
    
    connectionPooling: {
      database: { min: 2, max: 10, idle: 10000 },
      redis: { min: 1, max: 5 },
      http: { maxSockets: 10, keepAlive: true }
    },
    
    streamProcessing: {
      description: 'Process large datasets as streams',
      use: ['file uploads', 'bulk exports', 'email processing'],
      memoryLimit: '50MB per operation'
    },
    
    batchOperations: {
      aiRequests: { size: 10, delay: 100 },
      databaseWrites: { size: 100, delay: 500 },
      cacheWrites: { size: 50, delay: 200 }
    }
  },
  
  codeOptimizations: {
    // Use shared base classes
    inheritance: 'Reduce code duplication by 60%',
    
    // Dependency injection
    singletons: 'Share service instances across modules',
    
    // Tree shaking
    imports: 'Only import what you use',
    
    // Async everywhere
    async: 'Never block the event loop'
  }
}
```

---

## MONITORING & OBSERVABILITY

```typescript
// COMPREHENSIVE MONITORING SETUP
interface MonitoringConfig {
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: 'json',
    transports: [
      { type: 'console', colorize: true },
      { type: 'file', filename: 'error.log', level: 'error' },
      { type: 'sentry', dsn: process.env.SENTRY_DSN }
    ]
  },
  
  metrics: {
    custom: {
      'ai.model.usage': 'Counter by model type',
      'ai.cost.per_user': 'Gauge of costs',
      'voice.processing.duration': 'Histogram of voice processing',
      'cache.efficiency': 'Hit rate percentage',
      'integration.sync.success': 'Success rate by provider'
    },
    
    alerts: {
      'error.rate > 1%': { severity: 'critical', notify: ['slack', 'email'] },
      'ai.cost.hourly > $50': { severity: 'warning', notify: ['slack'] },
      'api.p95 > 500ms': { severity: 'warning', notify: ['dashboard'] },
      'memory.usage > 80%': { severity: 'critical', notify: ['pager'] }
    }
  },
  
  tracing: {
    enabled: true,
    sampleRate: 0.1,
    propagators: ['jaeger', 'b3']
  }
}
```

---

## CRITICAL DEVELOPMENT RULES

1. **NO `any` OR `unknown` TYPES** - Every variable must have a proper type
2. **NO console.log IN CODE** - Use Winston logger with appropriate levels
3. **NO HARDCODED SECRETS** - All sensitive data in environment variables
4. **NO SYNCHRONOUS I/O** - Everything must be async/await
5. **NO UNBOUNDED OPERATIONS** - Always paginate, limit, and timeout
6. **NO MISSING ERROR HANDLING** - Try-catch or .catch() on every promise
7. **NO UNTESTED CODE** - Minimum 80% coverage with meaningful tests
8. **NO MEMORY LEAKS** - Clean up listeners, close connections, clear timeouts
9. **NO EXPENSIVE AI CALLS WITHOUT CACHE CHECK** - Always check cache first
10. **NO RAW SQL** - Use Prisma ORM for all database operations

**ENFORCE THESE RULES:**
- ESLint with strict configuration
- Pre-commit hooks with Husky
- CI/CD pipeline with automated checks
- Code reviews mandatory for all PRs

---

## DEVELOPMENT WORKFLOW

```bash
# INITIAL SETUP
git clone <repository>
cd aurelius-backend
npm install
cp .env.example .env
# Configure all environment variables

# DATABASE SETUP
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed

# DEVELOPMENT
npm run start:dev          # Start with hot reload
npm run test:watch        # Run tests in watch mode

# BEFORE COMMIT
npm run lint              # Fix linting issues
npm run format            # Format with Prettier
npm run test              # Run all tests
npm run test:cov          # Check coverage (must be >80%)
npm run build             # Ensure it builds

# DEPLOYMENT
npm run build
npm run start:prod
```

---

## FINAL CHECKLIST

Before writing any code:

- [ ] TypeScript strict mode configured
- [ ] All 99 integrations planned with shared base class
- [ ] Voice integration with ElevenLabs ready
- [ ] Enhanced TASA++ engine architecture defined
- [ ] Multi-layer caching strategy implemented
- [ ] Smart AI model selection logic ready
- [ ] Apple authentication configured
- [ ] Security measures in place
- [ ] Memory optimization patterns applied
- [ ] Monitoring and alerting configured

**Remember: Professional quality, not enterprise complexity. Write less code that does more.**