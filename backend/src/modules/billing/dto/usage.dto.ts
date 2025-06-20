import { IsNumber, IsOptional, IsString, Min, IsDate, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum UsageAction {
  AI_REQUEST = 'ai_request',
  EMAIL_PROCESSED = 'email_processed',
  TASK_AUTOMATED = 'task_automated',
  INTEGRATION_SYNC = 'integration_sync',
  DOCUMENT_ANALYZED = 'document_analyzed',
  MEETING_PREPARED = 'meeting_prepared',
}

export class RecordUsageDto {
  @ApiProperty({ enum: UsageAction, description: 'Type of usage action' })
  @IsEnum(UsageAction)
  action: UsageAction;

  @ApiProperty({ description: 'Quantity of usage', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number = 1;

  @ApiPropertyOptional({ description: 'Timestamp of usage' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  timestamp?: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UsageResponseDto {
  @ApiProperty({ description: 'Usage record ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Action type' })
  action: UsageAction;

  @ApiProperty({ description: 'Quantity used' })
  quantity: number;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Billing period' })
  billingPeriod: {
    start: Date;
    end: Date;
  };
}

export class UsageSummaryDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Billing period' })
  period: {
    start: Date;
    end: Date;
  };

  @ApiProperty({ description: 'Total AI requests' })
  totalAiRequests: number;

  @ApiProperty({ description: 'Total emails processed' })
  totalEmailsProcessed: number;

  @ApiProperty({ description: 'Total tasks automated' })
  totalTasksAutomated: number;

  @ApiProperty({ description: 'Usage by action' })
  usageByAction: Record<string, number>;

  @ApiProperty({ description: 'Daily usage trend' })
  dailyUsage: Array<{
    date: Date;
    count: number;
  }>;

  @ApiProperty({ description: 'Percentage of limit used' })
  percentageUsed: number;

  @ApiProperty({ description: 'Remaining allowance' })
  remaining: number;
}