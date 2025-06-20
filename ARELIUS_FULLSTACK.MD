# Aurelius AI Personal Assistant - Complete Implementation Guide for Claude Code

## PROJECT INITIALIZATION

### Step 1: Create Project Structure

```bash
mkdir aurelius-ai
cd aurelius-ai
mkdir aurelius-frontend aurelius-backend
```

### Step 2: Initialize Frontend (Next.js 14)

```bash
cd aurelius-frontend
npx create-next-app@14.2.5 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install exact dependencies
npm install --save-exact \
  @radix-ui/react-alert-dialog@1.0.5 \
  @radix-ui/react-dialog@1.0.5 \
  @radix-ui/react-dropdown-menu@2.0.6 \
  @radix-ui/react-label@2.0.2 \
  @radix-ui/react-popover@1.0.7 \
  @radix-ui/react-progress@1.0.3 \
  @radix-ui/react-select@2.0.0 \
  @radix-ui/react-slot@1.0.2 \
  @radix-ui/react-tabs@1.0.4 \
  @radix-ui/react-toast@1.1.5 \
  @radix-ui/react-tooltip@1.0.7 \
  @radix-ui/react-switch@1.0.3 \
  @radix-ui/react-separator@1.0.3 \
  @radix-ui/react-avatar@1.0.4 \
  @radix-ui/react-checkbox@1.0.4 \
  class-variance-authority@0.7.0 \
  clsx@2.1.0 \
  lucide-react@0.309.0 \
  tailwind-merge@2.2.0 \
  zustand@4.4.7 \
  socket.io-client@4.7.2 \
  recharts@2.10.3 \
  react-hook-form@7.48.2 \
  zod@3.22.4 \
  @hookform/resolvers@3.3.2 \
  framer-motion@10.17.9 \
  next-auth@5.0.0-beta.4 \
  @next-auth/prisma-adapter@1.0.7 \
  date-fns@3.0.6 \
  sonner@1.3.1 \
  @tanstack/react-query@5.17.0 \
  react-dropzone@14.2.3 \
  cmdk@0.2.0

# Dev dependencies
npm install --save-dev --save-exact \
  @types/node@20.10.6 \
  @types/react@18.2.46 \
  @types/react-dom@18.2.18 \
  prettier@3.1.1 \
  @typescript-eslint/eslint-plugin@6.17.0 \
  @typescript-eslint/parser@6.17.0 \
  @types/lodash@4.14.202
```

### Step 3: Initialize Backend (NestJS)

```bash
cd ../aurelius-backend
npx @nestjs/cli@10.2.1 new . --package-manager npm --skip-install

# Install exact dependencies
npm install --save-exact \
  @nestjs/common@10.3.0 \
  @nestjs/core@10.3.0 \
  @nestjs/platform-express@10.3.0 \
  @nestjs/config@3.1.1 \
  @nestjs/jwt@10.2.0 \
  @nestjs/passport@10.0.3 \
  @nestjs/platform-socket.io@10.3.0 \
  @nestjs/websockets@10.3.0 \
  @nestjs/throttler@5.1.1 \
  @nestjs/schedule@4.0.0 \
  @nestjs/swagger@7.1.17 \
  @nestjs/bull@10.0.1 \
  @prisma/client@5.7.1 \
  prisma@5.7.1 \
  bcrypt@5.1.1 \
  passport@0.7.0 \
  passport-google-oauth20@2.0.0 \
  passport-jwt@4.0.1 \
  passport-local@1.0.0 \
  class-validator@0.14.0 \
  class-transformer@0.5.1 \
  helmet@7.1.0 \
  socket.io@4.7.2 \
  stripe@14.10.0 \
  @anthropic-ai/sdk@0.10.2 \
  openai@4.24.1 \
  elevenlabs@0.2.2 \
  bull@4.11.5 \
  @bull-board/express@5.10.2 \
  @bull-board/api@5.10.2 \
  ioredis@5.3.2 \
  winston@3.11.0 \
  winston-daily-rotate-file@4.7.1 \
  lru-cache@10.1.0 \
  multer@1.4.5-lts.1 \
  compression@1.7.4 \
  express-rate-limit@7.1.5 \
  @sentry/node@7.91.0 \
  @sentry/profiling-node@7.91.0

# Dev dependencies
npm install --save-dev --save-exact \
  @types/bcrypt@5.0.2 \
  @types/passport-google-oauth20@2.0.14 \
  @types/passport-jwt@4.0.0 \
  @types/passport-local@1.0.38 \
  @types/multer@1.4.11 \
  @types/compression@1.7.5 \
  @nestjs/testing@10.3.0 \
  jest@29.7.0 \
  supertest@6.3.3 \
  @types/jest@29.5.11 \
  @types/supertest@6.0.2 \
  ts-node@10.9.2
```

## BACKEND IMPLEMENTATION

### Create Exact File Structure

```bash
cd aurelius-backend/src
mkdir -p \
  modules/auth/strategies \
  modules/auth/guards \
  modules/auth/decorators \
  modules/auth/dto \
  modules/users/dto \
  modules/users/entities \
  modules/billing/dto \
  modules/billing/entities \
  modules/integrations/base \
  modules/integrations/google \
  modules/integrations/microsoft \
  modules/integrations/slack \
  modules/ai-gateway/prompts \
  modules/ai-gateway/dto \
  modules/voice/dto \
  modules/voice/processors \
  modules/tasks/dto \
  modules/tasks/entities \
  modules/calendar/dto \
  modules/calendar/entities \
  modules/email/dto \
  modules/email/templates \
  modules/websocket/gateways \
  modules/cache/services \
  modules/cache/decorators \
  modules/analytics/dto \
  modules/analytics/services \
  modules/queue/processors \
  modules/queue/services \
  modules/notifications/dto \
  modules/notifications/services \
  common/decorators \
  common/filters \
  common/guards \
  common/interceptors \
  common/pipes \
  common/exceptions \
  config \
  utils \
  types
```

### Create prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "fullTextSearch"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [pgvector(map: "vector"), pg_trgm]
}

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  avatar          String?
  
  // OAuth providers
  googleId        String?  @unique
  microsoftId     String?  @unique
  appleId         String?  @unique
  
  // Authentication
  emailVerified   DateTime?
  passwordHash    String?  @db.Text
  
  // Subscription & Usage
  subscription    Subscription?
  stripeCustomerId String?  @unique
  currentUsage    Usage?
  
  // Voice preferences
  voiceId         String   @default("rachel")
  voiceSpeed      Float    @default(1.0)
  voicePitch      Float    @default(1.0)
  preferredInput  String   @default("both") // text, voice, both
  voiceLanguage   String   @default("en-US")
  
  // Notification preferences
  emailNotifications    Boolean @default(true)
  pushNotifications     Boolean @default(true)
  smsNotifications      Boolean @default(false)
  notificationFrequency String  @default("instant") // instant, hourly, daily
  
  // Security
  mfaEnabled      Boolean  @default(false)
  mfaSecret       String?  @db.Text
  sessions        Session[]
  
  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  lastActiveAt    DateTime?
  deletedAt       DateTime?
  preferences     Json     @default("{}")
  timezone        String   @default("UTC")
  
  // Relations
  integrations    Integration[]
  tasks           Task[]
  events          CalendarEvent[]
  emails          Email[]
  embeddings      VectorEmbedding[]
  actionLogs      ActionLog[]
  usageHistory    UsageHistory[]
  notifications   Notification[]
  aiMemories      AIMemory[]
  
  @@index([email])
  @@index([stripeCustomerId])
  @@index([lastActiveAt])
  @@index([deletedAt])
}

model Session {
  id            String   @id @default(cuid())
  sessionToken  String   @unique
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userAgent     String?
  ipAddress     String?
  expires       DateTime
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([expires])
}

model Subscription {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  tier                  Tier     @default(PROFESSIONAL)
  status                Status   @default(ACTIVE)
  
  // Stripe
  stripeCustomerId      String   @unique
  stripeSubscriptionId  String   @unique
  stripePriceId         String
  
  // Billing
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  cancelAtPeriodEnd     Boolean  @default(false)
  canceledAt            DateTime?
  
  // Limits based on tier
  monthlyActionLimit    Int      // 1000, 1500, or 2000
  integrationLimit      Int      // 10, 20, or unlimited (-1)
  aiModelAccess         String[] // ["claude-3-haiku", "claude-3.5-sonnet", etc]
  
  // Features
  voiceEnabled          Boolean  @default(true)
  advancedAnalytics     Boolean  @default(false)
  teamFeatures          Boolean  @default(false)
  customIntegrations    Boolean  @default(false)
  prioritySupport       Boolean  @default(false)
  
  // Pricing
  monthlyPrice          Float
  overageRate           Float    // 0.06, 0.066, or 0.10 per action
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([status, currentPeriodEnd])
  @@index([stripeSubscriptionId])
}

model Usage {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Current period
  periodStart           DateTime
  periodEnd             DateTime
  
  // Action allocation & usage
  monthlyAllocation     Int
  actionsUsed           Int      @default(0)
  actionsRemaining      Int      // Computed: monthlyAllocation - actionsUsed
  overageActions        Int      @default(0)
  
  // Breakdown by type
  textActions           Int      @default(0)
  voiceActions          Int      @default(0)
  emailActions          Int      @default(0)
  calendarActions       Int      @default(0)
  workflowActions       Int      @default(0)
  integrationActions    Int      @default(0)
  aiAnalysisActions     Int      @default(0)
  
  // Model usage breakdown
  haikuActions          Int      @default(0)
  sonnetActions         Int      @default(0)
  opusActions           Int      @default(0)
  
  // Costs
  overageCost           Decimal  @db.Decimal(10, 2) @default(0)
  estimatedTotal        Decimal  @db.Decimal(10, 2) @default(0)
  
  // Performance metrics
  cacheHitRate          Float    @default(0)
  averageResponseTime   Int      @default(0) // milliseconds
  
  updatedAt             DateTime @updatedAt
  
  @@index([userId, periodStart])
  @@index([periodEnd])
}

model UsageHistory {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  periodStart       DateTime
  periodEnd         DateTime
  actionsAlloted    Int
  actionsUsed       Int
  overageActions    Int      @default(0)
  overageCost       Decimal  @db.Decimal(10, 2) @default(0)
  
  // Detailed breakdown
  breakdown         Json     // Detailed usage by type and model
  
  invoiceId         String?  // Stripe invoice ID
  paidAt            DateTime?
  
  createdAt         DateTime @default(now())
  
  @@unique([userId, periodStart])
  @@index([userId, periodEnd])
  @@index([invoiceId])
}

model ActionLog {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Action details
  type              String   // voice_command, text_command, email_draft, etc.
  subtype           String?
  category          String   // ai, integration, automation, etc.
  
  // Request/Response
  input             String?  @db.Text
  output            String?  @db.Text
  metadata          Json     @default("{}")
  
  // Cache info
  fromCache         Boolean  @default(false)
  cacheKey          String?
  cacheHit          Boolean  @default(false)
  
  // AI details
  model             String?  // claude-3-haiku, claude-3-5-sonnet, etc.
  promptTokens      Int?
  completionTokens  Int?
  totalTokens       Int?
  cost              Decimal? @db.Decimal(10, 6)
  
  // Performance
  duration          Int?     // milliseconds
  queueTime         Int?     // milliseconds
  processingTime    Int?     // milliseconds
  
  // Status & Error handling
  status            String   @default("success") // success, failed, partial, timeout
  error             String?  @db.Text
  retryCount        Int      @default(0)
  
  // Tracking
  sessionId         String?
  traceId           String?
  parentActionId    String?  // For tracking related actions
  
  createdAt         DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([type, createdAt])
  @@index([fromCache])
  @@index([status])
  @@index([sessionId])
  @@index([traceId])
}

model Integration {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  provider          String   // google-gmail, google-calendar, microsoft-teams, slack, etc.
  providerAccountId String?  // External account ID
  
  // Encrypted tokens
  accessToken       String   @db.Text
  refreshToken      String?  @db.Text
  tokenExpiry       DateTime?
  tokenType         String?  // Bearer, etc.
  
  // Integration status
  status            String   @default("active") // active, expired, error, disabled
  lastSyncAt        DateTime?
  nextSyncAt        DateTime?
  syncError         String?  @db.Text
  errorCount        Int      @default(0)
  
  // Permissions & Scopes
  scopes            String[]
  permissions       Json     @default("{}")
  
  // Metadata
  settings          Json     @default("{}")
  accountEmail      String?  // The email/account connected
  accountName       String?
  webhookUrl        String?
  webhookSecret     String?
  
  // Sync settings
  syncEnabled       Boolean  @default(true)
  syncFrequency     Int      @default(300) // seconds
  lastSyncedItemId  String?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([userId, provider])
  @@index([userId, status])
  @@index([provider, lastSyncAt])
  @@index([nextSyncAt])
}

model Task {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title             String
  description       String?  @db.Text
  status            String   @default("pending") // pending, in_progress, completed, cancelled
  priority          String   @default("medium") // low, medium, high, urgent
  
  // Dates
  dueDate           DateTime?
  startDate         DateTime?
  completedAt       DateTime?
  
  // AI-generated fields
  aiSuggested       Boolean  @default(false)
  aiReason          String?  @db.Text
  aiConfidence      Float?   // 0-1 confidence score
  smartScheduled    Boolean  @default(false)
  
  // Organization
  labels            String[]
  projectId         String?
  project           Project? @relation(fields: [projectId], references: [id])
  parentId          String?  // For subtasks
  parentTask        Task?    @relation("TaskSubtasks", fields: [parentId], references: [id])
  subtasks          Task[]   @relation("TaskSubtasks")
  
  // Integration references
  externalId        String?  // ID in external system
  externalProvider  String?  // google-tasks, microsoft-todo, etc.
  
  // Metadata
  estimatedMinutes  Int?
  actualMinutes     Int?
  attachments       Json     @default("[]")
  
  // Recurrence
  isRecurring       Boolean  @default(false)
  recurrenceRule    String?  // RRULE format
  recurrenceEndDate DateTime?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?
  
  @@index([userId, status])
  @@index([userId, dueDate])
  @@index([projectId])
  @@index([externalProvider, externalId])
  @@index([deletedAt])
}

model Project {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  color       String   @default("#6366f1")
  icon        String?
  isArchived  Boolean  @default(false)
  
  tasks       Task[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([userId, name])
  @@index([userId, isArchived])
}

model CalendarEvent {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title             String
  description       String?  @db.Text
  location          String?
  
  // Time
  startTime         DateTime
  endTime           DateTime
  allDay            Boolean  @default(false)
  timezone          String   @default("UTC")
  
  // Attendees
  attendees         Json     @default("[]") // Array of {email, name, status}
  organizer         String?
  
  // Status
  status            String   @default("confirmed") // confirmed, tentative, cancelled
  responseStatus    String   @default("accepted") // accepted, declined, tentative, needsAction
  
  // AI features
  aiGenerated       Boolean  @default(false)
  aiSuggestions     Json?    // Travel time, preparation tasks, etc.
  smartReminders    Json     @default("[]")
  
  // Integration
  externalId        String?
  externalProvider  String?  // google-calendar, outlook, etc.
  conferenceData    Json?    // Video meeting links
  
  // Recurrence
  isRecurring       Boolean  @default(false)
  recurrenceRule    String?
  recurringEventId  String?  // Parent recurring event
  
  // Metadata
  color             String?
  visibility        String   @default("default") // default, public, private
  reminders         Json     @default("[]")
  attachments       Json     @default("[]")
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?
  
  @@index([userId, startTime])
  @@index([userId, endTime])
  @@index([externalProvider, externalId])
  @@index([deletedAt])
}

model Email {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Email data
  messageId         String?  @unique
  threadId          String?
  
  from              String
  to                String[]
  cc                String[]
  bcc               String[]
  subject           String
  body              String   @db.Text
  bodyHtml          String?  @db.Text
  
  // Status
  status            String   @default("draft") // draft, sent, received, archived
  isRead            Boolean  @default(false)
  isStarred         Boolean  @default(false)
  isImportant       Boolean  @default(false)
  
  // AI features
  aiDrafted         Boolean  @default(false)
  aiSummary         String?  @db.Text
  aiCategory        String?  // personal, work, promotional, etc.
  aiPriority        Int      @default(0) // 0-10
  sentiment         String?  // positive, negative, neutral
  
  // Metadata
  labels            String[]
  attachments       Json     @default("[]")
  headers           Json?
  
  // Integration
  externalId        String?
  externalProvider  String?
  
  // Timestamps
  sentAt            DateTime?
  receivedAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime?
  
  @@index([userId, status])
  @@index([userId, receivedAt])
  @@index([threadId])
  @@index([externalProvider, externalId])
  @@index([deletedAt])
}

model VectorEmbedding {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  contentType       String   // email, task, document, voice_transcript, calendar_event
  contentId         String   // Reference to original content
  contentHash       String   // For deduplication
  
  // pgvector - 1536 dimensions for OpenAI, 1024 for Claude
  embedding         Unsupported("vector(1536)")
  
  // Original content preview
  content           String   @db.Text
  contentSummary    String?  @db.Text
  
  // Metadata for filtering
  metadata          Json
  tags              String[]
  
  // Embedding model info
  model             String   // text-embedding-3-small, claude-3-haiku, etc.
  dimensions        Int      @default(1536)
  
  createdAt         DateTime @default(now())
  expiresAt         DateTime // Auto-cleanup old embeddings
  lastAccessedAt    DateTime @default(now())
  
  @@unique([contentHash, userId])
  @@index([userId, contentType])
  @@index([expiresAt])
  @@index([lastAccessedAt])
}

model AIMemory {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type              String   // preference, fact, pattern, feedback
  category          String   // communication, scheduling, tasks, etc.
  
  content           String   @db.Text
  context           Json     @default("{}")
  
  // Learning metadata
  confidence        Float    @default(0.5) // 0-1
  occurrences       Int      @default(1)
  lastOccurrence    DateTime @default(now())
  
  // Validation
  isVerified        Boolean  @default(false)
  verifiedAt        DateTime?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  expiresAt         DateTime?
  
  @@index([userId, type])
  @@index([userId, category])
  @@index([confidence])
}

model Notification {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type              String   // task_reminder, event_reminder, ai_suggestion, etc.
  priority          String   @default("normal") // low, normal, high, urgent
  
  title             String
  message           String   @db.Text
  
  // Delivery
  channels          String[] // email, push, sms, in-app
  deliveredChannels String[] @default([])
  
  // Status
  isRead            Boolean  @default(false)
  isActioned        Boolean  @default(false)
  
  // Related entities
  relatedType       String?  // task, event, email, etc.
  relatedId         String?
  
  // Actions
  actions           Json     @default("[]") // [{label, action, data}]
  
  // Scheduling
  scheduledFor      DateTime?
  sentAt            DateTime?
  readAt            DateTime?
  
  createdAt         DateTime @default(now())
  expiresAt         DateTime?
  
  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@index([scheduledFor])
}

// Enums
enum Tier {
  PROFESSIONAL  // $30 - 1000 actions
  TEAM          // $50 - 1500 actions  
  ENTERPRISE    // $100 - 2000 actions
}

enum Status {
  ACTIVE
  CANCELED
  PAST_DUE
  TRIALING
  PAUSED
}
```

### Create .env file

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/aurelius?schema=public"
REDIS_URL="redis://localhost:6379"

# Application
NODE_ENV="development"
PORT=4000
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:4000"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-jwt-key-change-this"
JWT_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
NEXTAUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
APPLE_CLIENT_ID="your-apple-client-id"
APPLE_CLIENT_SECRET="your-apple-client-secret"

# Stripe
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
STRIPE_PRICE_ID_PROFESSIONAL="price_professional"
STRIPE_PRICE_ID_TEAM="price_team"
STRIPE_PRICE_ID_ENTERPRISE="price_enterprise"

# AI Services
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"
OPENAI_API_KEY="sk-your-openai-key"
ELEVENLABS_API_KEY="your-elevenlabs-key"
DEEPGRAM_API_KEY="your-deepgram-key"

# Email
SENDGRID_API_KEY="your-sendgrid-key"
FROM_EMAIL="noreply@aurelius.ai"
SUPPORT_EMAIL="support@aurelius.ai"

# Storage
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_BUCKET_NAME="aurelius-storage"
AWS_REGION="us-east-1"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
LOGTAIL_SOURCE_TOKEN="your-logtail-token"

# Feature Flags
ENABLE_VOICE_FEATURES="true"
ENABLE_ADVANCED_AI="true"
ENABLE_TEAM_FEATURES="false"

# Rate Limiting
RATE_LIMIT_TTL="60"
RATE_LIMIT_MAX="100"
```

### Create src/app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BillingModule } from './modules/billing/billing.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { VoiceModule } from './modules/voice/voice.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { EmailModule } from './modules/email/email.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { CacheModule } from './modules/cache/cache.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { QueueModule } from './modules/queue/queue.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    BillingModule,
    IntegrationsModule,
    AiGatewayModule,
    VoiceModule,
    TasksModule,
    CalendarModule,
    EmailModule,
    WebsocketModule,
    CacheModule,
    AnalyticsModule,
    QueueModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
```

### Create src/config/configuration.ts

```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRY || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL,
      team: process.env.STRIPE_PRICE_ID_TEAM,
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    },
  },
  ai: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY,
    },
  },
  features: {
    voice: process.env.ENABLE_VOICE_FEATURES === 'true',
    advancedAi: process.env.ENABLE_ADVANCED_AI === 'true',
    team: process.env.ENABLE_TEAM_FEATURES === 'true',
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
});
```

### Create src/modules/prisma/prisma.module.ts

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Create src/modules/prisma/prisma.service.ts

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as any, (e: Prisma.QueryEvent) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not allowed in production');
    }

    const models = Prisma.dmmf.datamodel.models;
    const modelNames = models.map((model) => model.name);

    return Promise.all(
      modelNames.map((modelName) => {
        return this[modelName.charAt(0).toLowerCase() + modelName.slice(1)].deleteMany();
      }),
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }
}
```

### Create src/modules/auth/auth.module.ts

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { UsersModule } from '../users/users.module';
import { IntegrationsModule } from '../integrations/integrations.module';

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

### Create src/modules/auth/auth.service.ts

```typescript
import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { User, Session } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

interface TokenPayload {
  sub: string;
  email: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly integrationsService: IntegrationsService,
    private readonly prisma: PrismaService,
  ) {}

  async validateOAuthUser(profile: any, provider: string): Promise<User> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new BadRequestException('No email found in OAuth profile');
    }

    const providerId = profile.id;
    const providerIdField = `${provider}Id`;

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Create new user
      user = await this.usersService.create({
        email,
        name: profile.displayName || profile.name?.givenName,
        avatar: profile.photos?.[0]?.value,
        [providerIdField]: providerId,
        emailVerified: new Date(), // OAuth users are considered verified
      });

      this.logger.log(`New user created via ${provider}: ${email}`);
    } else if (!user[providerIdField]) {
      // Link existing user to OAuth provider
      user = await this.usersService.update(user.id, {
        [providerIdField]: providerId,
        emailVerified: user.emailVerified || new Date(),
      });

      this.logger.log(`Existing user linked to ${provider}: ${email}`);
    }

    // Update last active
    await this.usersService.updateLastActive(user.id);

    return user;
  }

  async generateTokens(user: User, metadata?: { userAgent?: string; ipAddress?: string }): Promise<AuthTokens> {
    // Create session
    const session = await this.createSession(user.id, metadata);

    const payload: TokenPayload = { 
      sub: user.id, 
      email: user.email,
      sessionId: session.id,
      type: 'access',
    };

    const refreshPayload: TokenPayload = {
      ...payload,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer',
    };
  }

  async refreshTokens(refreshToken: string, metadata?: { userAgent?: string; ipAddress?: string }): Promise<AuthTokens> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify session is still valid
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: { user: true },
      });

      if (!session || session.expires < new Date()) {
        throw new UnauthorizedException('Session expired');
      }

      // Update session expiry
      await this.prisma.session.update({
        where: { id: session.id },
        data: { 
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          userAgent: metadata?.userAgent || session.userAgent,
          ipAddress: metadata?.ipAddress || session.ipAddress,
        },
      });

      return this.generateTokens(session.user, metadata);
    } catch (error) {
      this.logger.error('Failed to refresh tokens', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async createSession(userId: string, metadata?: { userAgent?: string; ipAddress?: string }): Promise<Session> {
    const sessionToken = uuidv4();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    if (exceptSessionId) {
      await this.prisma.session.deleteMany({
        where: {
          userId,
          id: { not: exceptSessionId },
        },
      });
    } else {
      await this.prisma.session.deleteMany({
        where: { userId },
      });
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user || !user.passwordHash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return null;
    }

    await this.usersService.updateLastActive(user.id);
    return user;
  }

  async register(email: string, password: string, name?: string): Promise<User> {
    // Check if user exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.usersService.create({
      email,
      name,
      passwordHash,
    });

    this.logger.log(`New user registered: ${email}`);
    return user;
  }

  async storeIntegrationTokens(
    userId: string,
    provider: string,
    tokens: {
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
      scope?: string;
    },
  ): Promise<void> {
    const tokenExpiry = tokens.expiresIn 
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : undefined;

    await this.integrationsService.upsert({
      userId,
      provider,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry,
      scopes: tokens.scope ? tokens.scope.split(' ') : [],
      status: 'active',
    });
  }
}
```

### Create src/modules/auth/auth.controller.ts

```typescript
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Req, 
  Res, 
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Headers,
  Ip,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { User } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 requests per 5 minutes
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    const user = await this.authService.register(dto.email, dto.password, dto.name);
    const tokens = await this.authService.generateTokens(user, { userAgent, ipAddress });
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const tokens = await this.authService.generateTokens(user, { userAgent, ipAddress });
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth' })
  async googleAuth() {
    // Initiates Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(
    @Req() req: Request & { user: User },
    @Res() res: Response,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    const tokens = await this.authService.generateTokens(req.user, { userAgent, ipAddress });
    const frontendUrl = this.configService.get('FRONTEND_URL');
    
    // Redirect with tokens in URL (consider using state parameter for security)
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
    redirectUrl.searchParams.append('accessToken', tokens.accessToken);
    redirectUrl.searchParams.append('refreshToken', tokens.refreshToken);
    
    res.redirect(redirectUrl.toString());
  }

  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Initiate Microsoft OAuth' })
  async microsoftAuth() {
    // Initiates Microsoft OAuth
  }

  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Microsoft OAuth callback' })
  async microsoftAuthCallback(
    @Req() req: Request & { user: User },
    @Res() res: Response,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    const tokens = await this.authService.generateTokens(req.user, { userAgent, ipAddress });
    const frontendUrl = this.configService.get('FRONTEND_URL');
    
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
    redirectUrl.searchParams.append('accessToken', tokens.accessToken);
    redirectUrl.searchParams.append('refreshToken', tokens.refreshToken);
    
    res.redirect(redirectUrl.toString());
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    return this.authService.refreshTokens(dto.refreshToken, { userAgent, ipAddress });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke session' })
  async logout(
    @CurrentUser() user: User & { sessionId: string },
  ) {
    await this.authService.revokeSession(user.sessionId);
    return { message: 'Successfully logged out' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAll(
    @CurrentUser() user: User & { sessionId: string },
  ) {
    await this.authService.revokeAllUserSessions(user.id);
    return { message: 'Successfully logged out from all devices' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user' })
  async getCurrentUser(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  }
}
```

### Create src/modules/auth/dto/index.ts

```typescript
import { IsEmail, IsString, MinLength, IsOptional, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, number/special character',
  })
  password: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

### Create src/modules/auth/strategies/google.strategy.ts

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: `${configService.get('BACKEND_URL')}/auth/google/callback`,
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/tasks',
      ],
      accessType: 'offline',
      prompt: 'consent',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const user = await this.authService.validateOAuthUser(profile, 'google');
      
      // Store Google tokens for API access
      await this.authService.storeIntegrationTokens(user.id, 'google-gmail', {
        accessToken,
        refreshToken,
        scope: this.scope.join(' '),
      });

      // Store calendar integration separately
      await this.authService.storeIntegrationTokens(user.id, 'google-calendar', {
        accessToken,
        refreshToken,
        scope: this.scope.join(' '),
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
}
```

### Create src/modules/auth/strategies/jwt.strategy.ts

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

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
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Verify session
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      throw new UnauthorizedException('Session expired or not found');
    }

    // Return user with sessionId attached
    return {
      ...session.user,
      sessionId: session.id,
    };
  }
}
```

### Create src/modules/auth/guards/jwt-auth.guard.ts

```typescript
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized access');
    }
    return user;
  }
}
```

### Create src/modules/auth/decorators/current-user.decorator.ts

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export interface AuthenticatedUser extends User {
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser, ctx: ExecutionContext): AuthenticatedUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    return data ? user?.[data] : user;
  },
);
```

### Create src/modules/auth/decorators/public.decorator.ts

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### Create src/modules/billing/billing.module.ts

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { StripeService } from './stripe.service';
import { UsageService } from './usage.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'billing',
    }),
    forwardRef(() => WebsocketModule),
    NotificationsModule,
  ],
  providers: [BillingService, StripeService, UsageService],
  controllers: [BillingController],
  exports: [BillingService, UsageService],
})
export class BillingModule {}
```

### Create src/modules/billing/usage.service.ts

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { Subscription, Usage, User } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';

interface UsageUpdate {
  type: string;
  count?: number;
  metadata?: Record<string, any>;
}

interface UsageStats {
  currentPeriod: {
    start: Date;
    end: Date;
    allocation: number;
    used: number;
    remaining: number;
    percentage: number;
    overageActions: number;
    overageCost: Decimal;
  };
  breakdown: {
    text: number;
    voice: number;
    email: number;
    calendar: number;
    workflow: number;
    integration: number;
    aiAnalysis: number;
  };
  modelUsage: {
    haiku: number;
    sonnet: number;
    opus: number;
  };
  performance: {
    cacheHitRate: number;
    avgResponseTime: number;
  };
  projections: {
    estimatedMonthlyUsage: number;
    estimatedOverage: number;
    estimatedCost: number;
  };
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly websocket: WebsocketGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async trackApiCall(
    userId: string,
    actionType: string,
    metadata: any,
  ): Promise<{ fromCache: boolean; actionConsumed: boolean; usage: Usage }> {
    const cacheKey = this.generateCacheKey(actionType, metadata);
    
    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached && this.shouldUseCache(actionType)) {
      await this.logAction(userId, actionType, { fromCache: true, cacheHit: true });
      const usage = await this.getCurrentUsage(userId);
      return { fromCache: true, actionConsumed: false, usage };
    }

    // Check if user can afford action
    const canAfford = await this.canAffordActions(userId, 1);
    if (!canAfford) {
      throw new BadRequestException('Insufficient API actions. Please upgrade your plan or wait for the next billing period.');
    }

    // Consume action
    const usage = await this.consumeActions(userId, {
      type: actionType,
      count: 1,
      metadata,
    });

    // Log the action
    await this.logAction(userId, actionType, {
      fromCache: false,
      metadata,
      status: 'pending',
    });

    // Send real-time update
    await this.sendUsageUpdate(userId, usage);

    return { fromCache: false, actionConsumed: true, usage };
  }

  async consumeActions(userId: string, update: UsageUpdate): Promise<Usage> {
    const count = update.count || 1;
    
    return await this.prisma.$transaction(async (tx) => {
      const usage = await tx.usage.findUnique({
        where: { userId },
        include: {
          user: {
            include: { subscription: true },
          },
        },
      });

      if (!usage) {
        throw new BadRequestException('Usage record not found');
      }

      const subscription = usage.user.subscription;
      if (!subscription) {
        throw new BadRequestException('No active subscription');
      }

      const newActionsUsed = usage.actionsUsed + count;
      const remaining = usage.monthlyAllocation - newActionsUsed;
      
      // Calculate overage if needed
      let overageActions = usage.overageActions;
      let overageCost = usage.overageCost;
      
      if (remaining < 0) {
        overageActions = Math.abs(remaining);
        overageCost = new Decimal(overageActions * subscription.overageRate);
      }

      // Update type-specific counters
      const typeCounters = this.getTypeCounterUpdate(update.type);
      
      // Update usage
      const updatedUsage = await tx.usage.update({
        where: { userId },
        data: {
          actionsUsed: newActionsUsed,
          actionsRemaining: Math.max(0, remaining),
          overageActions,
          overageCost,
          ...typeCounters,
          updatedAt: new Date(),
        },
      });

      // Check for alerts
      await this.checkUsageAlerts(userId, updatedUsage, subscription);

      return updatedUsage;
    });
  }

  async getCurrentUsage(userId: string): Promise<UsageStats> {
    const cacheKey = `usage:stats:${userId}`;
    const cached = await this.cache.get<UsageStats>(cacheKey);
    if (cached) return cached;

    const usage = await this.prisma.usage.findUnique({
      where: { userId },
      include: {
        user: {
          include: { subscription: true },
        },
      },
    });

    if (!usage) {
      throw new BadRequestException('Usage record not found');
    }

    const stats = this.calculateUsageStats(usage);
    await this.cache.set(cacheKey, stats, 60); // Cache for 1 minute

    return stats;
  }

  async canAffordActions(userId: string, count: number): Promise<boolean> {
    const usage = await this.prisma.usage.findUnique({
      where: { userId },
      include: {
        user: {
          include: { subscription: true },
        },
      },
    });

    if (!usage || !usage.user.subscription) return false;

    const subscription = usage.user.subscription;
    const remaining = usage.actionsRemaining;

    // Enterprise users have unlimited overage
    if (subscription.tier === 'ENTERPRISE' && subscription.status === 'ACTIVE') {
      return true;
    }

    // Allow 10% buffer for overage
    const buffer = Math.floor(subscription.monthlyActionLimit * 0.1);
    return remaining + buffer >= count;
  }

  async resetMonthlyUsage(userId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) return;

    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Archive current usage
    const currentUsage = await this.prisma.usage.findUnique({
      where: { userId },
    });

    if (currentUsage) {
      await this.prisma.usageHistory.create({
        data: {
          userId,
          periodStart: currentUsage.periodStart,
          periodEnd: currentUsage.periodEnd,
          actionsAlloted: currentUsage.monthlyAllocation,
          actionsUsed: currentUsage.actionsUsed,
          overageActions: currentUsage.overageActions,
          overageCost: currentUsage.overageCost,
          breakdown: {
            text: currentUsage.textActions,
            voice: currentUsage.voiceActions,
            email: currentUsage.emailActions,
            calendar: currentUsage.calendarActions,
            workflow: currentUsage.workflowActions,
            integration: currentUsage.integrationActions,
            aiAnalysis: currentUsage.aiAnalysisActions,
          },
        },
      });
    }

    // Reset usage
    await this.prisma.usage.upsert({
      where: { userId },
      create: {
        userId,
        periodStart: now,
        periodEnd,
        monthlyAllocation: subscription.monthlyActionLimit,
        actionsUsed: 0,
        actionsRemaining: subscription.monthlyActionLimit,
        overageActions: 0,
        overageCost: 0,
      },
      update: {
        periodStart: now,
        periodEnd,
        monthlyAllocation: subscription.monthlyActionLimit,
        actionsUsed: 0,
        actionsRemaining: subscription.monthlyActionLimit,
        overageActions: 0,
        overageCost: 0,
        textActions: 0,
        voiceActions: 0,
        emailActions: 0,
        calendarActions: 0,
        workflowActions: 0,
        integrationActions: 0,
        aiAnalysisActions: 0,
        haikuActions: 0,
        sonnetActions: 0,
        opusActions: 0,
      },
    });

    this.logger.log(`Reset monthly usage for user ${userId}`);
  }

  private calculateUsageStats(usage: Usage & { user: { subscription: Subscription | null } }): UsageStats {
    const subscription = usage.user.subscription!;
    const percentage = (usage.actionsUsed / usage.monthlyAllocation) * 100;
    
    // Calculate projections
    const daysInPeriod = Math.ceil((usage.periodEnd.getTime() - usage.periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((new Date().getTime() - usage.periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = usage.actionsUsed / daysElapsed;
    const estimatedMonthlyUsage = Math.round(dailyRate * daysInPeriod);
    const estimatedOverage = Math.max(0, estimatedMonthlyUsage - usage.monthlyAllocation);
    const estimatedCost = subscription.monthlyPrice + (estimatedOverage * subscription.overageRate);

    return {
      currentPeriod: {
        start: usage.periodStart,
        end: usage.periodEnd,
        allocation: usage.monthlyAllocation,
        used: usage.actionsUsed,
        remaining: usage.actionsRemaining,
        percentage,
        overageActions: usage.overageActions,
        overageCost: usage.overageCost,
      },
      breakdown: {
        text: usage.textActions,
        voice: usage.voiceActions,
        email: usage.emailActions,
        calendar: usage.calendarActions,
        workflow: usage.workflowActions,
        integration: usage.integrationActions,
        aiAnalysis: usage.aiAnalysisActions,
      },
      modelUsage: {
        haiku: usage.haikuActions,
        sonnet: usage.sonnetActions,
        opus: usage.opusActions,
      },
      performance: {
        cacheHitRate: usage.cacheHitRate,
        avgResponseTime: usage.averageResponseTime,
      },
      projections: {
        estimatedMonthlyUsage,
        estimatedOverage,
        estimatedCost,
      },
    };
  }

  private getTypeCounterUpdate(type: string): Partial<Usage> {
    const updates: Partial<Usage> = {};
    
    switch (type) {
      case 'voice_command':
      case 'voice_stt':
      case 'voice_tts':
        updates.voiceActions = { increment: 1 };
        break;
      case 'email_draft':
      case 'email_reply':
      case 'email_summary':
        updates.emailActions = { increment: 1 };
        break;
      case 'calendar_event':
      case 'calendar_suggestion':
        updates.calendarActions = { increment: 1 };
        break;
      case 'task_create':
      case 'task_analysis':
        updates.workflowActions = { increment: 1 };
        break;
      case 'integration_sync':
      case 'integration_action':
        updates.integrationActions = { increment: 1 };
        break;
      case 'ai_analysis':
      case 'ai_suggestion':
        updates.aiAnalysisActions = { increment: 1 };
        break;
      default:
        updates.textActions = { increment: 1 };
    }

    return updates;
  }

  private async checkUsageAlerts(userId: string, usage: Usage, subscription: Subscription): Promise<void> {
    const percentage = (usage.actionsUsed / usage.monthlyAllocation) * 100;

    // Check threshold alerts
    const thresholds = [50, 75, 90, 100];
    for (const threshold of thresholds) {
      if (percentage >= threshold && percentage < threshold + 5) {
        await this.notifications.create({
          userId,
          type: 'usage_alert',
          priority: threshold >= 90 ? 'high' : 'normal',
          title: `${threshold}% of monthly actions used`,
          message: `You've used ${usage.actionsUsed} of ${usage.monthlyAllocation} actions this month.`,
          relatedType: 'usage',
          relatedId: usage.id,
          channels: ['in-app', 'email'],
        });
      }
    }

    // Check for overage
    if (usage.overageActions > 0 && usage.overageActions <= 10) {
      await this.notifications.create({
        userId,
        type: 'overage_alert',
        priority: 'high',
        title: 'Overage charges incurred',
        message: `You've exceeded your monthly allocation. ${usage.overageActions} overage actions used at $${subscription.overageRate} each.`,
        relatedType: 'usage',
        relatedId: usage.id,
        channels: ['in-app', 'email', 'push'],
      });
    }
  }

  private async sendUsageUpdate(userId: string, usage: Usage): Promise<void> {
    const stats = await this.getCurrentUsage(userId);
    await this.websocket.sendToUser(userId, {
      type: 'usage:updated',
      payload: stats,
    });
  }

  private generateCacheKey(actionType: string, metadata: any): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify({ actionType, ...metadata }))
      .digest('hex');
    return `api:${actionType}:${hash}`;
  }

  private shouldUseCache(actionType: string): boolean {
    // Some action types should never use cache
    const noCacheTypes = ['integration_sync', 'email_send', 'calendar_create'];
    return !noCacheTypes.includes(actionType);
  }

  private async logAction(userId: string, type: string, data: any): Promise<void> {
    try {
      await this.prisma.actionLog.create({
        data: {
          userId,
          type,
          ...data,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log action: ${error.message}`);
    }
  }
}
```

### Create src/modules/cache/cache.module.ts

```typescript
import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisService } from './redis.service';
import { CacheInterceptor } from './cache.interceptor';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          enableOfflineQueue: true,
        });

        client.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        client.on('connect', () => {
          console.log('Redis Client Connected');
        });

        return client;
      },
    },
    CacheService,
    RedisService,
    CacheInterceptor,
  ],
  exports: [CacheService, RedisService, CacheInterceptor],
})
export class CacheModule {}
```

### Create src/modules/cache/cache.service.ts

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { LRUCache } from 'lru-cache';
import * as crypto from 'crypto';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  compress?: boolean; // Compress large values
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private memoryCache: LRUCache<string, any>;
  private readonly defaultTTL = 3600; // 1 hour

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    this.memoryCache = new LRUCache({
      max: 10000,
      ttl: 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });

    // Clear memory cache periodically
    setInterval(() => {
      this.memoryCache.purgeStale();
    }, 60000); // Every minute
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // L1: Memory cache
      const memCached = this.memoryCache.get(key);
      if (memCached !== undefined) {
        this.logger.debug(`Memory cache hit: ${key}`);
        return memCached;
      }

      // L2: Redis
      const redisCached = await this.redis.get(key);
      if (redisCached) {
        this.logger.debug(`Redis cache hit: ${key}`);
        const parsed = JSON.parse(redisCached);
        this.memoryCache.set(key, parsed);
        return parsed;
      }

      this.logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      const stringified = JSON.stringify(value);

      // Set in both layers
      this.memoryCache.set(key, value);
      
      if (options.tags && options.tags.length > 0) {
        // Use Redis transaction for atomic operations
        const multi = this.redis.multi();
        multi.setex(key, ttl, stringified);
        
        // Add to tag sets
        for (const tag of options.tags) {
          multi.sadd(`tag:${tag}`, key);
          multi.expire(`tag:${tag}`, ttl);
        }
        
        await multi.exec();
      } else {
        await this.redis.setex(key, ttl, stringified);
      }

      this.logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await this.redis.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      // Clear from memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.match(pattern)) {
          this.memoryCache.delete(key);
        }
      }

      // Clear from Redis using SCAN for better performance
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100,
      });

      const pipeline = this.redis.pipeline();
      let count = 0;

      stream.on('data', (keys: string[]) => {
        if (keys.length) {
          count += keys.length;
          keys.forEach((key) => pipeline.del(key));
        }
      });

      stream.on('end', async () => {
        if (count > 0) {
          await pipeline.exec();
          this.logger.debug(`Deleted ${count} keys matching pattern: ${pattern}`);
        }
      });
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  async invalidateTag(tag: string): Promise<void> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      
      if (keys.length > 0) {
        // Delete from memory cache
        keys.forEach((key) => this.memoryCache.delete(key));
        
        // Delete from Redis
        await this.redis.del(...keys);
        await this.redis.del(`tag:${tag}`);
        
        this.logger.debug(`Invalidated ${keys.length} keys for tag: ${tag}`);
      }
    } catch (error) {
      this.logger.error(`Cache invalidate tag error for ${tag}:`, error);
    }
  }

  async flush(): Promise<void> {
    try {
      this.memoryCache.clear();
      await this.redis.flushdb();
      this.logger.warn('Cache flushed');
    } catch (error) {
      this.logger.error('Cache flush error:', error);
    }
  }

  generateKey(...parts: any[]): string {
    const combined = parts.map(part => 
      typeof part === 'object' ? JSON.stringify(part) : String(part)
    ).join(':');
    
    return crypto
      .createHash('sha256')
      .update(combined)
      .digest('hex')
      .substring(0, 32);
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results: (T | null)[] = [];
      
      // Check memory cache first
      const memoryHits: Map<number, T> = new Map();
      const redisKeys: string[] = [];
      
      keys.forEach((key, index) => {
        const cached = this.memoryCache.get(key);
        if (cached !== undefined) {
          memoryHits.set(index, cached);
        } else {
          redisKeys.push(key);
        }
      });

      // Get remaining from Redis
      if (redisKeys.length > 0) {
        const redisValues = await this.redis.mget(...redisKeys);
        let redisIndex = 0;
        
        keys.forEach((key, index) => {
          if (memoryHits.has(index)) {
            results.push(memoryHits.get(index)!);
          } else {
            const value = redisValues[redisIndex++];
            if (value) {
              const parsed = JSON.parse(value);
              this.memoryCache.set(key, parsed);
              results.push(parsed);
            } else {
              results.push(null);
            }
          }
        });
      } else {
        keys.forEach((_, index) => {
          results.push(memoryHits.get(index)!);
        });
      }

      return results;
    } catch (error) {
      this.logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(entries: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      entries.forEach(({ key, value, options = {} }) => {
        const ttl = options.ttl || this.defaultTTL;
        const stringified = JSON.stringify(value);
        
        // Set in memory cache
        this.memoryCache.set(key, value);
        
        // Add to Redis pipeline
        pipeline.setex(key, ttl, stringified);
        
        if (options.tags) {
          options.tags.forEach((tag) => {
            pipeline.sadd(`tag:${tag}`, key);
            pipeline.expire(`tag:${tag}`, ttl);
          });
        }
      });

      await pipeline.exec();
      this.logger.debug(`Cache mset: ${entries.length} entries`);
    } catch (error) {
      this.logger.error('Cache mset error:', error);
    }
  }

  async increment(key: string, amount: number = 1, ttl?: number): Promise<number> {
    try {
      const multi = this.redis.multi();
      multi.incrby(key, amount);
      
      if (ttl) {
        multi.expire(key, ttl);
      }
      
      const results = await multi.exec();
      const newValue = results?.[0]?.[1] as number;
      
      // Update memory cache
      this.memoryCache.set(key, newValue);
      
      return newValue;
    } catch (error) {
      this.logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  getMemoryStats() {
    return {
      size: this.memoryCache.size,
      maxSize: this.memoryCache.max,
      calculatedSize: this.memoryCache.calculatedSize,
    };
  }
}
```

### Create src/modules/ai-gateway/ai-gateway.module.ts

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AiGatewayService } from './ai-gateway.service';
import { ModelSelectorService } from './model-selector.service';
import { ClaudeService } from './claude.service';
import { OpenAIService } from './openai.service';
import { PromptService } from './prompt.service';
import { EmbeddingService } from './embedding.service';
import { AiController } from './ai.controller';
import { CacheModule } from '../cache/cache.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    CacheModule,
    BillingModule,
    BullModule.registerQueue({
      name: 'ai-processing',
    }),
  ],
  providers: [
    AiGatewayService,
    ModelSelectorService,
    ClaudeService,
    OpenAIService,
    PromptService,
    EmbeddingService,
  ],
  controllers: [AiController],
  exports: [AiGatewayService, EmbeddingService],
})
export class AiGatewayModule {}
```

### Create src/modules/ai-gateway/ai-gateway.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ModelSelectorService } from './model-selector.service';
import { ClaudeService } from './claude.service';
import { OpenAIService } from './openai.service';
import { PromptService } from './prompt.service';
import { CacheService } from '../cache/cache.service';
import { UsageService } from '../billing/usage.service';
import { PrismaService } from '../prisma/prisma.service';

export interface AiRequest {
  prompt: string;
  context?: any;
  userId: string;
  type: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    stream?: boolean;
    systemPrompt?: string;
  };
}

export interface AiResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  cost: number;
  duration: number;
  fromCache: boolean;
}

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    private readonly modelSelector: ModelSelectorService,
    private readonly claude: ClaudeService,
    private readonly openai: OpenAIService,
    private readonly promptService: PromptService,
    private readonly cache: CacheService,
    private readonly usageService: UsageService,
    private readonly prisma: PrismaService,
    @InjectQueue('ai-processing') private aiQueue: Queue,
  ) {}

  async processRequest(request: AiRequest): Promise<AiResponse> {
    const startTime = Date.now();
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache
    const cached = await this.cache.get<AiResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for AI request: ${request.type}`);
      
      // Log cache hit
      await this.logAiCall({
        userId: request.userId,
        type: request.type,
        fromCache: true,
        cacheHit: true,
        model: cached.model,
        duration: Date.now() - startTime,
      });
      
      return { ...cached, fromCache: true };
    }

    // Track API usage
    const tracking = await this.usageService.trackApiCall(
      request.userId,
      'ai_request',
      { type: request.type }
    );

    if (!tracking.actionConsumed) {
      // This shouldn't happen, but safety check
      return cached!;
    }

    try {
      // Select optimal model
      const model = request.options?.model || 
        await this.modelSelector.selectModel(request);

      // Enhance prompt with context
      const enhancedPrompt = await this.promptService.enhancePrompt(
        request.prompt,
        request.context,
        request.type
      );

      // Route to appropriate AI service
      let response: AiResponse;
      
      if (model.startsWith('claude')) {
        response = await this.claude.complete({
          prompt: enhancedPrompt,
          model,
          temperature: request.options?.temperature,
          maxTokens: request.options?.maxTokens,
          systemPrompt: request.options?.systemPrompt,
        });
      } else if (model.startsWith('gpt')) {
        response = await this.openai.complete({
          prompt: enhancedPrompt,
          model,
          temperature: request.options?.temperature,
          maxTokens: request.options?.maxTokens,
          systemPrompt: request.options?.systemPrompt,
        });
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }

      // Add metadata
      response.duration = Date.now() - startTime;
      response.fromCache = false;

      // Cache response
      await this.cache.set(cacheKey, response, {
        ttl: this.getCacheTTL(request.type),
        tags: ['ai', request.type, model],
      });

      // Log AI call
      await this.logAiCall({
        userId: request.userId,
        type: request.type,
        model,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        cost: response.cost,
        duration: response.duration,
        fromCache: false,
      });

      // Update model usage stats
      await this.updateModelUsageStats(request.userId, model);

      return response;
    } catch (error) {
      this.logger.error(`AI request failed: ${error.message}`, error.stack);
      
      // Log failed attempt
      await this.logAiCall({
        userId: request.userId,
        type: request.type,
        status: 'failed',
        error: error.message,
        duration: Date.now() - startTime,
      });

      throw error;
    }
  }

  async processAsync(request: AiRequest): Promise<{ jobId: string }> {
    const job = await this.aiQueue.add('process-ai-request', request, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: false,
      removeOnFail: false,
    });

    return { jobId: job.id.toString() };
  }

  async getJobStatus(jobId: string): Promise<any> {
    const job = await this.aiQueue.getJob(jobId);
    
    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress();
    
    if (state === 'completed') {
      const result = job.returnvalue;
      return {
        status: 'completed',
        result,
      };
    } else if (state === 'failed') {
      return {
        status: 'failed',
        error: job.failedReason,
      };
    } else {
      return {
        status: state,
        progress,
      };
    }
  }

  private generateCacheKey(request: AiRequest): string {
    const keyData = {
      prompt: request.prompt,
      context: request.context,
      type: request.type,
      options: {
        temperature: request.options?.temperature,
        maxTokens: request.options?.maxTokens,
        model: request.options?.model,
        systemPrompt: request.options?.systemPrompt,
      },
    };

    return this.cache.generateKey('ai', request.type, keyData);
  }

  private getCacheTTL(type: string): number {
    const ttlMap: Record<string, number> = {
      'email_draft': 86400, // 24 hours
      'email_reply': 43200, // 12 hours
      'calendar_suggestion': 3600, // 1 hour
      'task_analysis': 7200, // 2 hours
      'general_query': 604800, // 7 days
      'voice_command': 300, // 5 minutes
      'document_summary': 86400, // 24 hours
      'code_generation': 3600, // 1 hour
    };

    return ttlMap[type] || 3600; // Default 1 hour
  }

  private async logAiCall(data: any): Promise<void> {
    try {
      await this.prisma.actionLog.create({
        data: {
          userId: data.userId,
          type: data.type,
          category: 'ai',
          fromCache: data.fromCache || false,
          cacheHit: data.cacheHit || false,
          model: data.model,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          totalTokens: data.totalTokens,
          cost: data.cost,
          duration: data.duration,
          status: data.status || 'success',
          error: data.error,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log AI call:', error);
    }
  }

  private async updateModelUsageStats(userId: string, model: string): Promise<void> {
    const updateData: any = {};
    
    if (model.includes('haiku')) {
      updateData.haikuActions = { increment: 1 };
    } else if (model.includes('sonnet')) {
      updateData.sonnetActions = { increment: 1 };
    } else if (model.includes('opus')) {
      updateData.opusActions = { increment: 1 };
    }

    await this.prisma.usage.update({
      where: { userId },
      data: updateData,
    });
  }
}
```

### Create src/modules/ai-gateway/claude.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AiResponse } from './ai-gateway.service';

interface ClaudeRequest {
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private anthropic: Anthropic;
  
  // Pricing per 1M tokens (as of 2024)
  private readonly pricing = {
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  };

  constructor(private readonly configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get('ai.anthropic.apiKey'),
    });
  }

  async complete(params: ClaudeRequest): Promise<AiResponse> {
    const startTime = Date.now();
    
    try {
      const messages: Anthropic.MessageParam[] = [
        {
          role: 'user',
          content: params.prompt,
        },
      ];

      const response = await this.anthropic.messages.create({
        model: params.model,
        max_tokens: params.maxTokens || 1024,
        temperature: params.temperature || 0.7,
        messages,
        system: params.systemPrompt,
      });

      const textContent = response.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n');

      const usage = response.usage || { input_tokens: 0, output_tokens: 0 };
      const totalTokens = usage.input_tokens + usage.output_tokens;
      
      // Calculate cost
      const modelPricing = this.pricing[params.model] || this.pricing['claude-3-5-sonnet-20241022'];
      const cost = (usage.input_tokens / 1_000_000) * modelPricing.input +
                   (usage.output_tokens / 1_000_000) * modelPricing.output;

      return {
        text: textContent,
        usage: {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens,
        },
        model: params.model,
        cost: parseFloat(cost.toFixed(6)),
        duration: Date.now() - startTime,
        fromCache: false,
      };
    } catch (error) {
      this.logger.error(`Claude API error: ${error.message}`, error.stack);
      
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.status === 401) {
        throw new Error('Invalid API key');
      } else {
        throw new Error(`AI processing failed: ${error.message}`);
      }
    }
  }

  async stream(params: ClaudeRequest): AsyncGenerator<string> {
    try {
      const stream = await this.anthropic.messages.stream({
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

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      this.logger.error(`Claude streaming error: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### Create src/modules/ai-gateway/model-selector.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiRequest } from './ai-gateway.service';
import { Tier } from '@prisma/client';

interface ModelSelection {
  model: string;
  reason: string;
}

@Injectable()
export class ModelSelectorService {
  private readonly logger = new Logger(ModelSelectorService.name);

  // Model capabilities and use cases
  private readonly modelMatrix = {
    'claude-3-haiku-20240307': {
      speed: 'fastest',
      cost: 'lowest',
      quality: 'good',
      maxTokens: 4096,
      bestFor: ['simple queries', 'quick responses', 'basic summaries', 'short emails'],
      complexity: ['simple', 'medium'],
    },
    'claude-3-5-sonnet-20241022': {
      speed: 'fast',
      cost: 'medium',
      quality: 'excellent',
      maxTokens: 8192,
      bestFor: ['complex tasks', 'detailed analysis', 'creative writing', 'code generation'],
      complexity: ['medium', 'complex'],
    },
    'claude-3-opus-20240229': {
      speed: 'slower',
      cost: 'highest',
      quality: 'best',
      maxTokens: 4096,
      bestFor: ['critical analysis', 'strategic planning', 'complex reasoning', 'research'],
      complexity: ['complex', 'expert'],
    },
    'gpt-4-turbo-preview': {
      speed: 'medium',
      cost: 'high',
      quality: 'excellent',
      maxTokens: 128000,
      bestFor: ['long documents', 'vision tasks', 'complex coding', 'multi-turn conversations'],
      complexity: ['medium', 'complex'],
    },
    'gpt-3.5-turbo': {
      speed: 'fastest',
      cost: 'lowest',
      quality: 'good',
      maxTokens: 16385,
      bestFor: ['simple queries', 'basic tasks', 'quick drafts'],
      complexity: ['simple'],
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async selectModel(request: AiRequest): Promise<string> {
    // Get user's subscription tier
    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      include: { subscription: true },
    });

    const tier = user?.subscription?.tier || 'PROFESSIONAL';
    const aiModelAccess = user?.subscription?.aiModelAccess || [];
    
    // Analyze request complexity
    const complexity = this.analyzeComplexity(request);
    
    // Get task requirements
    const requirements = this.getTaskRequirements(request.type);
    
    // Select model based on tier, complexity, and requirements
    const selection = this.selectOptimalModel({
      tier,
      aiModelAccess,
      complexity,
      requirements,
      requestType: request.type,
      prompt: request.prompt,
    });

    this.logger.debug(`Selected model ${selection.model} for ${request.type}: ${selection.reason}`);
    
    return selection.model;
  }

  private analyzeComplexity(request: AiRequest): 'simple' | 'medium' | 'complex' | 'expert' {
    const prompt = request.prompt || '';
    const context = JSON.stringify(request.context || {});
    const combined = prompt + context;
    
    const wordCount = combined.split(/\s+/).length;
    const hasMultipleSteps = /\b(then|after|next|finally|step\s+\d)\b/i.test(prompt);
    const hasAnalysis = /\b(analyze|evaluate|compare|assess|review)\b/i.test(prompt);
    const hasCreativity = /\b(create|generate|write|design|imagine)\b/i.test(prompt);
    const hasStrategy = /\b(strategy|plan|recommend|optimize|improve)\b/i.test(prompt);
    const hasCode = /\b(code|function|algorithm|implement|debug)\b/i.test(prompt);
    
    // Calculate complexity score
    let score = 0;
    
    // Length-based scoring
    if (wordCount < 50) score += 1;
    else if (wordCount < 200) score += 2;
    else if (wordCount < 500) score += 3;
    else score += 4;
    
    // Task-based scoring
    if (hasMultipleSteps) score += 2;
    if (hasAnalysis) score += 3;
    if (hasCreativity) score += 2;
    if (hasStrategy) score += 4;
    if (hasCode) score += 3;
    
    // Context complexity
    if (request.context) {
      const contextSize = JSON.stringify(request.context).length;
      if (contextSize > 1000) score += 2;
      if (contextSize > 5000) score += 2;
    }
    
    // Map score to complexity
    if (score <= 3) return 'simple';
    if (score <= 7) return 'medium';
    if (score <= 12) return 'complex';
    return 'expert';
  }

  private getTaskRequirements(taskType: string): Record<string, any> {
    const requirements: Record<string, any> = {
      'email_draft': {
        speed: 'fast',
        quality: 'high',
        creativity: true,
        maxLength: 'medium',
      },
      'email_reply': {
        speed: 'fastest',
        quality: 'good',
        contextAwareness: true,
      },
      'email_summary': {
        speed: 'fast',
        quality: 'good',
        comprehension: true,
      },
      'calendar_suggestion': {
        speed: 'fast',
        quality: 'good',
        reasoning: true,
      },
      'task_analysis': {
        speed: 'medium',
        quality: 'high',
        reasoning: true,
        planning: true,
      },
      'voice_command': {
        speed: 'fastest',
        quality: 'good',
        conciseness: true,
      },
      'document_summary': {
        speed: 'medium',
        quality: 'high',
        comprehension: true,
        longContext: true,
      },
      'code_generation': {
        speed: 'medium',
        quality: 'highest',
        precision: true,
        creativity: true,
      },
      'strategic_planning': {
        speed: 'slow',
        quality: 'highest',
        reasoning: true,
        creativity: true,
        analysis: true,
      },
    };

    return requirements[taskType] || {
      speed: 'medium',
      quality: 'good',
    };
  }

  private selectOptimalModel(params: {
    tier: Tier;
    aiModelAccess: string[];
    complexity: string;
    requirements: Record<string, any>;
    requestType: string;
    prompt: string;
  }): ModelSelection {
    const { tier, aiModelAccess, complexity, requirements } = params;

    // Professional tier: Balance between cost and quality
    if (tier === 'PROFESSIONAL') {
      if (complexity === 'simple') {
        return {
          model: 'claude-3-haiku-20240307',
          reason: 'Simple task - using fast, cost-effective model',
        };
      }
      if (complexity === 'expert' || requirements.quality === 'highest') {
        return {
          model: 'claude-3-5-sonnet-20241022',
          reason: 'Complex task requiring high quality output',
        };
      }
      return {
        model: 'claude-3-5-sonnet-20241022',
        reason: 'Standard task - using balanced model',
      };
    }

    // Team tier: More flexibility
    if (tier === 'TEAM') {
      if (complexity === 'simple' && requirements.speed === 'fastest') {
        return {
          model: 'claude-3-haiku-20240307',
          reason: 'Simple, time-sensitive task',
        };
      }
      if (complexity === 'expert' || requirements.quality === 'highest') {
        return {
          model: 'claude-3-opus-20240229',
          reason: 'Expert task requiring best available model',
        };
      }
      if (requirements.longContext || params.prompt.length > 10000) {
        return {
          model: 'gpt-4-turbo-preview',
          reason: 'Long context task - using model with 128k context',
        };
      }
      return {
        model: 'claude-3-5-sonnet-20241022',
        reason: 'Standard task with team tier benefits',
      };
    }

    // Enterprise tier: Best model for the task
    if (complexity === 'simple' && requirements.speed === 'fastest') {
      return {
        model: 'claude-3-haiku-20240307',
        reason: 'Simple task - optimizing for speed even on enterprise',
      };
    }
    
    if (complexity === 'expert' || requirements.quality === 'highest') {
      if (requirements.reasoning && requirements.analysis) {
        return {
          model: 'claude-3-opus-20240229',
          reason: 'Expert reasoning task - using most capable model',
        };
      }
    }
    
    if (requirements.longContext || params.prompt.length > 10000) {
      return {
        model: 'gpt-4-turbo-preview',
        reason: 'Enterprise tier - using GPT-4 for long context',
      };
    }

    if (params.requestType.includes('code')) {
      return {
        model: 'claude-3-5-sonnet-20241022',
        reason: 'Code generation - Sonnet excels at coding tasks',
      };
    }

    // Default enterprise selection
    return {
      model: 'claude-3-5-sonnet-20241022',
      reason: 'Enterprise tier - using high-performance model',
    };
  }
}
```

### Create src/modules/voice/voice.module.ts

```typescript
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { ElevenLabsService } from './elevenlabs.service';
import { DeepgramService } from './deepgram.service';
import { VoiceProcessor } from './processors/voice.processor';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { BillingModule } from '../billing/billing.module';
import { CacheModule } from '../cache/cache.module';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(webm|mp3|wav|ogg|m4a)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Unsupported file type'), false);
        }
      },
    }),
    AiGatewayModule,
    BillingModule,
    CacheModule,
  ],
  controllers: [VoiceController],
  providers: [VoiceService, ElevenLabsService, DeepgramService, VoiceProcessor],
  exports: [VoiceService],
})
export class VoiceModule {}
```

### Create src/modules/voice/voice.controller.ts

```typescript
import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VoiceService } from './voice.service';
import { UsageService } from '../billing/usage.service';
import { User } from '@prisma/client';
import { ProcessVoiceDto, TextToSpeechDto } from './dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Voice')
@Controller('api/v1/voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly usageService: UsageService,
  ) {}

  @Post('process')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiOperation({ summary: 'Process voice command' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
        },
        metadata: {
          type: 'object',
        },
      },
    },
  })
  async processVoiceCommand(
    @UploadedFile() audioFile: Express.Multer.File,
    @CurrentUser() user: User,
    @Body() dto: ProcessVoiceDto,
  ) {
    if (!audioFile) {
      throw new BadRequestException('Audio file is required');
    }

    // Voice commands require 2 actions minimum (STT + processing)
    const requiredActions = dto.responseFormat === 'audio' ? 3 : 2;
    const canAfford = await this.usageService.canAffordActions(user.id, requiredActions);
    
    if (!canAfford) {
      throw new BadRequestException(
        `Insufficient API actions. Voice command requires ${requiredActions} actions.`
      );
    }

    const result = await this.voiceService.processVoiceCommand(
      audioFile,
      user,
      dto,
    );

    return result;
  }

  @Post('text-to-speech')
  @ApiOperation({ summary: 'Convert text to speech' })
  async textToSpeech(
    @CurrentUser() user: User,
    @Body() dto: TextToSpeechDto,
  ) {
    const canAfford = await this.usageService.canAffordActions(user.id, 1);
    
    if (!canAfford) {
      throw new BadRequestException('Insufficient API actions for text-to-speech');
    }

    const result = await this.voiceService.textToSpeech(
      dto.text,
      user,
      dto.voiceId,
      dto.options,
    );

    return result;
  }

  @Get('voices')
  @ApiOperation({ summary: 'Get available voices' })
  async getAvailableVoices(@CurrentUser() user: User) {
    return this.voiceService.getAvailableVoices();
  }

  @Post('stream')
  @ApiOperation({ summary: 'Stream voice response' })
  async streamVoiceResponse(
    @CurrentUser() user: User,
    @Body() dto: TextToSpeechDto,
    @Res() res: Response,
  ) {
    const canAfford = await this.usageService.canAffordActions(user.id, 1);
    
    if (!canAfford) {
      throw new BadRequestException('Insufficient API actions for streaming');
    }

    const stream = await this.voiceService.streamTextToSpeech(
      dto.text,
      user,
      dto.voiceId,
    );

    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
    });

    stream.pipe(res);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get voice command history' })
  async getVoiceHistory(@CurrentUser() user: User) {
    return this.voiceService.getVoiceHistory(user.id);
  }
}
```

### Create src/modules/voice/dto/index.ts

```typescript
import { IsString, IsOptional, IsEnum, IsObject, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessVoiceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ enum: ['text', 'audio'], default: 'text' })
  @IsOptional()
  @IsEnum(['text', 'audio'])
  responseFormat?: 'text' | 'audio' = 'text';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  context?: string;
}

export class TextToSpeechDto {
  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  voiceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  options?: {
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    stability?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    similarityBoost?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    style?: number;

    @IsOptional()
    useSpeakerBoost?: boolean;
  };
}
```

### Create src/modules/voice/voice.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs.service';
import { DeepgramService } from './deepgram.service';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { UsageService } from '../billing/usage.service';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as crypto from 'crypto';
import { Readable } from 'stream';

interface VoiceCommandResult {
  transcript: string;
  response: string;
  audioUrl?: string;
  processingTime: number;
  actionsConsumed: number;
  confidence: number;
}

interface VoiceOptions {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly elevenLabs: ElevenLabsService,
    private readonly deepgram: DeepgramService,
    private readonly aiGateway: AiGatewayService,
    private readonly usageService: UsageService,
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  async processVoiceCommand(
    audioFile: Express.Multer.File,
    user: User,
    metadata: any,
  ): Promise<VoiceCommandResult> {
    const startTime = Date.now();
    const audioHash = this.generateHash(audioFile.buffer);
    
    try {
      // Step 1: Speech to text (1 action)
      const sttCacheKey = `stt:${audioHash}`;
      let transcriptData = await this.cache.get<any>(sttCacheKey);
      
      if (!transcriptData) {
        await this.usageService.trackApiCall(user.id, 'voice_stt', { 
          audioHash,
          fileSize: audioFile.size,
        });
        
        // Use Deepgram for better accuracy
        transcriptData = await this.deepgram.speechToText(audioFile.buffer, {
          language: user.voiceLanguage || 'en-US',
          model: 'nova-2',
          punctuate: true,
          diarize: false,
        });
        
        await this.cache.set(sttCacheKey, transcriptData, { 
          ttl: 86400, // 24 hours
          tags: ['voice', 'stt'],
        });
      }

      const transcript = transcriptData.transcript;
      const confidence = transcriptData.confidence || 0.95;

      this.logger.debug(`Transcript: "${transcript}" (confidence: ${confidence})`);

      // Step 2: Process command with AI (1 action)
      const response = await this.aiGateway.processRequest({
        prompt: transcript,
        userId: user.id,
        type: 'voice_command',
        context: {
          ...metadata,
          voiceConfidence: confidence,
          previousCommands: await this.getRecentCommands(user.id),
        },
        options: {
          systemPrompt: this.getVoiceCommandSystemPrompt(user),
        },
      });

      // Step 3: Text to speech (optional, 1 action)
      let audioUrl: string | undefined;
      if (metadata.responseFormat === 'audio') {
        const ttsCacheKey = `tts:${user.voiceId}:${this.generateHash(response.text)}`;
        audioUrl = await this.cache.get<string>(ttsCacheKey);
        
        if (!audioUrl) {
          await this.usageService.trackApiCall(user.id, 'voice_tts', {
            voiceId: user.voiceId,
            textLength: response.text.length,
          });
          
          audioUrl = await this.elevenLabs.textToSpeech(
            response.text,
            user.voiceId || 'rachel',
            {
              stability: 0.5,
              similarityBoost: 0.5,
              style: 0.5,
              useSpeakerBoost: true,
            }
          );
          
          await this.cache.set(ttsCacheKey, audioUrl, { 
            ttl: 604800, // 7 days
            tags: ['voice', 'tts'],
          });
        }
      }

      // Log voice interaction
      await this.logVoiceInteraction({
        userId: user.id,
        transcript,
        response: response.text,
        confidence,
        hasAudioResponse: !!audioUrl,
        processingTime: Date.now() - startTime,
        metadata,
      });

      return {
        transcript,
        response: response.text,
        audioUrl,
        processingTime: Date.now() - startTime,
        actionsConsumed: audioUrl ? 3 : 2,
        confidence,
      };
    } catch (error) {
      this.logger.error(`Voice command processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async textToSpeech(
    text: string,
    user: User,
    voiceId?: string,
    options?: VoiceOptions,
  ): Promise<{ audioUrl: string; cached: boolean }> {
    const selectedVoiceId = voiceId || user.voiceId || 'rachel';
    const cacheKey = `tts:${selectedVoiceId}:${this.generateHash(text)}:${JSON.stringify(options)}`;
    
    // Check cache
    const cachedUrl = await this.cache.get<string>(cacheKey);
    if (cachedUrl) {
      return { audioUrl: cachedUrl, cached: true };
    }

    // Track usage
    await this.usageService.trackApiCall(user.id, 'voice_tts', {
      voiceId: selectedVoiceId,
      textLength: text.length,
    });

    // Generate audio
    const audioUrl = await this.elevenLabs.textToSpeech(
      text,
      selectedVoiceId,
      options || {
        stability: 0.5,
        similarityBoost: 0.5,
      }
    );

    // Cache result
    await this.cache.set(cacheKey, audioUrl, {
      ttl: 604800, // 7 days
      tags: ['voice', 'tts', selectedVoiceId],
    });

    return { audioUrl, cached: false };
  }

  async streamTextToSpeech(
    text: string,
    user: User,
    voiceId?: string,
  ): Promise<Readable> {
    const selectedVoiceId = voiceId || user.voiceId || 'rachel';
    
    // Track usage
    await this.usageService.trackApiCall(user.id, 'voice_tts_stream', {
      voiceId: selectedVoiceId,
      textLength: text.length,
    });

    // Stream audio
    return this.elevenLabs.streamTextToSpeech(text, selectedVoiceId);
  }

  async getAvailableVoices() {
    const cacheKey = 'voices:available';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const voices = await this.elevenLabs.getVoices();
    
    // Categorize and enhance voice data
    const categorizedVoices = {
      recommended: voices.filter(v => ['rachel', 'domi', 'bella'].includes(v.voice_id)),
      male: voices.filter(v => v.labels?.gender === 'male'),
      female: voices.filter(v => v.labels?.gender === 'female'),
      all: voices,
    };

    await this.cache.set(cacheKey, categorizedVoices, { ttl: 86400 }); // 24 hours
    return categorizedVoices;
  }

  async getVoiceHistory(userId: string, limit: number = 20) {
    return this.prisma.actionLog.findMany({
      where: {
        userId,
        type: {
          in: ['voice_command', 'voice_stt', 'voice_tts'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        input: true,
        output: true,
        metadata: true,
        createdAt: true,
        duration: true,
      },
    });
  }

  private async getRecentCommands(userId: string, limit: number = 5) {
    const recentLogs = await this.prisma.actionLog.findMany({
      where: {
        userId,
        type: 'voice_command',
        status: 'success',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        input: true,
        output: true,
        createdAt: true,
      },
    });

    return recentLogs.map(log => ({
      command: log.input,
      response: log.output,
      timestamp: log.createdAt,
    }));
  }

  private getVoiceCommandSystemPrompt(user: User): string {
    return `You are Aurelius, an AI assistant responding to voice commands.
    
User preferences:
- Name: ${user.name || 'User'}
- Preferred communication style: ${user.preferredInput}
- Voice speed preference: ${user.voiceSpeed}x

Guidelines:
1. Keep responses concise and natural for speech
2. Avoid long lists or complex formatting
3. Use conversational language
4. Confirm actions clearly
5. Ask for clarification if the command is ambiguous
6. Reference previous context when relevant

Remember: The user is speaking to you, so respond as if in a conversation.`;
  }

  private generateHash(data: Buffer | string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16);
  }

  private async logVoiceInteraction(data: any): Promise<void> {
    try {
      await this.prisma.actionLog.create({
        data: {
          userId: data.userId,
          type: 'voice_command',
          category: 'voice',
          input: data.transcript,
          output: data.response,
          metadata: {
            ...data.metadata,
            confidence: data.confidence,
            hasAudioResponse: data.hasAudioResponse,
          },
          duration: data.processingTime,
          status: 'success',
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to log voice interaction:', error);
    }
  }
}