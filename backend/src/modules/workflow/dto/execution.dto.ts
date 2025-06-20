import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExecutionStatus, InsightType, SuggestionType, ActionType } from '../interfaces';

export class ExecutionInsightDto {
  @ApiProperty({ enum: InsightType, description: 'Insight type' })
  type: InsightType;

  @ApiProperty({ description: 'Insight title' })
  title: string;

  @ApiProperty({ description: 'Insight description' })
  description: string;

  @ApiProperty({ description: 'Additional data' })
  data: Record<string, any>;

  @ApiProperty({ 
    enum: ['low', 'medium', 'high', 'critical'],
    description: 'Importance level'
  })
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export class ExecutionSuggestionDto {
  @ApiProperty({ description: 'Suggestion ID' })
  id: string;

  @ApiProperty({ enum: SuggestionType, description: 'Suggestion type' })
  type: SuggestionType;

  @ApiProperty({ description: 'Suggestion title' })
  title: string;

  @ApiProperty({ description: 'Suggestion description' })
  description: string;

  @ApiProperty({ description: 'Priority (1-10)' })
  priority: number;

  @ApiProperty({ description: 'Estimated impact' })
  estimatedImpact: {
    timeSaved?: number;
    effortReduced?: number;
    riskMitigated?: number;
  };

  @ApiProperty({ description: 'Reasoning for suggestion' })
  reasoning: string;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  confidence: number;
}

export class ExecutedActionDto {
  @ApiProperty({ description: 'Action ID' })
  actionId: string;

  @ApiProperty({ description: 'Execution timestamp' })
  executedAt: Date;

  @ApiProperty({ description: 'Execution duration in ms' })
  duration: number;

  @ApiProperty({ 
    enum: ['success', 'failed', 'skipped'],
    description: 'Execution status'
  })
  status: 'success' | 'failed' | 'skipped';

  @ApiProperty({ description: 'Input parameters' })
  input: Record<string, any>;

  @ApiPropertyOptional({ description: 'Output data' })
  output?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}

export class ExecutionResultDto {
  @ApiProperty({ 
    enum: ['success', 'warning', 'error', 'info'],
    description: 'Result type'
  })
  type: 'success' | 'warning' | 'error' | 'info';

  @ApiProperty({ description: 'Result message' })
  message: string;

  @ApiPropertyOptional({ description: 'Additional data' })
  data?: Record<string, any>;
}

export class WorkflowExecutionDto {
  @ApiProperty({ description: 'Execution ID' })
  id: string;

  @ApiProperty({ description: 'Workflow ID' })
  workflowId: string;

  @ApiProperty({ enum: ExecutionStatus, description: 'Execution status' })
  status: ExecutionStatus;

  @ApiProperty({ description: 'Start time' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Completion time' })
  completedAt?: Date;

  @ApiProperty({ description: 'Analysis insights' })
  insights: ExecutionInsightDto[];

  @ApiProperty({ description: 'Generated suggestions' })
  suggestions: ExecutionSuggestionDto[];

  @ApiProperty({ description: 'Selected suggestion IDs' })
  selectedSuggestions: string[];

  @ApiProperty({ description: 'Executed actions' })
  executedActions: ExecutedActionDto[];

  @ApiProperty({ description: 'Execution results' })
  results: ExecutionResultDto[];

  @ApiPropertyOptional({ description: 'Error details if failed' })
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };

  @ApiProperty({ description: 'Analysis confidence score' })
  confidence: number;
}

export class ExecutionListDto {
  @ApiProperty({ description: 'Execution ID' })
  id: string;

  @ApiProperty({ description: 'Workflow ID' })
  workflowId: string;

  @ApiProperty({ description: 'Workflow name' })
  workflowName: string;

  @ApiProperty({ enum: ExecutionStatus, description: 'Status' })
  status: ExecutionStatus;

  @ApiProperty({ description: 'Start time' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Completion time' })
  completedAt?: Date;

  @ApiProperty({ description: 'Actions executed' })
  actionsExecuted: number;

  @ApiProperty({ description: 'Success count' })
  successCount: number;
}