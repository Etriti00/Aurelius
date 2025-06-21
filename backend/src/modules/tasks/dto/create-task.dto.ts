import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsDateString, IsBoolean, ValidateNested, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

export class TaskLocationDto {
  @ApiProperty({
    description: 'Location name or address',
    example: 'Conference Room A',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Full address',
    example: '123 Main St, New York, NY 10001',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 40.7128,
  })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: -74.0060,
  })
  @IsOptional()
  @IsNumber()
  lng?: number;

  constructor(data: Partial<TaskLocationDto>) {
    this.name = data.name !== undefined ? data.name : '';
    this.address = data.address;
    this.lat = data.lat;
    this.lng = data.lng;
  }
}

export class CreateTaskDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Complete project documentation',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed task description',
    example: 'Create comprehensive documentation for the new AI features including API references and user guides',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Task priority level',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
    default: TaskPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Task due date and time (ISO 8601 format)',
    example: '2024-12-25T15:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Estimated time to complete the task in minutes',
    example: 120,
    minimum: 1,
    maximum: 10080, // 1 week
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10080)
  estimatedMinutes?: number;

  @ApiPropertyOptional({
    description: 'Task labels/tags for categorization',
    example: ['documentation', 'project', 'ai'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiPropertyOptional({
    description: 'Task location information',
    type: TaskLocationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaskLocationDto)
  location?: TaskLocationDto;

  @ApiPropertyOptional({
    description: 'Whether this task was suggested by AI',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  aiSuggested?: boolean;

  @ApiPropertyOptional({
    description: 'AI reasoning for task suggestion (if AI-suggested)',
    example: 'This task was identified as a follow-up to your completed quarterly review',
  })
  @IsOptional()
  @IsString()
  aiReason?: string;

  @ApiPropertyOptional({
    description: 'AI confidence score for the suggestion (0-1)',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  aiConfidence?: number;

  @ApiPropertyOptional({
    description: 'Parent task ID for subtasks',
    example: 'task-parent-123',
  })
  @IsOptional()
  @IsString()
  parentTaskId?: string;

  @ApiPropertyOptional({
    description: 'Project or context this task belongs to',
    example: 'Q4-Documentation-Project',
  })
  @IsOptional()
  @IsString()
  project?: string;

  @ApiPropertyOptional({
    description: 'External task ID for integration purposes',
    example: 'jira-PROJ-123',
  })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({
    description: 'External system name (e.g., jira, asana, trello)',
    example: 'jira',
  })
  @IsOptional()
  @IsString()
  externalSource?: string;

  constructor(data: Partial<CreateTaskDto>) {
    this.title = data.title !== undefined ? data.title : '';
    this.description = data.description;
    this.priority = data.priority;
    this.dueDate = data.dueDate;
    this.estimatedMinutes = data.estimatedMinutes;
    this.labels = data.labels;
    this.location = data.location;
    this.aiSuggested = data.aiSuggested;
    this.aiReason = data.aiReason;
    this.aiConfidence = data.aiConfidence;
    this.parentTaskId = data.parentTaskId;
    this.project = data.project;
    this.externalId = data.externalId;
    this.externalSource = data.externalSource;
  }
}
