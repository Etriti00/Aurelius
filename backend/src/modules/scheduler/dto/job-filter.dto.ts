import { IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { JobType } from '../interfaces';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class JobFilterDto {
  @ApiPropertyOptional({ enum: JobType, description: 'Filter by job type' })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiPropertyOptional({ description: 'Filter by enabled status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Filter jobs created after this date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter jobs created before this date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
