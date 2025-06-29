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
} from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CustomThrottleGuard } from '../../common/guards/throttle.guard';
import {
  CreateJobDto,
  UpdateJobDto,
  CreateFromTemplateDto,
  JobFilterDto,
  BulkOperationDto,
  TemplateFilterDto,
} from './dto';
import {
  ScheduledJob,
  JobExecution,
  JobStatistics,
  SchedulerMetrics,
  JobTemplate,
  BulkJobOperation,
} from './interfaces';

@ApiTags('Scheduler')
@ApiBearerAuth()
@Controller('scheduler')
@UseGuards(JwtAuthGuard, AuthRolesGuard, CustomThrottleGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('jobs')
  @ApiOperation({ summary: 'Create a new scheduled job' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createJob(
    @CurrentUser('id') userId: string,
    @Body() createJobDto: CreateJobDto
  ): Promise<ScheduledJob> {
    return this.schedulerService.createJob(
      userId,
      createJobDto.name,
      createJobDto.description,
      createJobDto.schedule,
      createJobDto.action,
      createJobDto.metadata
    );
  }

  @Post('jobs/from-template')
  @ApiOperation({ summary: 'Create a job from template' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async createFromTemplate(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFromTemplateDto
  ): Promise<ScheduledJob> {
    return this.schedulerService.createFromTemplate(userId, dto.templateId, {
      name: dto.name,
      schedule: dto.schedule,
      action: dto.action,
    });
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get user scheduled jobs' })
  @ApiResponse({ status: 200, description: 'List of scheduled jobs' })
  async getUserJobs(
    @CurrentUser('id') userId: string,
    @Query() filter: JobFilterDto
  ): Promise<ScheduledJob[]> {
    return this.schedulerService.getUserJobs(userId, {
      type: filter.type,
      enabled: filter.enabled,
      startDate: filter.startDate ? new Date(filter.startDate) : undefined,
      endDate: filter.endDate ? new Date(filter.endDate) : undefined,
    });
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job details' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJob(
    @CurrentUser('id') userId: string,
    @Param('id') jobId: string
  ): Promise<ScheduledJob> {
    const job = await this.schedulerService.getJob(jobId, userId);
    if (!job) {
      throw new BusinessException('Job not found', 'JOB_NOT_FOUND');
    }
    return job;
  }

  @Put('jobs/:id')
  @ApiOperation({ summary: 'Update scheduled job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job updated successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async updateJob(
    @CurrentUser('id') userId: string,
    @Param('id') jobId: string,
    @Body() updateJobDto: UpdateJobDto
  ): Promise<ScheduledJob> {
    return this.schedulerService.updateJob(jobId, userId, updateJobDto);
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Delete scheduled job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 204, description: 'Job deleted successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteJob(@CurrentUser('id') userId: string, @Param('id') jobId: string): Promise<void> {
    await this.schedulerService.deleteJob(jobId, userId);
  }

  @Post('jobs/:id/execute')
  @ApiOperation({ summary: 'Execute job manually' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job execution started' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async executeJob(
    @CurrentUser('id') userId: string,
    @Param('id') jobId: string
  ): Promise<JobExecution> {
    return this.schedulerService.executeJob(jobId, userId);
  }

  @Post('jobs/bulk')
  @ApiOperation({ summary: 'Perform bulk operation on jobs' })
  @ApiResponse({ status: 200, description: 'Bulk operation completed' })
  async bulkOperation(
    @CurrentUser('id') userId: string,
    @Body() dto: BulkOperationDto
  ): Promise<{ affected: number }> {
    return this.schedulerService.bulkOperation(userId, {
      jobIds: dto.jobIds,
      operation: dto.operation as BulkJobOperation['operation'],
    });
  }

  @Get('jobs/:id/executions')
  @ApiOperation({ summary: 'Get job execution history' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit results' })
  @ApiResponse({ status: 200, description: 'List of job executions' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobExecutions(
    @CurrentUser('id') userId: string,
    @Param('id') jobId: string,
    @Query('limit') limit?: number
  ): Promise<JobExecution[]> {
    return this.schedulerService.getJobExecutions(jobId, userId, limit || 20);
  }

  @Get('jobs/:id/statistics')
  @ApiOperation({ summary: 'Get job statistics' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job statistics' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobStatistics(
    @CurrentUser('id') userId: string,
    @Param('id') jobId: string
  ): Promise<JobStatistics> {
    return this.schedulerService.getJobStatistics(jobId, userId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get scheduler metrics' })
  @ApiResponse({ status: 200, description: 'Scheduler metrics' })
  @Roles('admin')
  async getMetrics(): Promise<SchedulerMetrics> {
    return this.schedulerService.getMetrics();
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get available job templates' })
  @ApiResponse({ status: 200, description: 'List of job templates' })
  async getTemplates(@Query() filter: TemplateFilterDto): Promise<JobTemplate[]> {
    return this.schedulerService.getTemplates(filter.category);
  }
}

import { BusinessException } from '../../common/exceptions';
