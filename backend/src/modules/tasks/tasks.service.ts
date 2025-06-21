import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '../../common/exceptions/app.exception';
import { TaskResponseDto, TaskInsightsDto } from './dto/task-response.dto';
import { PaginatedResponseDto } from '../../common/dto/api-response.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, filters?: any): Promise<PaginatedResponseDto<TaskResponseDto>> {
    const page = parseInt(filters?.page) || 1;
    const limit = parseInt(filters?.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.labels) {
      const labelArray = filters.labels.split(',').map((label: string) => label.trim());
      where.labels = { hasEvery: labelArray };
    }

    if (filters?.dueBefore) {
      where.dueDate = { ...where.dueDate, lte: new Date(filters.dueBefore) };
    }

    if (filters?.dueAfter) {
      where.dueDate = { ...where.dueDate, gte: new Date(filters.dueAfter) };
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(filters?.sortBy, filters?.sortOrder),
      }),
      this.prisma.task.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const taskDtos = tasks.map(task => new TaskResponseDto({
      id: task.id,
      userId: task.userId,
      title: task.title,
      description: task.description !== null ? task.description : undefined,
      priority: task.priority as any,
      status: task.status as any,
      dueDate: task.dueDate?.toISOString(),
      estimatedMinutes: task.estimatedMinutes !== null ? task.estimatedMinutes : undefined,
      actualMinutes: task.actualMinutes !== null ? task.actualMinutes : undefined,
      labels: task.labels as string[],
      startDate: task.startDate?.toISOString(),
      completedAt: task.completedAt?.toISOString(),
      progress: 0,
      aiSuggested: task.aiSuggested !== null ? task.aiSuggested : false,
      aiReason: task.aiReason !== null ? task.aiReason : undefined,
      aiConfidence: task.aiConfidence !== null ? task.aiConfidence : undefined,
      parentTaskId: task.parentId !== null ? task.parentId : undefined,
      project: task.projectId !== null ? task.projectId : undefined,
      externalId: task.externalId !== null ? task.externalId : undefined,
      externalSource: undefined,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }));

    return new PaginatedResponseDto({
      data: taskDtos,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    });
  }

  async create(userId: string, data: any): Promise<any> {
    return this.prisma.task.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(userId: string, id: string, data: any): Promise<any> {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      throw new NotFoundException('Task');
    }

    return this.prisma.task.update({
      where: { id },
      data,
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      throw new NotFoundException('Task');
    }

    await this.prisma.task.delete({
      where: { id },
    });
  }

  async findOne(userId: string, id: string): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findFirst({
      where: { 
        id, 
        userId,
        deletedAt: null,
      },
    });

    if (!task) {
      throw new NotFoundException('Task');
    }

    return new TaskResponseDto({
      id: task.id,
      userId: task.userId,
      title: task.title,
      description: task.description !== null ? task.description : undefined,
      priority: task.priority as any,
      status: task.status as any,
      dueDate: task.dueDate?.toISOString(),
      estimatedMinutes: task.estimatedMinutes !== null ? task.estimatedMinutes : undefined,
      actualMinutes: task.actualMinutes !== null ? task.actualMinutes : undefined,
      labels: task.labels as string[],
      startDate: task.startDate?.toISOString(),
      completedAt: task.completedAt?.toISOString(),
      progress: 0,
      aiSuggested: task.aiSuggested !== null ? task.aiSuggested : false,
      aiReason: task.aiReason !== null ? task.aiReason : undefined,
      aiConfidence: task.aiConfidence !== null ? task.aiConfidence : undefined,
      parentTaskId: task.parentId !== null ? task.parentId : undefined,
      project: task.projectId !== null ? task.projectId : undefined,
      externalId: task.externalId !== null ? task.externalId : undefined,
      externalSource: undefined,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    });
  }

  async complete(userId: string, id: string, completionData?: { actualMinutes?: number; notes?: string }): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('Task');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        actualMinutes: completionData?.actualMinutes,
        updatedAt: new Date(),
      },
    });

    return new TaskResponseDto({
      id: updatedTask.id,
      userId: updatedTask.userId,
      title: updatedTask.title,
      description: updatedTask.description !== null ? updatedTask.description : undefined,
      priority: updatedTask.priority as any,
      status: updatedTask.status as any,
      dueDate: updatedTask.dueDate?.toISOString(),
      estimatedMinutes: updatedTask.estimatedMinutes !== null ? updatedTask.estimatedMinutes : undefined,
      actualMinutes: updatedTask.actualMinutes !== null ? updatedTask.actualMinutes : undefined,
      labels: updatedTask.labels as string[],
      startDate: updatedTask.startDate?.toISOString(),
      completedAt: updatedTask.completedAt?.toISOString(),
      progress: 100,
      aiSuggested: updatedTask.aiSuggested !== null ? updatedTask.aiSuggested : false,
      aiReason: updatedTask.aiReason !== null ? updatedTask.aiReason : undefined,
      aiConfidence: updatedTask.aiConfidence !== null ? updatedTask.aiConfidence : undefined,
      parentTaskId: updatedTask.parentId !== null ? updatedTask.parentId : undefined,
      project: updatedTask.projectId !== null ? updatedTask.projectId : undefined,
      externalId: updatedTask.externalId !== null ? updatedTask.externalId : undefined,
      externalSource: undefined,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString(),
    });
  }

  async getInsights(userId: string, period?: string): Promise<TaskInsightsDto> {
    const periodDate = this.calculatePeriodDate(period);
    
    const [totalTasks, completedTasks, overdueTasks] = await Promise.all([
      this.prisma.task.count({
        where: { 
          userId,
          deletedAt: null,
          createdAt: periodDate ? { gte: periodDate } : undefined,
        },
      }),
      this.prisma.task.count({
        where: { 
          userId,
          status: 'COMPLETED',
          deletedAt: null,
          createdAt: periodDate ? { gte: periodDate } : undefined,
        },
      }),
      this.prisma.task.count({
        where: { 
          userId,
          status: { not: 'COMPLETED' },
          dueDate: { lt: new Date() },
          deletedAt: null,
        },
      }),
    ]);

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average completion time
    const completedTasksWithTime = await this.prisma.task.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        actualMinutes: { not: null },
        deletedAt: null,
        createdAt: periodDate ? { gte: periodDate } : undefined,
      },
      select: { actualMinutes: true },
    });

    const averageCompletionTime = completedTasksWithTime.length > 0
      ? completedTasksWithTime.reduce((sum, task) => sum + (task.actualMinutes || 0), 0) / completedTasksWithTime.length / 60
      : 0;

    // Calculate most productive day (simplified)
    const mostProductiveDay = 'Tuesday'; // Placeholder - would need more complex analysis

    const averageDailyCompletion = period === 'week' ? completedTasks / 7 : 
                                  period === 'month' ? completedTasks / 30 : 
                                  completedTasks / 365;

    return new TaskInsightsDto({
      totalTasks,
      completedTasks,
      completionRate,
      averageCompletionTime,
      overdueTasks,
      mostProductiveDay,
      averageDailyCompletion,
      insights: this.generateInsights(completionRate, overdueTasks, averageCompletionTime),
    });
  }

  async bulkOperation(userId: string, operation: {
    operation: 'update' | 'delete' | 'complete';
    taskIds: string[];
    data?: any;
  }): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const taskId of operation.taskIds) {
      try {
        const task = await this.prisma.task.findFirst({
          where: { id: taskId, userId, deletedAt: null },
        });

        if (!task) {
          result.failed++;
          result.errors.push(`Task ${taskId} not found`);
          continue;
        }

        switch (operation.operation) {
          case 'update':
            await this.prisma.task.update({
              where: { id: taskId },
              data: { ...operation.data, updatedAt: new Date() },
            });
            break;
          case 'delete':
            await this.prisma.task.update({
              where: { id: taskId },
              data: { deletedAt: new Date() },
            });
            break;
          case 'complete':
            await this.prisma.task.update({
              where: { id: taskId },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                updatedAt: new Date(),
              },
            });
            break;
        }

        result.processed++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to ${operation.operation} task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (result.failed > 0) {
      result.success = false;
    }

    return result;
  }

  async getStats(userId: string): Promise<any> {
    const stats = await this.prisma.task.groupBy({
      by: ['status'],
      where: { userId, deletedAt: null },
      _count: { status: true },
    });

    return stats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);
  }

  private buildOrderBy(sortBy?: string, sortOrder?: string): any {
    const order = sortOrder === 'desc' ? 'desc' : 'asc';
    
    switch (sortBy) {
      case 'createdAt':
        return { createdAt: order };
      case 'updatedAt':
        return { updatedAt: order };
      case 'dueDate':
        return { dueDate: order };
      case 'priority':
        return { priority: order };
      case 'title':
        return { title: order };
      default:
        return [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { updatedAt: 'desc' },
        ];
    }
  }

  private calculatePeriodDate(period?: string): Date | undefined {
    if (!period) return undefined;

    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return undefined;
    }
  }

  private generateInsights(completionRate: number, overdueTasks: number, averageCompletionTime: number): string[] {
    const insights: string[] = [];

    if (completionRate > 80) {
      insights.push('Excellent task completion rate! Keep up the great work.');
    } else if (completionRate > 60) {
      insights.push('Good task completion rate. Consider breaking down larger tasks for better progress.');
    } else {
      insights.push('Consider reviewing your task planning and time estimation.');
    }

    if (overdueTasks > 5) {
      insights.push('You have several overdue tasks. Consider prioritizing them or adjusting deadlines.');
    }

    if (averageCompletionTime > 0) {
      if (averageCompletionTime < 2) {
        insights.push('You complete tasks efficiently! Consider taking on more challenging projects.');
      } else if (averageCompletionTime > 8) {
        insights.push('Tasks are taking longer than expected. Consider breaking them into smaller chunks.');
      }
    }

    return insights;
  }
}