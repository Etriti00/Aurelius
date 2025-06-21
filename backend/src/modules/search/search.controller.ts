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

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search across all content' })
  @ApiResponse({ status: 200, type: SearchResponseDto })
  async search(
    @CurrentUser() user: any,
    @Query() query: SearchDto,
  ): Promise<SearchResponseDto> {
    return this.searchService.search(user.id, query.query, {
      limit: query.limit,
      offset: query.offset,
      threshold: query.threshold,
      includeMetadata: query.includeMetadata,
      includeDistance: query.includeDistance,
    });
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Search within a specific content type' })
  @ApiResponse({ status: 200, type: SearchResponseDto })
  async searchByType(
    @CurrentUser() user: any,
    @Param('type') type: SearchableType,
    @Query() query: SearchDto,
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
    @Query() query: SearchSuggestionsDto,
  ): Promise<SuggestionsResponseDto> {
    const suggestions = await this.searchService.getSuggestions(
      user.id,
      query.query,
      query.limit,
    );

    return { suggestions };
  }

  @Get('similar/:itemId')
  @ApiOperation({ summary: 'Find similar items' })
  @ApiResponse({ status: 200, type: SimilarItemsResponseDto })
  async findSimilar(
    @CurrentUser() user: any,
    @Param('itemId') itemId: string,
    @Query('limit') limit?: number,
  ): Promise<SimilarItemsResponseDto> {
    const results = await this.searchService.findSimilar(
      user.id,
      itemId,
      limit || 10,
    );

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
  @ApiOperation({ summary: 'Index content for search' })
  @ApiResponse({ status: 201, type: IndexResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async indexContent(
    @CurrentUser() user: any,
    @Body() dto: IndexContentDto,
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
    @Body() dto: BulkIndexDto,
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
  async indexTask(
    @Param('taskId') taskId: string,
  ): Promise<IndexResponseDto> {
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
  async indexEmail(
    @Param('emailId') emailId: string,
  ): Promise<IndexResponseDto> {
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
  async indexCalendarEvent(
    @Param('eventId') eventId: string,
  ): Promise<IndexResponseDto> {
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
  async indexMemory(
    @Param('memoryId') memoryId: string,
  ): Promise<IndexResponseDto> {
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
  async removeFromIndex(
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.searchService.removeFromIndex(itemId);
  }
}