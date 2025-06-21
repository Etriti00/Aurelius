import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIModel } from './chat-request.dto';

export class AIUsageDto {
  @ApiProperty({
    description: 'Number of tokens in the prompt',
    example: 150,
  })
  promptTokens: number;

  @ApiProperty({
    description: 'Number of tokens in the completion',
    example: 75,
  })
  completionTokens: number;

  @ApiProperty({
    description: 'Total tokens used',
    example: 225,
  })
  totalTokens: number;

  @ApiProperty({
    description: 'Cost of this request in USD',
    example: 0.0045,
  })
  cost: number;

  constructor(data: Partial<AIUsageDto>) {
    this.promptTokens = data.promptTokens !== undefined ? data.promptTokens : 0;
    this.completionTokens = data.completionTokens !== undefined ? data.completionTokens : 0;
    this.totalTokens = data.totalTokens !== undefined ? data.totalTokens : 0;
    this.cost = data.cost !== undefined ? data.cost : 0;
  }
}

export class SuggestedActionDto {
  @ApiProperty({
    description: 'Type of suggested action',
    example: 'create_task',
    enum: ['create_task', 'schedule_event', 'send_email', 'set_reminder', 'create_workflow'],
  })
  type: string;

  @ApiProperty({
    description: 'Human-readable description of the action',
    example: 'Create a task to prepare quarterly report by Friday',
  })
  description: string;

  @ApiProperty({
    description: 'Parameters for executing the action',
    example: {
      title: 'Prepare quarterly report',
      dueDate: '2024-12-27T17:00:00Z',
      priority: 'high',
      labels: ['quarterly', 'report']
    },
    type: 'object',
  })
  parameters: any;

  @ApiProperty({
    description: 'AI confidence in this suggestion (0-1)',
    example: 0.85,
  })
  confidence: number;

  @ApiProperty({
    description: 'Unique identifier for this suggestion',
    example: 'suggestion-123',
  })
  id: string;

  constructor(data: Partial<SuggestedActionDto>) {
    this.type = data.type !== undefined ? data.type : '';
    this.description = data.description !== undefined ? data.description : '';
    this.parameters = data.parameters;
    this.confidence = data.confidence !== undefined ? data.confidence : 0;
    this.id = data.id !== undefined ? data.id : '';
  }
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'AI assistant response message',
    example: 'I can help you prioritize your tasks. Based on your upcoming deadlines, I suggest focusing on the quarterly report first as it\'s due Friday.',
  })
  response: string;

  @ApiProperty({
    description: 'AI model used for generation',
    enum: AIModel,
    example: AIModel.CLAUDE_3_SONNET,
  })
  model: AIModel;

  @ApiProperty({
    description: 'Token usage and cost information',
    type: AIUsageDto,
  })
  usage: AIUsageDto;

  @ApiProperty({
    description: 'Response generation timestamp',
    example: '2024-12-24T10:00:15Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Unique identifier for this conversation turn',
    example: 'turn-123e4567-e89b-12d3-a456-426614174000',
  })
  conversationTurnId: string;

  @ApiPropertyOptional({
    description: 'Conversation ID for maintaining context',
    example: 'conv-123e4567-e89b-12d3-a456-426614174000',
  })
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'AI-suggested actionable items',
    type: [SuggestedActionDto],
  })
  suggestedActions?: SuggestedActionDto[];

  @ApiPropertyOptional({
    description: 'Follow-up questions the AI suggests',
    example: [
      'Would you like me to create this task for you?',
      'Should I schedule time for working on the report?'
    ],
    type: [String],
  })
  followUpQuestions?: string[];

  @ApiPropertyOptional({
    description: 'Context that was used in generating the response',
    example: {
      tasksConsidered: 3,
      eventsConsidered: 2,
      emailsConsidered: 1
    },
    type: 'object',
  })
  contextUsed?: any;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 1250,
  })
  processingTime: number;

  @ApiProperty({
    description: 'Whether the response was successful',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Error message if request failed',
    example: 'Rate limit exceeded',
  })
  error?: string;

  constructor(data: Partial<ChatResponseDto>) {
    this.response = data.response !== undefined ? data.response : '';
    this.model = data.model !== undefined ? data.model : AIModel.CLAUDE_3_SONNET;
    this.usage = data.usage !== undefined ? data.usage : new AIUsageDto({});
    this.timestamp = data.timestamp !== undefined ? data.timestamp : new Date().toISOString();
    this.conversationTurnId = data.conversationTurnId !== undefined ? data.conversationTurnId : '';
    this.conversationId = data.conversationId;
    this.suggestedActions = data.suggestedActions;
    this.followUpQuestions = data.followUpQuestions;
    this.contextUsed = data.contextUsed;
    this.processingTime = data.processingTime !== undefined ? data.processingTime : 0;
    this.success = data.success !== undefined ? data.success : true;
    this.error = data.error;
  }
}

export class ConversationDto {
  @ApiProperty({
    description: 'Unique conversation identifier',
    example: 'conv-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who owns this conversation',
    example: 'user-123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Conversation title or topic',
    example: 'Task prioritization and planning',
  })
  title: string;

  @ApiProperty({
    description: 'Number of messages in conversation',
    example: 8,
  })
  messageCount: number;

  @ApiProperty({
    description: 'Total tokens used in conversation',
    example: 1500,
  })
  totalTokens: number;

  @ApiProperty({
    description: 'Total cost of conversation in USD',
    example: 0.0195,
  })
  totalCost: number;

  @ApiProperty({
    description: 'Conversation creation timestamp',
    example: '2024-12-24T09:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last message timestamp',
    example: '2024-12-24T10:15:00Z',
  })
  lastMessageAt: string;

  @ApiProperty({
    description: 'Whether conversation is archived',
    example: false,
  })
  isArchived: boolean;

  constructor(data: Partial<ConversationDto>) {
    this.id = data.id !== undefined ? data.id : '';
    this.userId = data.userId !== undefined ? data.userId : '';
    this.title = data.title !== undefined ? data.title : '';
    this.messageCount = data.messageCount !== undefined ? data.messageCount : 0;
    this.totalTokens = data.totalTokens !== undefined ? data.totalTokens : 0;
    this.totalCost = data.totalCost !== undefined ? data.totalCost : 0;
    this.createdAt = data.createdAt !== undefined ? data.createdAt : new Date().toISOString();
    this.lastMessageAt = data.lastMessageAt !== undefined ? data.lastMessageAt : new Date().toISOString();
    this.isArchived = data.isArchived !== undefined ? data.isArchived : false;
  }
}
