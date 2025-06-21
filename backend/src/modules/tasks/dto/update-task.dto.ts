import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';
import { CreateTaskDto, TaskStatus } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({
    description: 'Task status',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Actual time taken to complete the task in minutes',
    example: 95,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  actualMinutes?: number;

  @ApiPropertyOptional({
    description: 'Task start date and time (ISO 8601 format)',
    example: '2024-12-24T09:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Task completion date and time (ISO 8601 format)',
    example: '2024-12-24T10:35:00Z',
  })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional({
    description: 'Completion percentage (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;
}
