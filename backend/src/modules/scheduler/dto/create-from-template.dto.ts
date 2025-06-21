import { IsString, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobSchedule, JobAction } from '../interfaces';

export class CreateFromTemplateDto {
  @ApiProperty({ description: 'Template ID to use' })
  @IsString()
  templateId: string = '';

  @ApiPropertyOptional({ description: 'Custom job name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Schedule customizations', type: Object })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  schedule?: Partial<JobSchedule>;

  @ApiPropertyOptional({ description: 'Action customizations', type: Object })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  action?: Partial<JobAction>;

  constructor(partial: Partial<CreateFromTemplateDto> = {}) {
    Object.assign(this, partial);
  }
}