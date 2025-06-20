import { IsString, IsObject, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JobSchedule, JobAction } from '../interfaces';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobDto {
  @ApiPropertyOptional({ description: 'Job name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Job description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Job schedule configuration', type: Object })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  schedule?: JobSchedule;

  @ApiPropertyOptional({ description: 'Job action configuration', type: Object })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  action?: JobAction;

  @ApiPropertyOptional({ description: 'Whether job is enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}