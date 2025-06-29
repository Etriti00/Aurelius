import { IsNumber, IsOptional, Min, IsDate, IsEnum } from 'class-validator';
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
  metadata?: Record<string, string | number | boolean>;

  constructor() {
    this.action = UsageAction.AI_REQUEST;
  }
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

  constructor() {
    this.id = '';
    this.userId = '';
    this.action = UsageAction.AI_REQUEST;
    this.quantity = 0;
    this.timestamp = new Date();
    this.billingPeriod = {
      start: new Date(),
      end: new Date(),
    };
  }
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

  constructor() {
    this.userId = '';
    this.period = {
      start: new Date(),
      end: new Date(),
    };
    this.totalAiRequests = 0;
    this.totalEmailsProcessed = 0;
    this.totalTasksAutomated = 0;
    this.usageByAction = {};
    this.dailyUsage = [];
    this.percentageUsed = 0;
    this.remaining = 0;
  }
}
