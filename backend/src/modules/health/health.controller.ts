import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { HealthService } from './health.service'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  async getHealth() {
    return this.healthService.checkHealth()
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with all services' })
  async getDetailedHealth() {
    return this.healthService.getDetailedHealth()
  }

  @Get('db')
  @ApiOperation({ summary: 'Database health check' })
  async getDatabaseHealth() {
    return this.healthService.checkDatabase()
  }

  @Get('redis')
  @ApiOperation({ summary: 'Redis health check' })
  async getRedisHealth() {
    return this.healthService.checkRedis()
  }

  @Get('ai')
  @ApiOperation({ summary: 'AI service health check' })
  async getAIHealth() {
    return this.healthService.checkAI()
  }
}
