import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum AIModel {
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307',
  CLAUDE_3_SONNET = 'claude-3-sonnet-20240229',
  CLAUDE_3_OPUS = 'claude-3-opus-20240229',
  CLAUDE_3_5_SONNET = 'claude-3-5-sonnet-20241022',
}

export class ChatMessageDto {
  @ApiProperty({
    description: 'Role of the message sender',
    enum: ChatRole,
    example: ChatRole.USER,
  })
  @IsEnum(ChatRole)
  role: ChatRole;

  @ApiProperty({
    description: 'Content of the message',
    example: 'Help me create a task for preparing the quarterly report',
  })
  @IsString()
  content: string;

  constructor(data: Partial<ChatMessageDto>) {
    this.role = data.role ?? ChatRole.USER;
    this.content = data.content ?? '';
    this.timestamp = data.timestamp;
  }

  @ApiPropertyOptional({
    description: 'Timestamp when message was created',
    example: '2024-12-24T10:00:00Z',
  })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class ChatContextDto {
  @ApiPropertyOptional({
    description: 'Current user tasks for context',
    example: [{ id: 'task-123', title: 'Complete documentation', status: 'in_progress' }],
    type: 'array',
    items: { type: 'object' },
  })
  @IsOptional()
  tasks?: Array<{ id: string; title: string; status: string }>;

  @ApiPropertyOptional({
    description: 'Recent emails for context',
    example: [{ id: 'email-123', subject: 'Project Update', from: 'manager@company.com' }],
    type: 'array',
    items: { type: 'object' },
  })
  @IsOptional()
  emails?: Array<{ id: string; subject: string; from: string }>;

  @ApiPropertyOptional({
    description: 'Upcoming calendar events for context',
    example: [{ id: 'event-123', title: 'Team Meeting', startTime: '2024-12-25T14:00:00Z' }],
    type: 'array',
    items: { type: 'object' },
  })
  @IsOptional()
  events?: Array<{ id: string; title: string; startTime: string }>;

  @ApiPropertyOptional({
    description: 'Current user location',
    example: 'New York, NY',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  constructor(data: Partial<ChatContextDto>) {
    this.tasks = data.tasks;
    this.emails = data.emails;
    this.events = data.events;
    this.location = data.location;
    this.timezone = data.timezone;
  }
}

export class ChatRequestDto {
  @ApiProperty({
    description: 'Array of chat messages in conversation',
    type: [ChatMessageDto],
    example: [
      {
        role: 'user',
        content: 'Help me prioritize my tasks for today',
        timestamp: '2024-12-24T10:00:00Z',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional({
    description: 'AI model to use for the chat',
    enum: AIModel,
    example: AIModel.CLAUDE_3_SONNET,
    default: AIModel.CLAUDE_3_SONNET,
  })
  @IsOptional()
  @IsEnum(AIModel)
  model?: AIModel;

  @ApiPropertyOptional({
    description: 'Temperature for AI response creativity (0-1)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Maximum tokens in the AI response',
    example: 1000,
    minimum: 1,
    maximum: 4000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4000)
  maxTokens?: number;

  @ApiPropertyOptional({
    description: 'Additional context to provide to the AI',
    type: ChatContextDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatContextDto)
  context?: ChatContextDto;

  @ApiPropertyOptional({
    description: 'Whether to include user data context automatically',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeContext?: boolean;

  @ApiPropertyOptional({
    description: 'Whether AI should suggest actionable items',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  suggestActions?: boolean;

  @ApiPropertyOptional({
    description: 'Conversation ID for maintaining context across messages',
    example: 'conv-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'System prompt override for specific use cases',
    example: 'You are a productivity assistant focused on task management',
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  constructor(data: Partial<ChatRequestDto>) {
    this.messages = data.messages ?? [];
    this.model = data.model;
    this.temperature = data.temperature;
    this.maxTokens = data.maxTokens;
    this.context = data.context;
    this.includeContext = data.includeContext;
    this.suggestActions = data.suggestActions;
    this.conversationId = data.conversationId;
    this.systemPrompt = data.systemPrompt;
  }
}
