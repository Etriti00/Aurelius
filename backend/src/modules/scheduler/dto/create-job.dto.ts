import { IsString, IsObject, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { JobSchedule, JobAction, JobMetadata } from '../interfaces';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ description: 'Job name' })
  @IsString()
  name: string = '';

  @ApiProperty({ description: 'Job description' })
  @IsString()
  description: string = '';

  @ApiProperty({ description: 'Job schedule configuration', type: Object })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  schedule: JobSchedule = {} as JobSchedule;

  @ApiProperty({ description: 'Job action configuration', type: Object })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  action: JobAction = {} as JobAction;

  @ApiPropertyOptional({ description: 'Additional metadata', type: Object })
  @IsOptional()
  @IsObject()
  metadata?: JobMetadata;

  @ApiPropertyOptional({ description: 'Whether job is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  constructor(partial: Partial<CreateJobDto> = {}) {
    Object.assign(this, partial);
  }
}
