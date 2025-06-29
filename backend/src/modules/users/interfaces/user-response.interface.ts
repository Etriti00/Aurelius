import { User, Subscription, Tier, Status } from '@prisma/client';

export interface UserProfileResponse {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  voiceId: string;
  voiceSpeed: number;
  preferences: UserPreferences;
  createdAt: Date;
  lastActiveAt: Date | null;
  subscription: UserSubscriptionInfo | null;
  integrations: UserIntegrationInfo[];
  stats: UserStats;
}

export interface UserSubscriptionInfo {
  id: string;
  tier: Tier;
  status: Status;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  monthlyActionLimit: number;
  integrationLimit: number;
  monthlyPrice: number;
  overageRate: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserIntegrationInfo {
  id: string;
  provider: string;
  status: string;
  lastSyncAt: Date | null;
}

export interface UserStats {
  activeTasks: number;
  unreadEmails: number;
  upcomingEvents: number;
}

export interface UserUsageStatsResponse {
  subscription: {
    tier: Tier;
    status: Status;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  };
  aiUsage: {
    actionsUsed: number;
    actionsLimit: number;
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
  };
  integrations: {
    active: number;
    limit: number;
  };
}

// Use Prisma's generated types with relations for accurate typing
export interface UserWithRelations extends User {
  subscription?: Subscription | null;
  integrations: UserIntegrationInfo[];
  _count: {
    tasks: number;
    emailThreads: number;
    events: number;
  };
}

export interface CreateUserData {
  email: string;
  name?: string;
  avatar?: string;
  googleId?: string;
  microsoftId?: string;
  appleId?: string;
}

export interface UpdateUserData {
  name?: string;
  avatar?: string;
  preferences?: UserPreferences;
  voiceId?: string;
  voiceSpeed?: number;
}

export interface UserPreferences {
  theme?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sound?: boolean;
  };
  dashboard?: {
    defaultView?: string;
    widgets?: string[];
  };
  ai?: {
    autoSuggestions?: boolean;
    proactivity?: string;
    voice?: {
      autoPlay?: boolean;
      speed?: number;
    };
  };
  [key: string]: string | number | boolean | object | undefined; // Allow for additional custom preferences
}
