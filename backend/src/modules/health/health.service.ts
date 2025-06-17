import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../common/services/redis.service'

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async checkHealth() {
    return {
      status: 'ok',
      createdAt: new Date(),
      uptime: process.uptime(),
    }
  }

  async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return {
        status: 'healthy',
        message: 'Database connection successful',
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        error: error.message,
      }
  }

  async checkRedis() {
    try {
      const isHealthy = await this.redis.ping()
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'Redis connection successful' : 'Redis connection failed',
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Redis connection failed',
        error: error.message,
      }
  }

  async checkAI() {
    // TODO: Implement AI service health check
    return {
      status: 'healthy',
      message: 'AI service check not implemented yet',
    }
  }

  async getDetailedHealth() {
    const [basic, database, redis, ai] = await Promise.all([
      this.checkHealth(),
      this.checkDatabase(),
      this.checkRedis(),
      this.checkAI(),
    ])
  }

    const allHealthy = [database, redis, ai].every(check => check.status === 'healthy')

    return {
      ...basic,
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks: {
        database,
        redis,
        ai,
      },
    }

}