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
  defaultValue?: any;
}

export interface PromptExample {
  input: Record<string, any>;
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

export interface PromptContext {
  user: {
    id: string;
    name: string;
    preferences: Record<string, any>;
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

export interface IntegrationContext {
  provider: string;
  data: Record<string, any>;
}

export interface RecentAction {
  type: string;
  timestamp: Date;
  result: any;
}