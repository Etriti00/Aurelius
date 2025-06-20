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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('tasks')
@Controller('tasks')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get user tasks' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async findAll(@CurrentUser() user: any, @Query() filters: any): Promise<any> {
    return this.tasksService.findAll(user.id, filters);
  }

  @Post()
  @ApiOperation({ summary: 'Create new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async create(@CurrentUser() user: any, @Body() createTaskDto: any): Promise<any> {
    return this.tasksService.create(user.id, createTaskDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTaskDto: any
  ): Promise<any> {
    return this.tasksService.update(user.id, id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  async delete(@CurrentUser() user: any, @Param('id') id: string): Promise<void> {
    await this.tasksService.delete(user.id, id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@CurrentUser() user: any): Promise<any> {
    return this.tasksService.getStats(user.id);
  }
}