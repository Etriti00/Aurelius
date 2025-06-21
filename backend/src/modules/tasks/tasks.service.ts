import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '../../common/exceptions/app.exception';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, filters?: any): Promise<any[]> {
    return this.prisma.task.findMany({
      where: {
        userId,
        status: filters?.status || { not: 'ARCHIVED' },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { updatedAt: 'desc' },
      ],
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

  async getStats(userId: string): Promise<any> {
    const stats = await this.prisma.task.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    });

    return stats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);
  }
}