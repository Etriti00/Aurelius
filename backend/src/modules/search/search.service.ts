import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Task, CalendarEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { VectorService } from './services/vector.service';
import { CacheService } from '../cache/services/cache.service';
import { SearchQuery, SearchResponse, SearchOptions, SearchResult } from './interfaces';

// Define types for models with relations
type TaskWithRelations = Task & {
  subtasks?: Array<{ id: string; title: string }>;
  labels?: string[];
};

type EventWithRelations = CalendarEvent;

// Types for content indexing are defined above with relations
import { BusinessException } from '../../common/exceptions';

export enum SearchableType {
  TASK = 'task',
  EMAIL = 'email',
  CALENDAR_EVENT = 'calendar_event',
  NOTE = 'note',
  FILE = 'file',
  CONTACT = 'contact',
  MEMORY = 'memory',
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private prisma: PrismaService,
    private semanticSearch: SemanticSearchService,
    private vectorService: VectorService,
    private cacheService: CacheService
  ) {}

  /**
   * Universal search across all content types
   */
  async search(
    userId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    try {
      const searchQuery: SearchQuery = {
        query,
        type: options.includeMetadata ? 'hybrid' : 'vector',
        options,
      };

      return await this.semanticSearch.search(
        searchQuery.query,
        {
          userId,
          includeMetadata: options.includeMetadata,
          rerank: true,
        },
        {
          limit: options.limit,
          offset: options.offset,
          threshold: options.threshold,
          useHybridSearch: searchQuery.type === 'hybrid',
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Search failed: ${errorMessage}`, error);
      throw new BusinessException(
        'Search failed',
        'SEARCH_FAILED',
        undefined,
        error instanceof Error ? { message: error.message } : undefined
      );
    }
  }

  /**
   * Search within a specific content type
   */
  async searchByType(
    userId: string,
    type: SearchableType,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    try {
      return await this.semanticSearch.search(
        query,
        {
          userId,
          type,
          includeMetadata: options.includeMetadata,
          rerank: true,
        },
        {
          limit: options.limit,
          offset: options.offset,
          threshold: options.threshold,
          useHybridSearch: true,
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Search by type failed: ${errorMessage}`, error);
      throw new BusinessException(
        'Search by type failed',
        'SEARCH_BY_TYPE_FAILED',
        undefined,
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              context: 'search operation',
            }
          : {
              message: 'Unknown error occurred during search operation',
              error: String(error),
            }
      );
    }
  }

  /**
   * Index a task for search
   */
  async indexTask(taskId: string): Promise<void> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: {
          subtasks: true,
        },
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // Combine task content for indexing
      const content = this.buildTaskContent(task);
      const metadata = {
        type: SearchableType.TASK,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString(),
        labels: task.labels,
      };

      await this.semanticSearch.indexContent(
        task.id,
        content,
        metadata,
        task.userId,
        SearchableType.TASK
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to index task: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to index task',
        'TASK_INDEX_FAILED',
        undefined,
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              context: 'task indexing operation',
            }
          : {
              message: 'Unknown error occurred during task indexing',
              error: String(error),
            }
      );
    }
  }

  /**
   * Index an email for search
   */
  async indexEmail(emailId: string): Promise<void> {
    try {
      const email = await this.prisma.email.findUnique({
        where: { id: emailId },
        include: {
          emailThread: true,
        },
      });

      if (!email) {
        throw new Error('Email not found');
      }

      // Combine email content for indexing
      const content = this.buildEmailContentFromEmail(email);
      const metadata = {
        type: SearchableType.EMAIL,
        subject: email.subject,
        from: email.from,
        to: email.to,
        date: email.receivedAt ? email.receivedAt.toISOString() : email.createdAt.toISOString(),
        hasAttachments: this.checkEmailHasAttachments(email.attachments),
        threadId: email.threadId,
      };

      await this.semanticSearch.indexContent(
        email.id,
        content,
        metadata,
        email.userId,
        SearchableType.EMAIL
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to index email: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to index email',
        'EMAIL_INDEX_FAILED',
        undefined,
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              context: 'email indexing operation',
            }
          : {
              message: 'Unknown error occurred during email indexing',
              error: String(error),
            }
      );
    }
  }

  /**
   * Index a calendar event for search
   */
  async indexCalendarEvent(eventId: string): Promise<void> {
    try {
      const event = await this.prisma.calendarEvent.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new Error('Calendar event not found');
      }

      // Combine event content for indexing
      const content = this.buildEventContent(event);
      const metadata = {
        type: SearchableType.CALENDAR_EVENT,
        title: event.title,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        location: event.location,
        attendeeCount: this.getCalendarAttendeeCount(event.attendees),
        isRecurring: event.isRecurring,
      };

      await this.semanticSearch.indexContent(
        event.id,
        content,
        metadata,
        event.userId,
        SearchableType.CALENDAR_EVENT
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to index calendar event: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to index calendar event',
        'EVENT_INDEX_FAILED',
        undefined,
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              context: 'search operation',
            }
          : {
              message: 'Unknown error occurred during search operation',
              error: String(error),
            }
      );
    }
  }

  /**
   * Index user memory/note
   */
  async indexMemory(memoryId: string): Promise<void> {
    try {
      const memory = await this.prisma.aIMemory.findUnique({
        where: { id: memoryId },
      });

      if (!memory) {
        throw new Error('Memory not found');
      }

      const metadata = {
        type: SearchableType.MEMORY,
        category: memory.category,
        confidence: memory.confidence,
        createdAt: memory.createdAt.toISOString(),
      };

      await this.semanticSearch.indexContent(
        memory.id,
        memory.content,
        metadata,
        memory.userId,
        SearchableType.MEMORY
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to index memory: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to index memory',
        'MEMORY_INDEX_FAILED',
        undefined,
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              context: 'search operation',
            }
          : {
              message: 'Unknown error occurred during search operation',
              error: String(error),
            }
      );
    }
  }

  /**
   * Bulk index multiple items
   */
  async bulkIndex(
    userId: string,
    items: Array<{
      id: string;
      type: SearchableType;
      content: string;
      metadata?: Prisma.JsonObject;
    }>
  ): Promise<void> {
    try {
      const documents = items.map(item => ({
        id: item.id,
        content: item.content,
        metadata: {
          ...item.metadata,
          type: item.type,
        },
        userId,
        type: item.type,
      }));

      await this.semanticSearch.batchIndex(documents);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bulk index failed: ${errorMessage}`, error);
      throw new BusinessException(
        'Bulk index failed',
        'BULK_INDEX_FAILED',
        undefined,
        error instanceof Error ? { message: error.message } : undefined
      );
    }
  }

  /**
   * Remove item from search index
   */
  async removeFromIndex(itemId: string): Promise<void> {
    try {
      await this.vectorService.deleteDocument(itemId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to remove from index: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to remove from index',
        'INDEX_REMOVAL_FAILED',
        undefined,
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              context: 'search operation',
            }
          : {
              message: 'Unknown error occurred during search operation',
              error: String(error),
            }
      );
    }
  }

  /**
   * Find similar items
   */
  async findSimilar(userId: string, itemId: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const results = await this.semanticSearch.findSimilar(itemId, limit);

      // Filter by userId from metadata
      return results.filter(r => r.metadata?.userId === userId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Find similar failed: ${errorMessage}`, error);
      throw new BusinessException(
        'Find similar failed',
        'FIND_SIMILAR_FAILED',
        undefined,
        error instanceof Error ? { message: error.message } : undefined
      );
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(userId: string, partialQuery: string, limit: number = 5): Promise<string[]> {
    try {
      // This would typically use a dedicated suggestion index
      // For now, return recent searches from cache
      const cacheKey = `suggestions:${userId}`;
      const recentSearches = (await this.cacheService.get<string[]>(cacheKey)) || [];

      return recentSearches
        .filter(search => search.toLowerCase().includes(partialQuery.toLowerCase()))
        .slice(0, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Get suggestions failed: ${errorMessage}`, error);
      return [];
    }
  }

  /**
   * Build task content for indexing
   */
  private buildTaskContent(task: TaskWithRelations): string {
    const parts = [task.title, task.description || ''];

    if (task.subtasks && task.subtasks.length > 0) {
      parts.push(...task.subtasks.map(st => st.title));
    }

    if (task.labels && task.labels.length > 0) {
      parts.push(...task.labels);
    }

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Build email content for indexing from Email
   */
  private buildEmailContentFromEmail(email: {
    subject: string;
    bodyText?: string;
    from: string;
    to: string[] | string;
    content?: string;
  }): string {
    const parts = [
      email.subject || '',
      email.bodyText || email.content || '',
      `From: ${email.from}`,
      `To: ${Array.isArray(email.to) ? email.to.join(', ') : email.to}`,
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Build event content for indexing
   */
  private buildEventContent(event: EventWithRelations): string {
    const parts = [event.title, event.description || '', event.location || ''];

    if (event.attendees && Array.isArray(event.attendees)) {
      const attendeeEmails = event.attendees
        .filter(a => typeof a === 'object' && a !== null && 'email' in a)
        .map(a => (a as { email: string }).email);
      if (attendeeEmails.length > 0) {
        parts.push(`Attendees: ${attendeeEmails.join(', ')}`);
      }
    }

    return parts.filter(Boolean).join(' ');
  }

  private checkEmailHasAttachments(
    attachments: object | string | number | boolean | null
  ): boolean {
    if (Array.isArray(attachments)) {
      return attachments.length > 0;
    }
    return false;
  }

  private getCalendarAttendeeCount(attendees: object | string | number | boolean | null): number {
    if (Array.isArray(attendees)) {
      return attendees.length;
    }
    return 0;
  }
}
