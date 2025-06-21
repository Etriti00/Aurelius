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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkflowService } from './workflow.service';
import {
  CreateWorkflowDto,
  CreateFromTemplateDto,
  UpdateWorkflowDto,
  TestTriggerDto,
  WorkflowResponseDto,
  CreateWorkflowResponseDto,
  WorkflowExecutionDto,
  ExecutionListDto,
  WorkflowMetricsDto,
  WorkflowTemplateDto,
  TemplateSuggestionDto,
} from './dto';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, type: CreateWorkflowResponseDto })
  async createWorkflow(
    @CurrentUser() user: any,
    @Body() dto: CreateWorkflowDto,
  ): Promise<CreateWorkflowResponseDto> {
    return this.workflowService.createWorkflow(
      user.id,
      dto.name,
      dto.description,
      dto.triggers,
    );
  }

  @Post('from-template')
  @ApiOperation({ summary: 'Create workflow from template' })
  @ApiResponse({ status: 201, type: CreateWorkflowResponseDto })
  async createFromTemplate(
    @CurrentUser() user: any,
    @Body() dto: CreateFromTemplateDto,
  ): Promise<CreateWorkflowResponseDto> {
    return this.workflowService.createFromTemplate(
      user.id,
      dto.templateId,
      dto.customizations,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get user workflows' })
  @ApiResponse({ status: 200, type: [WorkflowResponseDto] })
  async getUserWorkflows(
    @CurrentUser() user: any,
  ): Promise<WorkflowResponseDto[]> {
    return this.workflowService.getUserWorkflows(user.id);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get workflow templates' })
  @ApiResponse({ status: 200, type: [WorkflowTemplateDto] })
  async getTemplates(
    @Query('category') category?: string,
  ): Promise<WorkflowTemplateDto[]> {
    return this.workflowService.getTemplates(category);
  }

  @Get('templates/recommended')
  @ApiOperation({ summary: 'Get recommended templates' })
  @ApiResponse({ status: 200, type: [WorkflowTemplateDto] })
  async getRecommendedTemplates(
    @CurrentUser() user: any,
  ): Promise<WorkflowTemplateDto[]> {
    return this.workflowService.getRecommendedTemplates(user.id);
  }

  @Get('templates/search')
  @ApiOperation({ summary: 'Search workflow templates' })
  @ApiResponse({ status: 200, type: [WorkflowTemplateDto] })
  async searchTemplates(
    @Query('q') query: string,
  ): Promise<WorkflowTemplateDto[]> {
    return this.workflowService.searchTemplates(query);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get workflow suggestions' })
  @ApiResponse({ status: 200, type: [TemplateSuggestionDto] })
  async getWorkflowSuggestions(
    @CurrentUser() user: any,
  ): Promise<TemplateSuggestionDto[]> {
    return this.workflowService.getWorkflowSuggestions(user.id);
  }

  @Get('executions')
  @ApiOperation({ summary: 'Get workflow executions' })
  @ApiResponse({ status: 200, type: [ExecutionListDto] })
  async getExecutions(
    @CurrentUser() user: any,
    @Query('workflowId') workflowId?: string,
    @Query('limit') limit?: number,
  ): Promise<ExecutionListDto[]> {
    const executions = await this.workflowService.getWorkflowExecutions(
      user.id,
      workflowId,
      limit,
    );

    return executions.map(exec => ({
      id: exec.id,
      workflowId: exec.workflowId,
      workflowName: 'Workflow', // Would need to fetch from DB
      status: exec.status,
      startedAt: exec.startedAt,
      completedAt: exec.completedAt,
      actionsExecuted: exec.executedActions.length,
      successCount: exec.executedActions.filter(a => a.status === 'success').length,
    }));
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Get execution details' })
  @ApiResponse({ status: 200, type: WorkflowExecutionDto })
  async getExecutionDetails(
    @CurrentUser() user: any,
    @Param('executionId') executionId: string,
  ): Promise<WorkflowExecutionDto> {
    const execution = await this.workflowService.getExecutionDetails(
      user.id,
      executionId,
    );

    if (!execution) {
      throw new Error('Execution not found');
    }

    return {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      insights: execution.analysis?.insights || [],
      suggestions: execution.analysis?.suggestions || [],
      selectedSuggestions: execution.selectedSuggestions,
      executedActions: execution.executedActions,
      results: execution.results,
      error: execution.error,
      confidence: execution.analysis?.confidence || 0,
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get workflow metrics' })
  @ApiResponse({ status: 200, type: [WorkflowMetricsDto] })
  async getMetrics(
    @CurrentUser() user: any,
    @Query('workflowId') workflowId?: string,
  ): Promise<WorkflowMetricsDto[]> {
    return this.workflowService.getWorkflowMetrics(user.id, workflowId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow details' })
  @ApiResponse({ status: 200, type: WorkflowResponseDto })
  async getWorkflow(
    @CurrentUser() user: any,
    @Param('id') workflowId: string,
  ): Promise<WorkflowResponseDto> {
    const workflows = await this.workflowService.getUserWorkflows(user.id);
    const workflow = workflows.find(w => w.id === workflowId);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    return workflow;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, type: WorkflowResponseDto })
  async updateWorkflow(
    @CurrentUser() user: any,
    @Param('id') workflowId: string,
    @Body() dto: UpdateWorkflowDto,
  ): Promise<WorkflowResponseDto> {
    const updated = await this.workflowService.updateWorkflow(
      user.id,
      workflowId,
      dto,
    );

    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkflow(
    @CurrentUser() user: any,
    @Param('id') workflowId: string,
  ): Promise<void> {
    await this.workflowService.deleteWorkflow(user.id, workflowId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test workflow trigger' })
  @ApiResponse({ status: 200 })
  async testWorkflow(
    @CurrentUser() user: any,
    @Param('id') workflowId: string,
    @Body() dto: TestTriggerDto,
  ): Promise<{ triggered: boolean; message: string }> {
    // Get workflow triggers
    const workflows = await this.workflowService.getUserWorkflows(user.id);
    const workflow = workflows.find(w => w.id === workflowId);

    if (!workflow || workflow.triggers.length === 0) {
      return {
        triggered: false,
        message: 'Workflow not found or has no triggers',
      };
    }

    // Test first trigger
    return this.workflowService.testTrigger(
      user.id,
      workflow.triggers[0].id,
      dto.testData,
    );
  }

  @Post('execute/:triggerId')
  @ApiOperation({ summary: 'Manually execute workflow' })
  @ApiResponse({ status: 200, type: WorkflowExecutionDto })
  async executeWorkflow(
    @CurrentUser() user: any,
    @Param('triggerId') triggerId: string,
    @Body() triggerData: Record<string, any>,
  ): Promise<WorkflowExecutionDto> {
    const execution = await this.workflowService.executeWorkflow(
      user.id,
      triggerId,
      triggerData,
    );

    return {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      insights: execution.analysis?.insights || [],
      suggestions: execution.analysis?.suggestions || [],
      selectedSuggestions: execution.selectedSuggestions,
      executedActions: execution.executedActions,
      results: execution.results,
      error: execution.error,
      confidence: execution.analysis?.confidence || 0,
    };
  }
}