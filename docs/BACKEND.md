# Aurelius AI - Backend Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Module Structure](#module-structure)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Authentication & Authorization](#authentication--authorization)
7. [AI Integration](#ai-integration)
8. [Real-time Features](#real-time-features)
9. [Caching Strategy](#caching-strategy)
10. [Queue Management](#queue-management)
11. [Error Handling](#error-handling)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Monitoring & Logging](#monitoring--logging)

## Overview

The Aurelius AI backend is built with NestJS, a progressive Node.js framework that provides an out-of-the-box application architecture. It leverages TypeScript, dependency injection, and modular design patterns to create a scalable and maintainable backend system.

### Key Features

- **Modular Architecture**: Clean separation of concerns with NestJS modules
- **Type Safety**: Full TypeScript implementation with strict typing
- **Database Integration**: Prisma ORM with PostgreSQL and pgvector
- **Real-time Communication**: WebSocket support via Socket.io
- **Queue Processing**: Bull queues for background jobs
- **AI Orchestration**: Intelligent routing between AI models
- **Caching**: Multi-layer caching with Redis
- **Security**: JWT authentication, rate limiting, and input validation

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Requests                         │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                        │
│  • Rate Limiting   • CORS   • Compression   • Logging       │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Guards & Interceptors                    │
│  • JWT Auth   • Role Guards   • Response Transform          │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Controllers                            │
│  • Request Validation   • Route Handling   • DTO Transform  │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       Services                              │
│  • Business Logic   • Data Access   • External APIs         │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data & External Layer                    │
│  • PostgreSQL   • Redis   • AI APIs   • Queue Processing    │
└─────────────────────────────────────────────────────────────┘
```

### Module Dependencies

```typescript
// Module dependency graph
AppModule
├── ConfigModule (global)
├── ThrottlerModule (global)
├── BullModule (global)
├── ScheduleModule
├── PrismaModule (global)
├── AuthModule
│   ├── UsersModule
│   └── IntegrationsModule
├── BillingModule
│   ├── WebsocketModule
│   └── NotificationsModule
├── AiGatewayModule
│   ├── CacheModule
│   └── BillingModule
├── TasksModule
├── CalendarModule
├── EmailModule
├── WebsocketModule
├── CacheModule
├── AnalyticsModule
├── QueueModule
├── NotificationsModule
└── HealthModule
```

## Module Structure

### Core Modules

#### 1. Auth Module

```typescript
// modules/auth/auth.module.ts
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: { 
          expiresIn: configService.get('jwt.expiresIn'),
          issuer: 'aurelius-ai',
          audience: 'aurelius-users',
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    IntegrationsModule,
  ],
  providers: [
    AuthService,
    GoogleStrategy,
    MicrosoftStrategy,
    JwtStrategy,
    RefreshTokenStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
```

#### 2. AI Gateway Module

```typescript
// modules/ai-gateway/ai-gateway.service.ts
@Injectable()
export class AiGatewayService {
  constructor(
    private readonly modelSelector: ModelSelectorService,
    private readonly claude: ClaudeService,
    private readonly openai: OpenAIService,
    private readonly promptService: PromptService,
    private readonly cache: CacheService,
    private readonly usageService: UsageService,
    @InjectQueue('ai-processing') private aiQueue: Queue,
  ) {}

  async processRequest(request: AiRequest): Promise<AiResponse> {
    // 1. Check cache
    const cached = await this.checkCache(request);
    if (cached) return cached;

    // 2. Track usage
    await this.usageService.trackApiCall(request.userId, 'ai_request');

    // 3. Select optimal model
    const model = await this.modelSelector.selectModel(request);

    // 4. Enhance prompt
    const enhancedPrompt = await this.promptService.enhance(request);

    // 5. Route to AI service
    const response = await this.routeToService(model, enhancedPrompt);

    // 6. Cache response
    await this.cacheResponse(request, response);

    return response;
  }
}
```

## Database Design

### Prisma Schema Architecture

```prisma
// Key models and relationships

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  
  // Relations
  subscription    Subscription?
  integrations    Integration[]
  tasks           Task[]
  events          CalendarEvent[]
  emails          Email[]
  embeddings      VectorEmbedding[]
  
  // Indexes for performance
  @@index([email])
  @@index([stripeCustomerId])
  @@index([lastActiveAt])
}

model Task {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  
  // AI-enhanced fields
  aiSuggested     Boolean  @default(false)
  aiConfidence    Float?
  smartScheduled  Boolean  @default(false)
  
  // Hierarchical structure
  parentId        String?
  parentTask      Task?    @relation("TaskSubtasks", fields: [parentId], references: [id])
  subtasks        Task[]   @relation("TaskSubtasks")
  
  @@index([userId, status])
  @@index([userId, dueDate])
}

model VectorEmbedding {
  id              String   @id @default(cuid())
  userId          String
  
  // pgvector for similarity search
  embedding       Unsupported("vector(1536)")
  
  // Metadata
  contentType     String
  contentId       String
  
  @@index([userId, contentType])
}
```

### Database Optimization Strategies

```typescript
// Efficient query patterns

// 1. Pagination with cursor
async findTasks(userId: string, cursor?: string) {
  return this.prisma.task.findMany({
    where: { userId },
    take: 20,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      subtasks: {
        take: 3,
        orderBy: { priority: 'desc' },
      },
    },
  });
}

// 2. Aggregation pipeline
async getUserStats(userId: string) {
  const [taskStats, eventStats] = await Promise.all([
    this.prisma.task.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    }),
    this.prisma.calendarEvent.count({
      where: {
        userId,
        startTime: { gte: new Date() },
      },
    }),
  ]);
  
  return { taskStats, upcomingEvents: eventStats };
}

// 3. Vector similarity search
async findSimilar(embedding: number[], limit = 10) {
  return this.prisma.$queryRaw`
    SELECT id, content, 1 - (embedding <=> ${embedding}::vector) as similarity
    FROM "VectorEmbedding"
    WHERE userId = ${userId}
    ORDER BY embedding <=> ${embedding}::vector
    LIMIT ${limit}
  `;
}
```

## API Design

### RESTful Endpoints

```typescript
// Standard CRUD pattern with versioning
@Controller('api/v1/tasks')
@UseGuards(JwtAuthGuard)
@ApiTags('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get user tasks' })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: GetTasksDto,
  ): Promise<PaginatedResponse<Task>> {
    return this.tasksService.findAll(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create new task' })
  @ApiBody({ type: CreateTaskDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateTaskDto,
  ): Promise<Task> {
    return this.tasksService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasksService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task' })
  async delete(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    await this.tasksService.delete(user.id, id);
  }
}
```

### DTO Validation

```typescript
// DTOs with class-validator
export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @ApiProperty({ example: 'Review Q4 reports' })
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  @ApiProperty({ required: false })
  description?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  @ApiProperty({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority?: TaskPriority;

  @IsISO8601()
  @IsOptional()
  @IsFutureDate()
  @ApiProperty({ example: '2024-12-31T23:59:59Z' })
  dueDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty({ example: ['urgent', 'review'] })
  labels?: string[];
}
```

## Authentication & Authorization

### JWT Strategy Implementation

```typescript
// strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
      issuer: 'aurelius-ai',
      audience: 'aurelius-users',
    });
  }

  async validate(payload: JwtPayload) {
    // Verify session
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    return {
      ...session.user,
      sessionId: session.id,
    };
  }
}
```

### Role-Based Access Control

```typescript
// decorators/roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// Usage in controller
@Post('admin/users/:id/suspend')
@Roles(Role.ADMIN)
async suspendUser(@Param('id') id: string) {
  return this.usersService.suspend(id);
}
```

## AI Integration

### Model Selection Strategy

```typescript
// services/model-selector.service.ts
@Injectable()
export class ModelSelectorService {
  private readonly modelConfig = {
    simple: { model: 'claude-3-haiku', maxTokens: 512 },
    standard: { model: 'claude-3-5-sonnet', maxTokens: 1024 },
    complex: { model: 'claude-3-opus', maxTokens: 2048 },
  };

  async selectModel(request: AiRequest): Promise<ModelConfig> {
    // Analyze request complexity
    const complexity = this.analyzeComplexity(request);
    
    // Check user tier for model access
    const userTier = await this.getUserTier(request.userId);
    
    // Select optimal model
    if (complexity < 0.3 && userTier !== 'PROFESSIONAL') {
      return this.modelConfig.simple;
    } else if (complexity < 0.7) {
      return this.modelConfig.standard;
    } else {
      return this.modelConfig.complex;
    }
  }

  private analyzeComplexity(request: AiRequest): number {
    let score = 0;
    
    // Length analysis
    score += Math.min(request.prompt.length / 1000, 0.3);
    
    // Context depth
    if (request.context?.history) score += 0.2;
    if (request.context?.documents) score += 0.2;
    
    // Task type complexity
    const complexTasks = ['analysis', 'generation', 'reasoning'];
    if (complexTasks.includes(request.type)) score += 0.3;
    
    return Math.min(score, 1);
  }
}
```

### Prompt Engineering

```typescript
// services/prompt.service.ts
@Injectable()
export class PromptService {
  async enhancePrompt(
    prompt: string,
    context: any,
    type: string,
  ): Promise<string> {
    const templates = {
      email_draft: this.emailDraftTemplate,
      task_analysis: this.taskAnalysisTemplate,
      calendar_suggestion: this.calendarTemplate,
    };

    const template = templates[type] || this.defaultTemplate;
    return template(prompt, context);
  }

  private emailDraftTemplate(prompt: string, context: any): string {
    return `
You are an AI assistant helping to draft professional emails.

Context:
- User's writing style: ${context.writingStyle || 'professional'}
- Previous emails in thread: ${context.threadHistory || 'none'}
- Recipient: ${context.recipient || 'unknown'}

Task: ${prompt}

Guidelines:
1. Match the user's typical writing style
2. Be concise and clear
3. Include appropriate greetings and sign-offs
4. Maintain professional tone unless specified otherwise

Response:`;
  }

  private taskAnalysisTemplate(prompt: string, context: any): string {
    return `
You are an AI task management assistant analyzing work items.

Current workload:
- Active tasks: ${context.activeTasks || 0}
- Upcoming deadlines: ${context.deadlines || 'none'}
- Team members: ${context.teamSize || 1}

Analysis request: ${prompt}

Provide:
1. Priority assessment (1-10)
2. Time estimate in hours
3. Suggested subtasks if applicable
4. Potential blockers or dependencies
5. Optimal scheduling recommendation

Format as JSON.`;
  }
}
```

## Real-time Features

### WebSocket Gateway

```typescript
// modules/websocket/websocket.gateway.ts
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
  namespace: '/ws',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const user = await this.authService.validateToken(token);
      
      if (!user) {
        client.disconnect();
        return;
      }

      // Track user connection
      client.data.userId = user.id;
      this.addUserSocket(user.id, client.id);
      
      // Join user-specific room
      client.join(`user:${user.id}`);
      
      // Send initial state
      client.emit('connected', {
        userId: user.id,
        timestamp: new Date(),
      });

      console.log(`User ${user.id} connected via WebSocket`);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.removeUserSocket(userId, client.id);
      console.log(`User ${userId} disconnected`);
    }
  }

  // Send to specific user
  async sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Broadcast to all users
  async broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  @SubscribeMessage('task:update')
  async handleTaskUpdate(
    @MessageBody() data: UpdateTaskDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    
    // Process update
    const updated = await this.tasksService.update(userId, data.id, data);
    
    // Notify user's other devices
    this.sendToUser(userId, 'task:updated', updated);
    
    return { success: true, task: updated };
  }

  private addUserSocket(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private removeUserSocket(userId: string, socketId: string) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }
}
```

## Caching Strategy

### Multi-Layer Cache Implementation

```typescript
// modules/cache/cache.service.ts
@Injectable()
export class CacheService {
  private memoryCache: LRUCache<string, any>;
  
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    this.memoryCache = new LRUCache({
      max: 10000,
      ttl: 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    // L1: Memory cache
    const memCached = this.memoryCache.get(key);
    if (memCached) return memCached;

    // L2: Redis cache
    const redisCached = await this.redis.get(key);
    if (redisCached) {
      const parsed = JSON.parse(redisCached);
      this.memoryCache.set(key, parsed);
      return parsed;
    }

    return null;
  }

  async set(key: string, value: any, options: CacheOptions = {}) {
    const ttl = options.ttl || 3600;
    
    // Set in both layers
    this.memoryCache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
    
    // Handle tags for invalidation
    if (options.tags) {
      for (const tag of options.tags) {
        await this.redis.sadd(`tag:${tag}`, key);
        await this.redis.expire(`tag:${tag}`, ttl);
      }
    }
  }

  async invalidateTag(tag: string) {
    const keys = await this.redis.smembers(`tag:${tag}`);
    
    if (keys.length > 0) {
      keys.forEach(key => this.memoryCache.delete(key));
      await this.redis.del(...keys);
      await this.redis.del(`tag:${tag}`);
    }
  }
}
```

### Cache Decorators

```typescript
// decorators/cache.decorator.ts
export function Cacheable(options: CacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService || this.cache;
      if (!cacheService) {
        return originalMethod.apply(this, args);
      }

      const key = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      const cached = await cacheService.get(key);
      
      if (cached) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      await cacheService.set(key, result, options);
      
      return result;
    };

    return descriptor;
  };
}

// Usage
@Injectable()
export class TasksService {
  @Cacheable({ ttl: 300, tags: ['tasks'] })
  async findAll(userId: string, filters: any) {
    return this.prisma.task.findMany({
      where: { userId, ...filters },
    });
  }
}
```

## Queue Management

### Bull Queue Configuration

```typescript
// modules/queue/processors/ai-request.processor.ts
@Processor('ai-processing')
export class AiRequestProcessor {
  constructor(
    private readonly aiGateway: AiGatewayService,
    private readonly websocket: WebsocketGateway,
  ) {}

  @Process('process-request')
  async handleAiRequest(job: Job<AiRequestJob>) {
    const { userId, request } = job.data;
    
    try {
      // Update job progress
      await job.progress(10);
      
      // Process AI request
      const response = await this.aiGateway.processRequest(request);
      await job.progress(90);
      
      // Notify user via WebSocket
      await this.websocket.sendToUser(userId, 'ai:response', {
        requestId: request.id,
        response,
      });
      
      await job.progress(100);
      return response;
    } catch (error) {
      console.error('AI processing error:', error);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onComplete(job: Job, result: any) {
    console.log(`Job ${job.id} completed`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error) {
    console.error(`Job ${job.id} failed:`, error);
  }
}
```

### Background Job Patterns

```typescript
// Scheduled jobs
@Injectable()
export class ScheduledTasksService {
  constructor(
    @InjectQueue('scheduled') private scheduledQueue: Queue,
  ) {}

  @Cron('0 9 * * *') // Daily at 9 AM
  async dailyDigest() {
    const users = await this.getActiveUsers();
    
    for (const user of users) {
      await this.scheduledQueue.add('daily-digest', {
        userId: user.id,
        timezone: user.timezone,
      }, {
        delay: this.getDelayForTimezone(user.timezone),
      });
    }
  }

  @Cron('*/15 * * * *') // Every 15 minutes
  async syncIntegrations() {
    const integrations = await this.getActiveIntegrations();
    
    const jobs = integrations.map(integration => ({
      name: 'sync-integration',
      data: { integrationId: integration.id },
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }));
    
    await this.scheduledQueue.addBulk(jobs);
  }
}
```

## Error Handling

### Global Exception Filter

```typescript
// filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: Logger,
    private readonly config: ConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Unknown error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = exceptionResponse['message'] || message;
        error = exceptionResponse['error'] || error;
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      message = this.handlePrismaError(exception);
      error = 'Database error';
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Log error
    this.logger.error({
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      status,
      error,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
      body: request.body,
      user: request['user']?.id,
    });

    // Send error response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error,
      message,
      requestId: request['id'],
    });
  }

  private handlePrismaError(error: PrismaClientKnownRequestError): string {
    switch (error.code) {
      case 'P2002':
        return `Duplicate value for ${error.meta?.target}`;
      case 'P2025':
        return 'Record not found';
      case 'P2003':
        return 'Foreign key constraint failed';
      default:
        return 'Database operation failed';
    }
  }
}
```

### Circuit Breaker Pattern

```typescript
// decorators/circuit-breaker.decorator.ts
export function CircuitBreaker(options: CircuitBreakerOptions = {}) {
  const threshold = options.threshold || 5;
  const timeout = options.timeout || 60000;
  const resetTimeout = options.resetTimeout || 30000;
  
  let failures = 0;
  let lastFailureTime = 0;
  let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Check if circuit is open
      if (state === 'OPEN') {
        if (Date.now() - lastFailureTime > resetTimeout) {
          state = 'HALF_OPEN';
        } else {
          throw new ServiceUnavailableException('Service temporarily unavailable');
        }
      }

      try {
        const result = await Promise.race([
          originalMethod.apply(this, args),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          ),
        ]);

        // Reset on success
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }

        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();

        if (failures >= threshold) {
          state = 'OPEN';
        }

        throw error;
      }
    };

    return descriptor;
  };
}
```

## Testing

### Unit Testing

```typescript
// services/__tests__/tasks.service.spec.ts
describe('TasksService', () => {
  let service: TasksService;
  let prisma: DeepMockProxy<PrismaClient>;
  let cache: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useFactory: () => mockDeep<PrismaClient>(),
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            invalidateTag: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get(PrismaService);
    cache = module.get(CacheService);
  });

  describe('create', () => {
    it('should create a task with AI suggestions', async () => {
      const userId = 'user123';
      const dto: CreateTaskDto = {
        title: 'Review Q4 reports',
        description: 'Analyze quarterly performance',
      };

      const mockTask = {
        id: 'task123',
        ...dto,
        userId,
        aiSuggested: true,
        aiConfidence: 0.85,
      };

      prisma.task.create.mockResolvedValue(mockTask);

      const result = await service.create(userId, dto);

      expect(result).toEqual(mockTask);
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          title: dto.title,
        }),
      });
      expect(cache.invalidateTag).toHaveBeenCalledWith(`tasks:${userId}`);
    });
  });
});
```

### Integration Testing

```typescript
// controllers/__tests__/tasks.e2e-spec.ts
describe('TasksController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();

    // Create test user and get auth token
    const user = await createTestUser(prisma);
    authToken = await getAuthToken(app, user);
  });

  afterAll(async () => {
    await prisma.cleanDatabase();
    await app.close();
  });

  describe('/api/v1/tasks (GET)', () => {
    it('should return user tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('/api/v1/tasks (POST)', () => {
    it('should create a new task', async () => {
      const createDto = {
        title: 'Test task',
        priority: 'high',
        dueDate: '2024-12-31T23:59:59Z',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: createDto.title,
        priority: createDto.priority,
      });
    });
  });
});
```

## Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

EXPOSE 4000

CMD ["node", "dist/main"]
```

### Environment Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/aurelius
      - REDIS_URL=redis://redis:6379
    ports:
      - "4000:4000"
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: pgvector/pgvector:pg15
    environment:
      - POSTGRES_DB=aurelius
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redispassword
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Monitoring & Logging

### Logging Configuration

```typescript
// config/winston.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const winstonConfig = WinstonModule.createLogger({
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta) : ''
          }`;
        }),
      ),
    }),
    
    // File transport for errors
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    
    // File transport for all logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
    }),
  ],
});
```

### Health Checks

```typescript
// modules/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      () => this.checkExternalAPIs(),
    ]);
  }

  private async checkExternalAPIs(): Promise<HealthIndicatorResult> {
    const checks = await Promise.all([
      this.checkAnthropic(),
      this.checkStripe(),
    ]);

    return {
      external_apis: {
        status: checks.every(c => c.status === 'up') ? 'up' : 'down',
        details: checks,
      },
    };
  }
}
```

## Best Practices

### Code Organization

1. **Single Responsibility**: Each service handles one domain
2. **Dependency Injection**: Use NestJS DI for loose coupling
3. **Interface Segregation**: Define clear interfaces for services
4. **Error Boundaries**: Handle errors at appropriate levels

### Performance Guidelines

1. **Database Queries**: Use indexes and limit eager loading
2. **Caching**: Cache expensive operations
3. **Async Operations**: Use queues for heavy processing
4. **Connection Pooling**: Configure appropriate pool sizes

### Security Practices

1. **Input Validation**: Validate all user inputs
2. **SQL Injection**: Use parameterized queries (Prisma handles this)
3. **Rate Limiting**: Implement appropriate limits
4. **Secrets Management**: Use environment variables
5. **CORS**: Configure allowed origins properly