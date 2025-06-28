export interface PromptTemplate {
  id: string;
  name: string;
  category: PromptCategory;
  template: string;
  variables: PromptVariable[];
  systemPrompt?: string;
  examples?: PromptExample[];
  maxTokens?: number;
  temperature?: number;
}

export interface PromptVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: string | number | boolean | string[] | Record<string, unknown>;
}

export interface PromptExample {
  input: Record<string, string | number | boolean | null>;
  output: string;
}

export enum PromptCategory {
  EMAIL = 'email',
  TASK = 'task',
  CALENDAR = 'calendar',
  ANALYSIS = 'analysis',
  SUGGESTION = 'suggestion',
  SUMMARY = 'summary',
  CONVERSATION = 'conversation',
  WORKFLOW = 'workflow',
}

export interface UserPreferences {
  emailSignature?: string;
  preferredTone?: 'formal' | 'casual' | 'professional';
  workingHours?: {
    start: string;
    end: string;
  };
  notifications?: {
    email: boolean;
    calendar: boolean;
    tasks: boolean;
  };
  language?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  [key: string]: string | number | boolean | object | undefined;
}

export interface PromptContext {
  user: {
    id: string;
    name: string;
    preferences: UserPreferences;
    timezone: string;
  };
  memory?: AIMemoryContext[];
  integrations?: IntegrationContext[];
  recentActions?: RecentAction[];
}

export interface AIMemoryContext {
  type: string;
  content: string;
  confidence: number;
  lastUsed: Date;
}

export interface IntegrationData {
  emails?: {
    unreadCount: number;
    recentSubjects: string[];
  };
  calendar?: {
    upcomingEvents: Array<{
      title: string;
      startTime: string;
      attendees: string[];
    }>;
  };
  tasks?: {
    pendingCount: number;
    overdueCount: number;
    recentlyCompleted: string[];
  };
  [key: string]: string | number | boolean | object | undefined;
}

export interface IntegrationContext {
  provider: string;
  data: IntegrationData;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: Record<string, string | number | boolean | null>;
  error?: string;
}

export interface RecentAction {
  type: string;
  timestamp: Date;
  result: ActionResult;
}
