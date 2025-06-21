import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsBoolean, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TriggerType, ConditionOperator } from '../interfaces';

export class TriggerConditionDto {
  @ApiProperty({ description: 'Field to check' })
  @IsString()
  field: string;

  @ApiProperty({ enum: ConditionOperator, description: 'Comparison operator' })
  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @ApiProperty({ description: 'Value to compare against' })
  value: any;

  @ApiPropertyOptional({ 
    enum: ['AND', 'OR'],
    description: 'Logical operator for next condition'
  })
  @IsEnum(['AND', 'OR'])
  @IsOptional()
  logicalOperator?: 'AND' | 'OR';

  constructor() {
    this.field = '';
    this.operator = ConditionOperator.EQUALS;
    this.value = '';
  }
}

export class CreateTriggerDto {
  @ApiProperty({ enum: TriggerType, description: 'Trigger type' })
  @IsEnum(TriggerType)
  type: TriggerType;

  @ApiProperty({ 
    description: 'Trigger conditions',
    type: [TriggerConditionDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriggerConditionDto)
  conditions: TriggerConditionDto[];

  @ApiProperty({ description: 'Enable trigger immediately' })
  @IsBoolean()
  enabled: boolean = true;

  @ApiPropertyOptional({ description: 'Trigger metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  constructor() {
    this.type = TriggerType.EMAIL_RECEIVED;
    this.conditions = [];
  }
}

export class TriggerResponseDto {
  @ApiProperty({ description: 'Trigger ID' })
  id: string;

  @ApiProperty({ enum: TriggerType, description: 'Trigger type' })
  type: TriggerType;

  @ApiProperty({ description: 'Trigger conditions' })
  conditions: TriggerConditionDto[];

  @ApiProperty({ description: 'Is trigger enabled' })
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Trigger metadata' })
  metadata?: Record<string, any>;

  constructor() {
    this.id = '';
    this.type = TriggerType.EMAIL_RECEIVED;
    this.conditions = [];
    this.enabled = false;
  }
}

export class TestTriggerDto {
  @ApiPropertyOptional({ description: 'Test data for trigger' })
  @IsObject()
  @IsOptional()
  testData?: Record<string, any>;
}