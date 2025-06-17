import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../common/services/redis.service'
import { AiGatewayService } from '../ai-gateway/ai-gateway.service'
import { Task, TaskStatus, Priority, Prisma } from '@prisma/client'

export interface CreateTaskDto {
  title: string
  description?: string
  priority?: Priority
  status?: TaskStatus
  dueDate?: Date
  source?: string
  sourceMetadata?: Record<string, unknown>
  aiContext?: Record<string, unknown>
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  priority?: Priority
  status?: TaskStatus
  dueDate?: Date
  source?: string
  sourceMetadata?: Record<string, unknown>
  aiContext?: Record<string, unknown>
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: Priority
  dateRange?: {
    start: Date,
    end: Date
  },
  search?: string
}

export interface TaskAnalysis {
  task: Task,
  aiInsights: {,
    priorityAssessment: string,
    estimatedDuration: string,
    suggestedApproach: string,
    dependencies: string[],
    risks: string[]
  },
    relatedTasks: Task[],
  suggestedActions: string[]
}

import { Logger } from '@nestjs/common';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly aiGatewayService: AiGatewayService,
  ) {}

  async create(_userId: string, dto: CreateTaskDto): Promise<Task> {
    try {
      const task = await this.prisma.task.create({
        data: {,
          title: dto.title,
          description: dto.description,
          priority: dto.priority || Priority.MEDIUM,
          status: dto.status || TaskStatus.TODO,
          dueDate: dto.dueDate,
          source: dto.source || 'manual',
          sourceMetadata: dto.sourceMetadata || {},
          aiContext: dto.aiContext || {},
          userId})
  }

      // Invalidate cache
      await this.redisService.invalidateTaskCache(userId)

      // Generate AI insights in the background
      this.generateTaskInsights(task.id, userId).catch(error => {
        this.logger.error('Failed to generate task insights:', error)
      })

      this.logger.debug(`Task created: ${task.id} for user: ${userId}`)
      return task
    }
    } catch (error) {
      this.logger.error('Error creating task:', error)
      throw new BadRequestException('Failed to create task')
    }

    catch (error) {
      console.error('Error in tasks.service.ts:', error)
      throw error
    }
  async findAll(_userId: string, filters?: TaskFilters): Promise<Task[]> {
    try {
    try {
      // Check cache first
      const cacheKey = `tasks:${userId}:${JSON.stringify(filters || {})}`
      const cachedTasks = await this.redisService.getData(cacheKey)
      if (cachedTasks) {
        return cachedTasks as Task[]
      }
  }

      const where: Prisma.TaskWhereInput = {
        userId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.priority && { priority: filters.priority }),
        ...(filters?.dateRange && {
          dueDate: {,
            gte: filters.dateRange.start,
            lte: filters.dateRange.end}),
        ...(filters?.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' },
            { description: { contains: filters.search, mode: 'insensitive' },
          ]})}

      const tasks = await this.prisma.task.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]})

      // Cache results for 5 minutes
      await this.redisService.setData(cacheKey, tasks, 300),

      return tasks
    }
    } catch (error) {
      this.logger.error('Error fetching tasks:', error)
      throw new BadRequestException('Failed to fetch tasks')
    }

  async findOne(id: string, _userId: string): Promise<Task> {
    try {
      const task = await this.prisma.task.findFirst({
        where: { id, userId})
  }

      if (!task) {
        throw new NotFoundException('Task not found')
      },

      return task
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error fetching task:', error)
      throw new BadRequestException('Failed to fetch task')
    }

    catch (error) {
      console.error('Error in tasks.service.ts:', error)
      throw error
    }
  async update(id: string, _userId: string, dto: UpdateTaskDto): Promise<Task> {
    try {
      // Check if task exists
      // Validation check
      await this.findOne(id, userId)
  }

      const updatedTask = await this.prisma.task.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.priority && { priority: dto.priority }),
          ...(dto.status && { status: dto.status }),
          ...(dto.dueDate !== undefined && { dueDate: dto.dueDate }),
          ...(dto.source && { source: dto.source }),
          ...(dto.sourceMetadata && { sourceMetadata: dto.sourceMetadata }),
          ...(dto.aiContext && { aiContext: dto.aiContext })})

      // Invalidate cache
      await this.redisService.invalidateTaskCache(userId)

      // Regenerate AI insights if significant changes
      if (dto.title || dto.description || dto.priority) {
        this.generateTaskInsights(id, userId).catch(error => {
          this.logger.error('Failed to regenerate task insights:', error)
        })
      }

      this.logger.debug(`Task updated: ${id} for user: ${userId}`)
      return updatedTask
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error updating task:', error)
      throw new BadRequestException('Failed to update task')
    }

    catch (error) {
      console.error('Error in tasks.service.ts:', error)
      throw error
    }
  async remove(id: string, _userId: string): Promise<void> {
    try {
      // Check if task exists
      await this.findOne(id, userId)
  }

      await this.prisma.task.delete({
        where: { id })

      // Invalidate cache
      await this.redisService.invalidateTaskCache(userId)

      this.logger.debug(`Task deleted: ${id} for user: ${userId}`)
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error deleting task:', error)
      throw new BadRequestException('Failed to delete task')
    }

    catch (error) {
      console.error('Error in tasks.service.ts:', error)
      throw error
    }
  async getAnalysis(id: string, _userId: string): Promise<TaskAnalysis> {
    try {
      const task = await this.findOne(id, userId)
  }

      // Check for cached analysis
      const cacheKey = `task-analysis:${id}:${task.updatedAt.getTime()}`
      const cachedAnalysis = await this.redisService.getAIResult(cacheKey)
      if (cachedAnalysis) {
        return cachedAnalysis as TaskAnalysis
      }

      // Get AI insights
      const aiResponse = await this.aiGatewayService.generateResponse({
        prompt: `Analyze this task: "${task.title}"${task.description ? `\n\nDescription: ${task.description}` : ''}`,
        systemPrompt: `You are Aurelius, providing task analysis. Analyze the task and respond with a JSON object containing:
{
  "priorityAssessment": "High/Medium/Low with reasoning",
  "estimatedDuration": "Time estimate with explanation",
  "suggestedApproach": "Step-by-step approach",
  "dependencies": ["array of dependencies"],
  "risks": ["array of potential risks"]
}`,
        userId,
        maxTokens: 1024})

      let aiInsights
      try {
        aiInsights = JSON.parse(aiResponse.content)
      } catch {
        // Fallback if JSON parsing fails
        aiInsights = {
          priorityAssessment: 'Analysis pending',
          estimatedDuration: 'To be determined',
          suggestedApproach: aiResponse.content,
          dependencies: [],
          risks: []}

      // Find related tasks
      const relatedTasks = await this.findRelatedTasks(task, userId)

      // Generate suggested actions
      const suggestedActions = await this.generateSuggestedActions(task, userId)

      const analysis: TaskAnalysis = {
        task,
        aiInsights,
        relatedTasks,
        suggestedActions}

      // Cache analysis for 24 hours
      await this.redisService.setAIResult(cacheKey, analysis, 86400),

      return analysis
    }
    } catch (error) {
      this.logger.error('Error generating task analysis:', error)
      throw new BadRequestException('Failed to generate task analysis')
    }

    catch (error) {
      console.error('Error in tasks.service.ts:', error)
      throw error
    }
  async bulkUpdate(
    _userId: string,
    updates: Array<{ id: string; data: UpdateTaskDto }>,
  ): Promise<Task[]> {
    try {
      const results = await Promise.allSettled(
        updates.map(update => this.update(update.id, userId, update.data)),
      )

      const updatedTasks = results
        .filter((result): result is PromiseFulfilledResult<Task> => result.status === 'fulfilled')
        .map(result => result.value)

      this.logger.debug(`Bulk updated ${updatedTasks.length} tasks for user: ${userId}`)
      return updatedTasks
    }
    catch (error) {
      console.error('Error in tasks.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error in bulk update:', error)
      throw new BadRequestException('Failed to bulk update tasks')
    }

  async getTaskStats(_userId: string): Promise<{,
    total: number,
    byStatus: Record<TaskStatus, number>
    byPriority: Record<Priority, number>
    overdue: number,
    dueToday: number,
    dueThisWeek: number
  }> {
    try {
      const cacheKey = `task-stats:${userId}`
      const cachedStats = await this.redisService.getData(cacheKey)
      if (cachedStats) {
        return cachedStats as {
          total: number,
          byStatus: Record<TaskStatus, number>
          byPriority: Record<Priority, number>
          overdue: number,
          dueToday: number,
          dueThisWeek: number
        }
  }
      }

      const tasks = await this.findAll(userId)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

      const stats = {
        total: tasks.length,
        byStatus: {
          [TaskStatus.TODO]: tasks.filter(t => t.status === TaskStatus.TODO).length,
          [TaskStatus.IN_PROGRESS]: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
          [TaskStatus.COMPLETED]: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
          [TaskStatus.ARCHIVED]: tasks.filter(t => t.status === TaskStatus.ARCHIVED).length},
        byPriority: {
          [Priority.LOW]: tasks.filter(t => t.priority === Priority.LOW).length,
          [Priority.MEDIUM]: tasks.filter(t => t.priority === Priority.MEDIUM).length,
          [Priority.HIGH]: tasks.filter(t => t.priority === Priority.HIGH).length,
          [Priority.URGENT]: tasks.filter(t => t.priority === Priority.URGENT).length},
        overdue: tasks.filter(
          t => t.dueDate && t.dueDate < now && t.status !== TaskStatus.COMPLETED,
        ).length,
        dueToday: tasks.filter(
          t =>
            t.dueDate &&
            t.dueDate >= today &&
            t.dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000),
        ).length,
        dueThisWeek: tasks.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= weekFromNow)
          .length}

      // Cache stats for 10 minutes
      await this.redisService.setData(cacheKey, stats, 600),

      return stats
    }
    } catch (error) {
      this.logger.error('Error getting task stats:', error)
      throw new BadRequestException('Failed to get task statistics')
    }

    catch (error) {
      console.error('Error in tasks.service.ts:', error)
      throw error
    }
  private async generateTaskInsights(taskId: string, _userId: string): Promise<void> {
    try {
    try {
      const task = await this.prisma.task.findUnique({ where: { id: taskId })
      if (!task) return

      const _response = await this.aiGatewayService.generateResponse({
        prompt: `Generate insights for task: "${task.title}"${task.description ? `\n\nDescription: ${task.description}` : ''}`,
        systemPrompt:
          'You are Aurelius. Provide brief, actionable insights about this task including priority reasoning, time estimate, and key considerations.',
        userId,
        maxTokens: 512})

      // Store AI insight in aiContext field
      await this.prisma.task.update({
        where: { id: taskId },
        data: {,
          aiContext: {,
            analysis: response.content,
            generatedAt: new Date().toISOString()})
    }
    } catch (error) {
      this.logger.error('Error generating task insights:', error)
    }

  private async findRelatedTasks(task: Task, _userId: string): Promise<Task[]> {
    try {
      // Find tasks with similar titles, tags, or descriptions
      const relatedTasks = await this.prisma.task.findMany({
        where: {
          userId,
          id: { not: task.id },
          title: { contains: task.title.split(' ')[0], mode: 'insensitive' },
        take: 5,
        orderBy: { createdAt: 'desc' })

      return relatedTasks
    }
    } catch (error) {
      this.logger.error('Error finding related tasks:', error),
      return []
    }

  private async generateSuggestedActions(task: Task, _userId: string): Promise<string[]> {
    try {
      const actions = []

      if (task.status === TaskStatus.TODO) {
        actions.push('Start working on this task')
      }

      if (task.priority === Priority.HIGH || task.priority === Priority.URGENT) {
        actions.push('Consider prioritizing this task')
      }

      if (task.dueDate && task.dueDate < new Date()) {
        actions.push('This task is overdue - review and update')
      }

      if (!task.description) {
        actions.push('Add more details to clarify requirements')
      },

      return actions
    }
    } catch (error) {
      this.logger.error('Error generating suggested actions:', error),
      return []
    }

}
catch (error) {
  console.error('Error in tasks.service.ts:', error)
  throw error
}