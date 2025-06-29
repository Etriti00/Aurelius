import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

import { TasksService } from './tasks.service';
import type { TaskFilters } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTaskDto, TaskStatus, TaskPriority } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskResponseDto, TaskInsightsDto } from './dto/task-response.dto';
import { PaginatedResponseDto, ErrorResponseDto } from '../../common/dto/api-response.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Interface for authenticated user in requests
export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
}

// Interface for task query filters
export interface TaskQueryFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  labels?: string;
  dueBefore?: string;
  dueAfter?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Interface for task completion data
export interface TaskCompletionData {
  actualMinutes?: number;
  notes?: string;
}

// Interface for bulk operation request
export interface BulkOperationRequest {
  operation: 'update' | 'delete' | 'complete';
  taskIds: string[];
  data?: Partial<UpdateTaskDto>;
}

// Interface for bulk operation response
export interface BulkOperationResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

@ApiTags('tasks')
@Controller('tasks')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user tasks',
    description:
      'Retrieve a paginated list of tasks for the authenticated user with optional filtering and sorting.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of tasks per page',
    example: 10,
    type: Number,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter tasks by status',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    description: 'Filter tasks by priority',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search tasks by title or description',
    example: 'documentation',
    type: String,
  })
  @ApiQuery({
    name: 'labels',
    required: false,
    description: 'Filter tasks by labels (comma-separated)',
    example: 'project,urgent',
    type: String,
  })
  @ApiQuery({
    name: 'dueBefore',
    required: false,
    description: 'Filter tasks due before this date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
    type: String,
  })
  @ApiQuery({
    name: 'dueAfter',
    required: false,
    description: 'Filter tasks due after this date (ISO 8601)',
    example: '2024-12-01T00:00:00Z',
    type: String,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort tasks by field',
    example: 'dueDate',
    enum: ['createdAt', 'updatedAt', 'dueDate', 'priority', 'title'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    type: PaginatedResponseDto<TaskResponseDto>,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
    type: ErrorResponseDto,
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationDto & TaskQueryFilters
  ): Promise<PaginatedResponseDto<TaskResponseDto>> {
    const filters: TaskFilters = {
      ...query,
      page: query.page ? String(query.page) : undefined,
      limit: query.limit ? String(query.limit) : undefined,
    };
    return this.tasksService.findAll(user.id, filters);
  }

  @Get('insights')
  @ApiOperation({
    summary: 'Get task insights and analytics',
    description:
      'Retrieve AI-powered insights about user task patterns, productivity metrics, and recommendations.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Time period for analysis',
    example: 'month',
    enum: ['week', 'month', 'quarter', 'year'],
  })
  @ApiResponse({
    status: 200,
    description: 'Task insights retrieved successfully',
    type: TaskInsightsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async getInsights(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: string
  ): Promise<TaskInsightsDto> {
    return this.tasksService.getInsights(user.id, period);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get task by ID',
    description: 'Retrieve a specific task by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique task identifier',
    example: 'task-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto
  ): Promise<TaskResponseDto> {
    return this.tasksService.findOne(user.id, params.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create new task',
    description: 'Create a new task with optional AI enhancement and smart scheduling suggestions.',
  })
  @ApiBody({
    type: CreateTaskDto,
    description: 'Task creation data',
    examples: {
      basic: {
        summary: 'Basic task',
        value: {
          title: 'Complete project documentation',
          description: 'Write comprehensive docs for the new feature',
          priority: 'high',
          dueDate: '2024-12-25T17:00:00Z',
          estimatedMinutes: 120,
          labels: ['documentation', 'project'],
        },
      },
      aiSuggested: {
        summary: 'AI-suggested task',
        value: {
          title: 'Follow up on client meeting',
          description: "Send summary and action items from today's client call",
          priority: 'medium',
          aiSuggested: true,
          aiReason: 'Identified from calendar event completion',
          aiConfidence: 0.9,
          labels: ['client', 'follow-up'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createTaskDto: CreateTaskDto
  ): Promise<TaskResponseDto> {
    const taskData = {
      ...createTaskDto,
      dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : undefined,
    };
    return this.tasksService.create(user.id, taskData);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update entire task',
    description: 'Replace the entire task with new data (full update).',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique task identifier',
    example: 'task-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateTaskDto,
    description: 'Complete task update data',
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() updateTaskDto: UpdateTaskDto
  ): Promise<TaskResponseDto> {
    const taskData = {
      ...updateTaskDto,
      dueDate: updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : undefined,
      startDate: updateTaskDto.startDate ? new Date(updateTaskDto.startDate) : undefined,
      completedAt: updateTaskDto.completedAt ? new Date(updateTaskDto.completedAt) : undefined,
    };
    return this.tasksService.update(user.id, params.id, taskData);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Partially update task',
    description: 'Update specific fields of a task (partial update).',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique task identifier',
    example: 'task-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateTaskDto,
    description: 'Partial task update data',
    examples: {
      statusUpdate: {
        summary: 'Update status only',
        value: {
          status: 'completed',
          completedAt: '2024-12-24T15:30:00Z',
          actualMinutes: 95,
        },
      },
      priorityUpdate: {
        summary: 'Update priority',
        value: {
          priority: 'urgent',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async partialUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() updateTaskDto: Partial<UpdateTaskDto>
  ): Promise<TaskResponseDto> {
    const taskData = {
      ...updateTaskDto,
      dueDate: updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : undefined,
      startDate: updateTaskDto.startDate ? new Date(updateTaskDto.startDate) : undefined,
      completedAt: updateTaskDto.completedAt ? new Date(updateTaskDto.completedAt) : undefined,
    };
    return this.tasksService.update(user.id, params.id, taskData);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark task as completed',
    description: 'Mark a task as completed with automatic time tracking and AI insights.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique task identifier',
    example: 'task-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        actualMinutes: {
          type: 'number',
          description: 'Actual time taken to complete the task',
          example: 95,
        },
        notes: {
          type: 'string',
          description: 'Completion notes or comments',
          example: 'Task completed ahead of schedule',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Task marked as completed successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Task cannot be completed (already completed or invalid state)',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() body?: TaskCompletionData
  ): Promise<TaskResponseDto> {
    return this.tasksService.complete(user.id, params.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete task',
    description: 'Soft delete a task (moves to trash, can be restored).',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique task identifier',
    example: 'task-123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Task deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto): Promise<void> {
    await this.tasksService.delete(user.id, params.id);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk operations on tasks',
    description: 'Perform bulk operations (update, delete, complete) on multiple tasks.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['update', 'delete', 'complete'],
          description: 'Bulk operation to perform',
          example: 'complete',
        },
        taskIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task IDs to operate on',
          example: ['task-1', 'task-2', 'task-3'],
        },
        data: {
          type: 'object',
          description: 'Data to apply (for update operations)',
          example: { priority: 'high', labels: ['urgent'] },
        },
      },
      required: ['operation', 'taskIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        processed: { type: 'number', example: 3 },
        failed: { type: 'number', example: 0 },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid bulk operation data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async bulkOperation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: BulkOperationRequest
  ): Promise<BulkOperationResponse> {
    const transformedBody = {
      ...body,
      data: body.data
        ? {
            ...body.data,
            dueDate: body.data.dueDate ? new Date(body.data.dueDate) : undefined,
            startDate: body.data.startDate ? new Date(body.data.startDate) : undefined,
            completedAt: body.data.completedAt ? new Date(body.data.completedAt) : undefined,
          }
        : undefined,
    };
    return this.tasksService.bulkOperation(user.id, transformedBody);
  }
}
