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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/user.interface';
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
  TriggerResponseDto,
} from './dto';
import {
  AnalysisInsight,
  WorkflowSuggestion,
  ExecutedAction,
  ExecutionResult,
  WorkflowError,
  WorkflowTrigger,
  TriggerMetadata,
  ActionInput,
  ActionOutput,
  InsightData,
  ExecutionResultData,
  WorkflowErrorDetails,
} from './interfaces';
import {
  ExecutionInsightDto,
  ExecutionSuggestionDto,
  ExecutedActionDto,
  ExecutionResultDto,
} from './dto/execution.dto';

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
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateWorkflowDto
  ): Promise<CreateWorkflowResponseDto> {
    const result = await this.workflowService.createWorkflow(
      user.id,
      dto.name,
      dto.description,
      dto.triggers
    );
    return {
      workflowId: result.workflowId,
      triggers: result.triggers.map(trigger => this.convertToTriggerResponseDto(trigger)),
    };
  }

  @Post('from-template')
  @ApiOperation({ summary: 'Create workflow from template' })
  @ApiResponse({ status: 201, type: CreateWorkflowResponseDto })
  async createFromTemplate(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateFromTemplateDto
  ): Promise<CreateWorkflowResponseDto> {
    const result = await this.workflowService.createFromTemplate(
      user.id,
      dto.templateId,
      dto.customizations
    );
    return {
      workflowId: result.workflowId,
      triggers: result.triggers.map(trigger => this.convertToTriggerResponseDto(trigger)),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user workflows' })
  @ApiResponse({ status: 200, type: [WorkflowResponseDto] })
  async getUserWorkflows(@CurrentUser() user: RequestUser): Promise<WorkflowResponseDto[]> {
    const workflows = await this.workflowService.getUserWorkflows(user.id);
    return workflows.map(workflow => this.convertToWorkflowResponseDto(workflow));
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get workflow templates' })
  @ApiResponse({ status: 200, type: [WorkflowTemplateDto] })
  async getTemplates(@Query('category') category?: string): Promise<WorkflowTemplateDto[]> {
    return this.workflowService.getTemplates(category);
  }

  @Get('templates/recommended')
  @ApiOperation({ summary: 'Get recommended templates' })
  @ApiResponse({ status: 200, type: [WorkflowTemplateDto] })
  async getRecommendedTemplates(@CurrentUser() user: RequestUser): Promise<WorkflowTemplateDto[]> {
    return this.workflowService.getRecommendedTemplates(user.id);
  }

  @Get('templates/search')
  @ApiOperation({ summary: 'Search workflow templates' })
  @ApiResponse({ status: 200, type: [WorkflowTemplateDto] })
  async searchTemplates(@Query('q') query: string): Promise<WorkflowTemplateDto[]> {
    return this.workflowService.searchTemplates(query);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get workflow suggestions' })
  @ApiResponse({ status: 200, type: [TemplateSuggestionDto] })
  async getWorkflowSuggestions(@CurrentUser() user: RequestUser): Promise<TemplateSuggestionDto[]> {
    return this.workflowService.getWorkflowSuggestions(user.id);
  }

  @Get('executions')
  @ApiOperation({ summary: 'Get workflow executions' })
  @ApiResponse({ status: 200, type: [ExecutionListDto] })
  async getExecutions(
    @CurrentUser() user: RequestUser,
    @Query('workflowId') workflowId?: string,
    @Query('limit') limit?: number
  ): Promise<ExecutionListDto[]> {
    const executions = await this.workflowService.getWorkflowExecutions(user.id, workflowId, limit);

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
    @CurrentUser() user: RequestUser,
    @Param('executionId') executionId: string
  ): Promise<WorkflowExecutionDto> {
    const execution = await this.workflowService.getExecutionDetails(user.id, executionId);

    if (!execution) {
      throw new Error('Execution not found');
    }

    return {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      insights: this.convertInsightsToDto(execution.analysis?.insights || []),
      suggestions: this.convertSuggestionsToDto(execution.analysis?.suggestions || []),
      selectedSuggestions: execution.selectedSuggestions,
      executedActions: this.convertExecutedActionsToDto(execution.executedActions),
      results: this.convertResultsToDto(execution.results),
      error: execution.error ? this.convertErrorToDto(execution.error) : undefined,
      confidence: execution.analysis?.confidence || 0,
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get workflow metrics' })
  @ApiResponse({ status: 200, type: [WorkflowMetricsDto] })
  async getMetrics(
    @CurrentUser() user: RequestUser,
    @Query('workflowId') workflowId?: string
  ): Promise<WorkflowMetricsDto[]> {
    return this.workflowService.getWorkflowMetrics(user.id, workflowId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow details' })
  @ApiResponse({ status: 200, type: WorkflowResponseDto })
  async getWorkflow(
    @CurrentUser() user: RequestUser,
    @Param('id') workflowId: string
  ): Promise<WorkflowResponseDto> {
    const workflows = await this.workflowService.getUserWorkflows(user.id);
    const workflow = workflows.find(w => w.id === workflowId);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    return {
      id: workflow.id,
      userId: workflow.userId,
      name: workflow.name,
      description: workflow.description || '',
      enabled: workflow.enabled,
      triggers: workflow.triggers.map((trigger: WorkflowTrigger) =>
        this.convertToTriggerResponseDto(trigger)
      ),
      executionCount: workflow.executionCount,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      metadata: workflow.metadata ? this.convertMetadataToRecord(workflow.metadata) : undefined,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, type: WorkflowResponseDto })
  async updateWorkflow(
    @CurrentUser() user: RequestUser,
    @Param('id') workflowId: string,
    @Body() dto: UpdateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    await this.workflowService.updateWorkflow(user.id, workflowId, dto);

    // Get triggers for the updated workflow
    const workflows = await this.workflowService.getUserWorkflows(user.id);
    const workflow = workflows.find(w => w.id === workflowId);

    if (!workflow) {
      throw new Error('Workflow not found after update');
    }

    return {
      id: workflow.id,
      userId: workflow.userId,
      name: workflow.name,
      description: workflow.description || '',
      enabled: workflow.enabled,
      triggers: workflow.triggers.map((trigger: WorkflowTrigger) =>
        this.convertToTriggerResponseDto(trigger)
      ),
      executionCount: workflow.executionCount,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      metadata: workflow.metadata ? this.convertMetadataToRecord(workflow.metadata) : undefined,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkflow(
    @CurrentUser() user: RequestUser,
    @Param('id') workflowId: string
  ): Promise<void> {
    await this.workflowService.deleteWorkflow(user.id, workflowId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test workflow trigger' })
  @ApiResponse({ status: 200 })
  async testWorkflow(
    @CurrentUser() user: RequestUser,
    @Param('id') workflowId: string,
    @Body() dto: TestTriggerDto
  ): Promise<{ triggered: boolean; message: string }> {
    // Get workflow triggers
    const workflows = await this.workflowService.getUserWorkflows(user.id);
    const workflow = workflows.find(w => w.id === workflowId);

    if (!workflow || !workflow.triggers || workflow.triggers.length === 0) {
      return {
        triggered: false,
        message: 'Workflow not found or has no triggers',
      };
    }

    // Test first trigger
    return this.workflowService.testTrigger(user.id, workflow.triggers[0].id, dto.testData);
  }

  @Post('execute/:triggerId')
  @ApiOperation({ summary: 'Manually execute workflow' })
  @ApiResponse({ status: 200, type: WorkflowExecutionDto })
  async executeWorkflow(
    @CurrentUser() user: RequestUser,
    @Param('triggerId') triggerId: string,
    @Body() triggerData: Prisma.JsonObject
  ): Promise<WorkflowExecutionDto> {
    const execution = await this.workflowService.executeWorkflow(user.id, triggerId, triggerData);

    return {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      insights: this.convertInsightsToDto(execution.analysis?.insights || []),
      suggestions: this.convertSuggestionsToDto(execution.analysis?.suggestions || []),
      selectedSuggestions: execution.selectedSuggestions,
      executedActions: this.convertExecutedActionsToDto(execution.executedActions),
      results: this.convertResultsToDto(execution.results),
      error: execution.error ? this.convertErrorToDto(execution.error) : undefined,
      confidence: execution.analysis?.confidence || 0,
    };
  }

  // Helper methods for converting interface types to DTOs
  private convertMetadataToRecord(
    metadata: Prisma.JsonValue
  ): Record<string, string | number | boolean | null> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }

    const result: Record<string, string | number | boolean | null> = {};
    const obj = metadata as Prisma.JsonObject;

    for (const key in obj) {
      const value = obj[key];
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        result[key] = value;
      }
    }

    return result;
  }

  private convertInsightsToDto(insights: AnalysisInsight[]): ExecutionInsightDto[] {
    return insights.map(insight => ({
      type: insight.type,
      title: insight.title,
      description: insight.description,
      data: this.convertInsightDataToRecord(insight.data),
      importance: insight.importance,
    }));
  }

  private convertSuggestionsToDto(suggestions: WorkflowSuggestion[]): ExecutionSuggestionDto[] {
    return suggestions.map(suggestion => ({
      id: suggestion.id,
      type: suggestion.type,
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      estimatedImpact: suggestion.estimatedImpact,
      reasoning: suggestion.reasoning,
      confidence: suggestion.confidence,
    }));
  }

  private convertExecutedActionsToDto(actions: ExecutedAction[]): ExecutedActionDto[] {
    return actions.map(action => ({
      actionId: action.actionId,
      executedAt: action.executedAt,
      duration: action.duration,
      status: action.status,
      input: this.convertActionInputToRecord(action.input),
      output: action.output ? this.convertActionOutputToRecord(action.output) : undefined,
      error: action.error,
    }));
  }

  private convertResultsToDto(results: ExecutionResult[]): ExecutionResultDto[] {
    return results.map(result => ({
      type: result.type,
      message: result.message,
      data: result.data ? this.convertResultDataToRecord(result.data) : undefined,
    }));
  }

  private convertErrorToDto(error: WorkflowError): {
    code: string;
    message: string;
    details?: Record<string, string | number | boolean | null>;
  } {
    return {
      code: error.code,
      message: error.message,
      details: error.details ? this.convertErrorDetailsToRecord(error.details) : undefined,
    };
  }

  private convertInsightDataToRecord(
    data: InsightData | null | undefined
  ): Record<string, string | number | boolean | null> {
    const result: Record<string, string | number | boolean | null> = {};

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const [key, value] of Object.entries(data)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          value === null
        ) {
          result[key] = value;
        } else if (value instanceof Date) {
          result[key] = value.toISOString();
        } else if (typeof value === 'object') {
          result[key] = JSON.stringify(value);
        }
      }
    }

    return result;
  }

  private convertActionInputToRecord(
    input: ActionInput
  ): Record<string, string | number | boolean | null> {
    const result: Record<string, string | number | boolean | null> = {};

    if (input.parameters && typeof input.parameters === 'object') {
      for (const [key, value] of Object.entries(input.parameters)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          value === null
        ) {
          result[key] = value;
        } else if (value instanceof Date) {
          result[key] = value.toISOString();
        } else if (Array.isArray(value)) {
          result[key] = JSON.stringify(value);
        }
      }
    }

    return result;
  }

  private convertActionOutputToRecord(
    output: ActionOutput
  ): Record<string, string | number | boolean | null> {
    const result: Record<string, string | number | boolean | null> = {};

    if (output.result && typeof output.result === 'object') {
      for (const [key, value] of Object.entries(output.result)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          value === null
        ) {
          result[key] = value;
        } else if (value instanceof Date) {
          result[key] = value.toISOString();
        }
      }
    }

    return result;
  }

  private convertResultDataToRecord(
    data: ExecutionResultData | null | undefined
  ): Record<string, string | number | boolean | null> {
    const result: Record<string, string | number | boolean | null> = {};

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const [key, value] of Object.entries(data)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          value === null
        ) {
          result[key] = value;
        } else if (typeof value === 'object') {
          result[key] = JSON.stringify(value);
        }
      }
    }

    return result;
  }

  private convertErrorDetailsToRecord(
    details: WorkflowErrorDetails | null | undefined
  ): Record<string, string | number | boolean | null> {
    const result: Record<string, string | number | boolean | null> = {};

    if (details && typeof details === 'object' && !Array.isArray(details)) {
      for (const [key, value] of Object.entries(details)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          value === null
        ) {
          result[key] = value;
        } else if (value instanceof Date) {
          result[key] = value.toISOString();
        } else if (typeof value === 'object') {
          result[key] = JSON.stringify(value);
        }
      }
    }

    return result;
  }

  private convertToTriggerResponseDto(trigger: WorkflowTrigger): TriggerResponseDto {
    return {
      id: trigger.id,
      type: trigger.type,
      conditions: trigger.conditions.map(condition => ({
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        logicalOperator: condition.logicalOperator,
      })),
      enabled: trigger.enabled,
      metadata: trigger.metadata
        ? this.convertTriggerMetadataToRecord(trigger.metadata)
        : undefined,
    };
  }

  private convertToWorkflowResponseDto(workflow: Record<string, unknown>): WorkflowResponseDto {
    const ensureString = (value: unknown): string => {
      return typeof value === 'string' ? value : '';
    };

    const ensureBoolean = (value: unknown): boolean => {
      return typeof value === 'boolean' ? value : false;
    };

    const ensureNumber = (value: unknown): number => {
      return typeof value === 'number' ? value : 0;
    };

    const ensureDate = (value: unknown): Date => {
      if (value instanceof Date) return value;
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? new Date() : date;
      }
      return new Date();
    };

    const ensureTriggerArray = (value: unknown): WorkflowTrigger[] => {
      return Array.isArray(value)
        ? (value.filter(
            item => typeof item === 'object' && item !== null && 'id' in item
          ) as WorkflowTrigger[])
        : [];
    };

    return {
      id: ensureString(workflow.id),
      userId: ensureString(workflow.userId),
      name: ensureString(workflow.name),
      description: ensureString(workflow.description) || '',
      enabled: ensureBoolean(workflow.enabled),
      triggers: ensureTriggerArray(workflow.triggers).map((trigger: WorkflowTrigger) =>
        this.convertToTriggerResponseDto(trigger)
      ),
      executionCount: ensureNumber(workflow.executionCount),
      createdAt: ensureDate(workflow.createdAt),
      updatedAt: ensureDate(workflow.updatedAt),
      metadata: workflow.metadata ? this.convertMetadataToRecord(workflow.metadata) : undefined,
    };
  }

  private convertTriggerMetadataToRecord(
    metadata: TriggerMetadata
  ): Record<string, string | number | boolean | null> {
    const result: Record<string, string | number | boolean | null> = {};

    if (metadata.workflowId) result.workflowId = metadata.workflowId;
    if (metadata.source) result.source = metadata.source;
    if (metadata.priority !== undefined) result.priority = metadata.priority;
    if (metadata.tags) result.tags = metadata.tags.join(',');
    if (metadata.schedule) result.schedule = JSON.stringify(metadata.schedule);
    if (metadata.webhook) result.webhook = JSON.stringify(metadata.webhook);
    if (metadata.email) result.email = JSON.stringify(metadata.email);
    if (metadata.calendar) result.calendar = JSON.stringify(metadata.calendar);

    return result;
  }
}
