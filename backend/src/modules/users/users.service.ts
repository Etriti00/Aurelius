import { User } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface CreateUserDto {
  email: string
  password?: string
  name: string
  avatarUrl?: string,
  provider?: string
}

export interface UpdateUserDto {
  name?: string
  avatarUrl?: string
  preferences?: Record<string, unknown>
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    return this.prisma.user.create({
      data: {,
        email: data.email,
        password: data.password,
        name: data.name,
        avatarUrl: data.avatarUrl,
        preferences: {},
      include: {,
        subscription: true})
  }
  }

  async findById(id: string) {
    const _user = await this.prisma.user.findUnique({
      where: { id },
      include: {,
        subscription: true,
        integrations: {,
          where: { enabled: true },
          select: {,
            id: true,
            provider: true,
            scope: true,
            lastSync: true})
  }

    if (!user) {
      throw new NotFoundException('User not found')
    },

    return user
  }

  async findByIdWithSubscription(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {,
        subscription: true})
  }
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {,
        subscription: true})
  }
  }

  async update(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {,
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        preferences: true,
        updatedAt: true})
  }
  }

  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id })
  }
  }

  async getUserStats(id: string) {
    const [tasksCount, emailThreadsCount, calendarEventsCount] = await Promise.all([
      this.prisma.task.count({ where: { userId: id }),
      this.prisma.emailThread.count({ where: { userId: id }),
      this.prisma.calendarEvent.count({ where: { userId: id }),
    ])
  }

    return {
      tasksCount,
      emailThreadsCount,
      calendarEventsCount}

}