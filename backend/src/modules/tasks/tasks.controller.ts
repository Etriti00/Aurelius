import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TasksService, CreateTaskDto, UpdateTaskDto, TaskFilters } from './tasks.service'
import { TaskStatus, Priority } from '@prisma/client'

export class CreateTaskBodyDto {
  title: string
  description?: string
  priority?: Priority
  status?: TaskStatus
  dueDate?: string // ISO string
  source?: string
  sourceMetadata?: Record<string, unknown>
  aiContext?: Record<string, unknown>
}

export class UpdateTaskBodyDto {
  title?: string
  description?: string
  priority?: Priority
  status?: TaskStatus
  dueDate?: string // ISO string
  source?: string
  sourceMetadata?: Record<string, unknown>
  aiContext?: Record<string, unknown>
}

export class BulkUpdateDto {
  updates: Array<{,
    id: string,
    data: UpdateTaskBodyDto
  }>
}

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async create(@Body() dto: CreateTaskBodyDto, @Request() req: unknown) {
    if (!dto.title?.trim()) {
      throw new BadRequestException('Task title is required')
    }
  }

    const createDto: CreateTaskDto = {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    }

    return await this.tasksService.create(req.user.sub, createDto)
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiQuery({ name: 'status', enum: TaskStatus, required: false })
  @ApiQuery({ name: 'priority', enum: Priority, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'endDate', type: String, required: false, description: 'ISO date string' })
  async findAll(
    @Request() req: unknown,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: Priority,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: TaskFilters = {}

    if (status) filters.status = status
    if (priority) filters.priority = priority
    if (search) filters.search = search

    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      }
    }

    return await this.tasksService.findAll(req.user.sub, filters)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Task statistics retrieved successfully' })
  async getStats(@Request() req: unknown) {
    return await this.tasksService.getTaskStats(req.user.sub)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific task by ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    return await this.tasksService.findOne(id, req.user.sub)
  }

  @Get(':id/analysis')
  @ApiOperation({ summary: 'Get AI analysis for a specific task' })
  @ApiResponse({ status: 200, description: 'Task analysis retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getAnalysis(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    return await this.tasksService.getAnalysis(id, req.user.sub)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a specific task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskBodyDto,
    @Request() req: unknown,
  ) {
    const updateDto: UpdateTaskDto = {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    }

    return await this.tasksService.update(id, req.user.sub, updateDto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    await this.tasksService.remove(id, req.user.sub)
    return { message: 'Task deleted successfully' }
  }

  @Put('bulk')
  @ApiOperation({ summary: 'Bulk update multiple tasks' })
  @ApiResponse({ status: 200, description: 'Tasks updated successfully' })
  async bulkUpdate(@Body() dto: BulkUpdateDto, @Request() req: unknown) {
    if (!dto.updates || dto.updates.length === 0) {
      throw new BadRequestException('No updates provided')
    }
  }

    if (dto.updates.length > 50) {
      throw new BadRequestException('Maximum 50 tasks can be updated at once')
    }

    const updates = dto.updates.map(update => ({
      id: update.id,
      data: {
        ...update.data,
        dueDate: update.data.dueDate ? new Date(update.data.dueDate) : undefined,
      },
    }))

    return await this.tasksService.bulkUpdate(req.user.sub, updates)
  }

  // Convenience endpoints for common task operations
  @Put(':id/status')
  @ApiOperation({ summary: 'Update task status' })
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { status: TaskStatus },
    @Request() req: unknown,
  ) {
    if (!dto.status) {
      throw new BadRequestException('Status is required')
    }

    return await this.tasksService.update(id, req.user.sub, { status: dto.status })
  }

  @Put(':id/priority')
  @ApiOperation({ summary: 'Update task priority' })
  @ApiResponse({ status: 200, description: 'Task priority updated successfully' })
  async updatePriority(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { priority: Priority },
    @Request() req: unknown,
  ) {
    if (!dto.priority) {
      throw new BadRequestException('Priority is required')
    }

    return await this.tasksService.update(id, req.user.sub, { priority: dto.priority })
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Mark task as completed' })
  @ApiResponse({ status: 200, description: 'Task marked as completed' })
  async complete(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    return await this.tasksService.update(id, req.user.sub, { status: TaskStatus.COMPLETED })
  }

  @Put(':id/start')
  @ApiOperation({ summary: 'Start working on task' })
  @ApiResponse({ status: 200, description: 'Task marked as in progress' })
  async start(@Param('id', ParseUUIDPipe) id: string, @Request() req: unknown) {
    return await this.tasksService.update(id, req.user.sub, { status: TaskStatus.IN_PROGRESS })
  }

  // Advanced filtering endpoints
  @Get('filter/overdue')
  @ApiOperation({ summary: 'Get overdue tasks' })
  @ApiResponse({ status: 200, description: 'Overdue tasks retrieved successfully' })
  async getOverdue(@Request() req: unknown) {
    const tasks = await this.tasksService.findAll(req.user.sub)
    const now = new Date()
  }

    return tasks.filter(
      task => task.dueDate && task.dueDate < now && task.status !== TaskStatus.COMPLETED,
    )
  }

  @Get('filter/due-today')
  @ApiOperation({ summary: 'Get tasks due today' })
  @ApiResponse({ status: 200, description: 'Tasks due today retrieved successfully' })
  async getDueToday(@Request() req: unknown) {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  }

    return await this.tasksService.findAll(req.user.sub, {
      dateRange: {,
        start: startOfDay,
        end: endOfDay,
      },
    })
  }

  @Get('filter/high-priority')
  @ApiOperation({ summary: 'Get high priority tasks' })
  @ApiResponse({ status: 200, description: 'High priority tasks retrieved successfully' })
  async getHighPriority(@Request() req: unknown) {
    return await this.tasksService.findAll(req.user.sub, { priority: Priority.HIGH })
  }

  @Get('filter/urgent')
  @ApiOperation({ summary: 'Get urgent tasks' })
  @ApiResponse({ status: 200, description: 'Urgent tasks retrieved successfully' })
  async getUrgent(@Request() req: unknown) {
    return await this.tasksService.findAll(req.user.sub, { priority: Priority.URGENT })
  }

}