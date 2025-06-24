import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SearchService, SearchableType } from './search.service';
import {
  SearchDto,
  SearchSuggestionsDto,
  SearchResponseDto,
  SuggestionsResponseDto,
  IndexContentDto,
  BulkIndexDto,
  IndexResponseDto,
  BulkIndexResponseDto,
  SimilarItemsResponseDto,
} from './dto';
import { ErrorResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Universal semantic search across all content',
    description:
      'Perform intelligent semantic search across all user content including tasks, emails, calendar events, notes, and documents. Uses AI embeddings for contextual understanding and relevance ranking.',
  })
  @ApiQuery({
    name: 'query',
    description: 'Search query text',
    example: 'quarterly report deadline',
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results to return',
    example: 20,
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of results to skip for pagination',
    example: 0,
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'threshold',
    description: 'Minimum similarity threshold (0-1)',
    example: 0.7,
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'includeMetadata',
    description: 'Include additional metadata in results',
    example: true,
    required: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'includeDistance',
    description: 'Include similarity distance scores',
    example: false,
    required: false,
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  async search(@CurrentUser() user: any, @Query() query: SearchDto): Promise<SearchResponseDto> {
    return this.searchService.search(user.id, query.query, {
      limit: query.limit,
      offset: query.offset,
      threshold: query.threshold,
      includeMetadata: query.includeMetadata,
      includeDistance: query.includeDistance,
    });
  }

  @Get('type/:type')
  @ApiOperation({
    summary: 'Targeted search within specific content type',
    description:
      "Search within a specific content type (tasks, emails, events, notes) for more focused and relevant results. Useful when you know exactly what type of content you're looking for.",
  })
  @ApiParam({
    name: 'type',
    description: 'Content type to search within',
    example: 'tasks',
    enum: ['tasks', 'emails', 'events', 'notes', 'documents'],
  })
  @ApiQuery({
    name: 'query',
    description: 'Search query text',
    example: 'high priority items',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Type-specific search results retrieved successfully',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid content type or search parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  async searchByType(
    @CurrentUser() user: any,
    @Param('type') type: SearchableType,
    @Query() query: SearchDto
  ): Promise<SearchResponseDto> {
    return this.searchService.searchByType(user.id, type, query.query, {
      limit: query.limit,
      offset: query.offset,
      threshold: query.threshold,
      includeMetadata: query.includeMetadata,
      includeDistance: query.includeDistance,
    });
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiResponse({ status: 200, type: SuggestionsResponseDto })
  async getSuggestions(
    @CurrentUser() user: any,
    @Query() query: SearchSuggestionsDto
  ): Promise<SuggestionsResponseDto> {
    const suggestions = await this.searchService.getSuggestions(user.id, query.query, query.limit);

    return { suggestions };
  }

  @Get('similar/:itemId')
  @ApiOperation({ summary: 'Find similar items' })
  @ApiResponse({ status: 200, type: SimilarItemsResponseDto })
  async findSimilar(
    @CurrentUser() user: any,
    @Param('itemId') itemId: string,
    @Query('limit') limit?: number
  ): Promise<SimilarItemsResponseDto> {
    const results = await this.searchService.findSimilar(user.id, itemId, limit || 10);

    return {
      items: results.map(r => ({
        id: r.id,
        similarity: r.score,
        type: r.data.type || 'unknown',
        title: r.data.metadata?.title || r.data.content.substring(0, 100),
        metadata: r.data.metadata,
      })),
      total: results.length,
    };
  }

  @Post('index')
  @ApiOperation({
    summary: 'Index content for semantic search',
    description:
      'Add new content to the search index with AI-generated embeddings. The content becomes searchable immediately and can be found through semantic similarity matching.',
  })
  @ApiBody({
    type: IndexContentDto,
    description: 'Content to index for search',
    examples: {
      task: {
        summary: 'Index a task',
        value: {
          id: 'task-123e4567-e89b-12d3-a456-426614174000',
          type: 'task',
          content:
            'Complete quarterly financial report including revenue analysis and expense breakdown',
          metadata: {
            title: 'Q4 Financial Report',
            priority: 'high',
            dueDate: '2024-12-31T17:00:00Z',
            labels: ['finance', 'quarterly', 'report'],
          },
        },
      },
      email: {
        summary: 'Index an email',
        value: {
          id: 'email-456',
          type: 'email',
          content:
            'Subject: Project Timeline Update\n\nHi team, the new project deadline has been moved to January 15th...',
          metadata: {
            subject: 'Project Timeline Update',
            from: 'manager@company.com',
            timestamp: '2024-12-24T09:30:00Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Content indexed successfully',
    type: IndexResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid content or indexing parameters',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async indexContent(
    @CurrentUser() user: any,
    @Body() dto: IndexContentDto
  ): Promise<IndexResponseDto> {
    try {
      await this.searchService.bulkIndex(user.id, [
        {
          id: dto.id,
          type: dto.type,
          content: dto.content,
          metadata: dto.metadata,
        },
      ]);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('index/bulk')
  @ApiOperation({ summary: 'Bulk index multiple items' })
  @ApiResponse({ status: 201, type: BulkIndexResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async bulkIndex(
    @CurrentUser() user: any,
    @Body() dto: BulkIndexDto
  ): Promise<BulkIndexResponseDto> {
    const results = {
      indexed: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    for (const item of dto.items) {
      try {
        await this.searchService.bulkIndex(user.id, [
          {
            id: item.id,
            type: item.type,
            content: item.content,
            metadata: item.metadata,
          },
        ]);
        results.indexed++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          id: item.id,
          error: error.message,
        });
      }
    }

    return results;
  }

  @Post('index/task/:taskId')
  @ApiOperation({ summary: 'Index a task for search' })
  @ApiResponse({ status: 201, type: IndexResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async indexTask(@Param('taskId') taskId: string): Promise<IndexResponseDto> {
    try {
      await this.searchService.indexTask(taskId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('index/email/:emailId')
  @ApiOperation({ summary: 'Index an email for search' })
  @ApiResponse({ status: 201, type: IndexResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async indexEmail(@Param('emailId') emailId: string): Promise<IndexResponseDto> {
    try {
      await this.searchService.indexEmail(emailId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('index/event/:eventId')
  @ApiOperation({ summary: 'Index a calendar event for search' })
  @ApiResponse({ status: 201, type: IndexResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async indexCalendarEvent(@Param('eventId') eventId: string): Promise<IndexResponseDto> {
    try {
      await this.searchService.indexCalendarEvent(eventId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('index/memory/:memoryId')
  @ApiOperation({ summary: 'Index a memory/note for search' })
  @ApiResponse({ status: 201, type: IndexResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async indexMemory(@Param('memoryId') memoryId: string): Promise<IndexResponseDto> {
    try {
      await this.searchService.indexMemory(memoryId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Delete('index/:itemId')
  @ApiOperation({ summary: 'Remove item from search index' })
  @ApiResponse({ status: 204 })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromIndex(@Param('itemId') itemId: string): Promise<void> {
    await this.searchService.removeFromIndex(itemId);
  }
}
