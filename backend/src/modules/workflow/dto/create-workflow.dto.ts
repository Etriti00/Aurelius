import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTriggerDto } from './trigger.dto';

export class CreateWorkflowDto {
  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Workflow description' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Workflow triggers',
    type: [CreateTriggerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTriggerDto)
  triggers: CreateTriggerDto[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string | number | boolean | null>;

  constructor() {
    this.name = '';
    this.description = '';
    this.triggers = [];
  }
}

export class CreateFromTemplateDto {
  @ApiProperty({ description: 'Template ID' })
  @IsString()
  templateId: string;

  @ApiPropertyOptional({ description: 'Customizations for the template' })
  @IsObject()
  @IsOptional()
  customizations?: {
    triggers?: Record<string, string | number | boolean | null>;
    actions?: Record<string, string | number | boolean | null>;
  };

  constructor() {
    this.templateId = '';
  }
}
