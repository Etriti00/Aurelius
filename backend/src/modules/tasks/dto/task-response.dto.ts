import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus, TaskLocationDto } from './create-task.dto';

export class TaskAiInsightsDto {
  @ApiProperty({
    description: 'AI-generated task insights or suggestions',
    example: 'This task is taking longer than usual. Consider breaking it into smaller subtasks.',
  })
  insight: string;

  @ApiProperty({
    description: 'Type of AI insight',
    example: 'time_management',
    enum: ['time_management', 'prioritization', 'optimization', 'completion_tip'],
  })
  type: string;

  @ApiProperty({
    description: 'Confidence score for the AI insight (0-1)',
    example: 0.82,
  })
  confidence: number;

  @ApiProperty({
    description: 'Timestamp when insight was generated',
    example: '2024-12-24T10:00:00Z',
  })
  generatedAt: string;

  constructor(data: Partial<TaskAiInsightsDto>) {
    this.insight = data.insight !== undefined ? data.insight : '';
    this.type = data.type !== undefined ? data.type : '';
    this.confidence = data.confidence !== undefined ? data.confidence : 0;
    this.generatedAt = data.generatedAt !== undefined ? data.generatedAt : new Date().toISOString();
  }
}

export class TaskResponseDto {
  @ApiProperty({
    description: 'Unique task identifier',
    example: 'task-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who owns this task',
    example: 'user-123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Task title',
    example: 'Complete project documentation',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed task description',
    example: 'Create comprehensive documentation for the new AI features',
  })
  description?: string;

  @ApiProperty({
    description: 'Task priority level',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  priority: TaskPriority;

  @ApiProperty({
    description: 'Current task status',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  status: TaskStatus;

  @ApiPropertyOptional({
    description: 'Task due date and time',
    example: '2024-12-25T15:00:00Z',
  })
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Estimated time to complete in minutes',
    example: 120,
  })
  estimatedMinutes?: number;

  @ApiPropertyOptional({
    description: 'Actual time taken to complete in minutes',
    example: 95,
  })
  actualMinutes?: number;

  @ApiPropertyOptional({
    description: 'Task labels/tags',
    example: ['documentation', 'project', 'ai'],
    type: [String],
  })
  labels?: string[];

  @ApiPropertyOptional({
    description: 'Task location information',
    type: TaskLocationDto,
  })
  location?: TaskLocationDto;

  @ApiPropertyOptional({
    description: 'Task start date and time',
    example: '2024-12-24T09:00:00Z',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Task completion date and time',
    example: '2024-12-24T10:35:00Z',
  })
  completedAt?: string;

  @ApiProperty({
    description: 'Completion percentage (0-100)',
    example: 75,
  })
  progress: number;

  @ApiProperty({
    description: 'Whether this task was suggested by AI',
    example: false,
  })
  aiSuggested: boolean;

  @ApiPropertyOptional({
    description: 'AI reasoning for task suggestion',
    example: 'Follow-up task identified from quarterly review completion',
  })
  aiReason?: string;

  @ApiPropertyOptional({
    description: 'AI confidence score for suggestion (0-1)',
    example: 0.85,
  })
  aiConfidence?: number;

  @ApiPropertyOptional({
    description: 'AI-generated insights about this task',
    type: [TaskAiInsightsDto],
  })
  aiInsights?: TaskAiInsightsDto[];

  @ApiPropertyOptional({
    description: 'Parent task ID for subtasks',
    example: 'task-parent-123',
  })
  parentTaskId?: string;

  @ApiPropertyOptional({
    description: 'Array of subtask IDs',
    example: ['subtask-1', 'subtask-2'],
    type: [String],
  })
  subtaskIds?: string[];

  @ApiPropertyOptional({
    description: 'Project or context this task belongs to',
    example: 'Q4-Documentation-Project',
  })
  project?: string;

  @ApiPropertyOptional({
    description: 'External task ID for integration',
    example: 'jira-PROJ-123',
  })
  externalId?: string;

  @ApiPropertyOptional({
    description: 'External system name',
    example: 'jira',
  })
  externalSource?: string;

  @ApiProperty({
    description: 'Task creation timestamp',
    example: '2024-12-24T08:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Task last update timestamp',
    example: '2024-12-24T10:30:00Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Task deletion timestamp (soft delete)',
    example: '2024-12-24T12:00:00Z',
  })
  deletedAt?: string;

  constructor(data: Partial<TaskResponseDto>) {
    this.id = data.id !== undefined ? data.id : '';
    this.userId = data.userId !== undefined ? data.userId : '';
    this.title = data.title !== undefined ? data.title : '';
    this.description = data.description;
    this.priority = data.priority !== undefined ? data.priority : TaskPriority.MEDIUM;
    this.status = data.status !== undefined ? data.status : TaskStatus.PENDING;
    this.dueDate = data.dueDate;
    this.estimatedMinutes = data.estimatedMinutes;
    this.actualMinutes = data.actualMinutes;
    this.labels = data.labels;
    this.location = data.location;
    this.startDate = data.startDate;
    this.completedAt = data.completedAt;
    this.progress = data.progress !== undefined ? data.progress : 0;
    this.aiSuggested = data.aiSuggested !== undefined ? data.aiSuggested : false;
    this.aiReason = data.aiReason;
    this.aiConfidence = data.aiConfidence;
    this.aiInsights = data.aiInsights;
    this.parentTaskId = data.parentTaskId;
    this.subtaskIds = data.subtaskIds;
    this.project = data.project;
    this.externalId = data.externalId;
    this.externalSource = data.externalSource;
    this.createdAt = data.createdAt !== undefined ? data.createdAt : new Date().toISOString();
    this.updatedAt = data.updatedAt !== undefined ? data.updatedAt : new Date().toISOString();
    this.deletedAt = data.deletedAt;
  }
}

export class TaskInsightsDto {
  @ApiProperty({
    description: 'Total number of tasks',
    example: 150,
  })
  totalTasks: number;

  @ApiProperty({
    description: 'Number of completed tasks',
    example: 120,
  })
  completedTasks: number;

  @ApiProperty({
    description: 'Task completion rate as percentage',
    example: 80.0,
  })
  completionRate: number;

  @ApiProperty({
    description: 'Average time to complete tasks in hours',
    example: 2.5,
  })
  averageCompletionTime: number;

  @ApiProperty({
    description: 'Number of overdue tasks',
    example: 5,
  })
  overdueTasks: number;

  @ApiProperty({
    description: 'Most productive day of the week',
    example: 'Tuesday',
  })
  mostProductiveDay: string;

  @ApiProperty({
    description: 'Average daily task completion',
    example: 7.2,
  })
  averageDailyCompletion: number;

  @ApiPropertyOptional({
    description: 'AI-generated productivity insights',
    example: ['You work best in the morning', 'Consider batching similar tasks'],
    type: [String],
  })
  insights?: string[];

  constructor(data: Partial<TaskInsightsDto>) {
    this.totalTasks = data.totalTasks !== undefined ? data.totalTasks : 0;
    this.completedTasks = data.completedTasks !== undefined ? data.completedTasks : 0;
    this.completionRate = data.completionRate !== undefined ? data.completionRate : 0;
    this.averageCompletionTime = data.averageCompletionTime !== undefined ? data.averageCompletionTime : 0;
    this.overdueTasks = data.overdueTasks !== undefined ? data.overdueTasks : 0;
    this.mostProductiveDay = data.mostProductiveDay !== undefined ? data.mostProductiveDay : 'Monday';
    this.averageDailyCompletion = data.averageDailyCompletion !== undefined ? data.averageDailyCompletion : 0;
    this.insights = data.insights;
  }
}
