import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TriggerResponseDto } from './trigger.dto';

export class WorkflowResponseDto {
  @ApiProperty({ description: 'Workflow ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Workflow name' })
  name: string;

  @ApiProperty({ description: 'Workflow description' })
  description: string;

  @ApiProperty({ description: 'Is workflow enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'Workflow triggers' })
  triggers: TriggerResponseDto[];

  @ApiProperty({ description: 'Total executions' })
  executionCount: number;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;

  constructor() {
    this.id = '';
    this.userId = '';
    this.name = '';
    this.description = '';
    this.enabled = false;
    this.triggers = [];
    this.executionCount = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

export class WorkflowMetricsDto {
  @ApiProperty({ description: 'Workflow ID' })
  workflowId: string;

  @ApiProperty({ description: 'Total executions' })
  executionCount: number;

  @ApiProperty({ description: 'Success rate (0-1)' })
  successRate: number;

  @ApiProperty({ description: 'Average execution time (ms)' })
  averageExecutionTime: number;

  @ApiProperty({ description: 'Total time saved (minutes)' })
  timeSaved: number;

  @ApiProperty({ description: 'Total actions executed' })
  actionsExecuted: number;

  @ApiPropertyOptional({ description: 'Last execution date' })
  lastExecuted?: Date;

  @ApiPropertyOptional({ description: 'User satisfaction score (0-10)' })
  userSatisfaction?: number;

  constructor() {
    this.workflowId = '';
    this.executionCount = 0;
    this.successRate = 0;
    this.averageExecutionTime = 0;
    this.timeSaved = 0;
    this.actionsExecuted = 0;
  }
}

export class CreateWorkflowResponseDto {
  @ApiProperty({ description: 'Workflow ID' })
  workflowId: string;

  @ApiProperty({ description: 'Created triggers' })
  triggers: TriggerResponseDto[];

  constructor() {
    this.workflowId = '';
    this.triggers = [];
  }
}
