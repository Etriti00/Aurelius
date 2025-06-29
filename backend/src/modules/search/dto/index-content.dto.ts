import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsEnum, IsArray } from 'class-validator';
import { SearchableType } from '../search.service';
import { SearchMetadata } from '../interfaces/search.interface';

export class IndexContentDto {
  @ApiProperty({ description: 'Unique identifier for the content' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Content to index' })
  @IsString()
  content: string;

  @ApiProperty({
    enum: SearchableType,
    description: 'Type of content',
  })
  @IsEnum(SearchableType)
  type: SearchableType;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
    properties: {
      contentType: { type: 'string' },
      contentId: { type: 'string' },
      userId: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } },
      priority: { type: 'string' },
      status: { type: 'string' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
      additionalData: { type: 'object' },
    },
  })
  @IsObject()
  @IsOptional()
  metadata?: SearchMetadata;

  constructor() {
    this.id = '';
    this.content = '';
    this.type = SearchableType.TASK;
  }
}

export class BulkIndexDto {
  @ApiProperty({
    description: 'Array of content items to index',
    type: [IndexContentDto],
  })
  @IsArray()
  items: IndexContentDto[];

  constructor() {
    this.items = [];
  }
}

export class IndexResponseDto {
  @ApiProperty({ description: 'Index operation success' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;

  constructor() {
    this.success = false;
  }
}

export class BulkIndexResponseDto {
  @ApiProperty({ description: 'Number of successfully indexed items' })
  indexed: number;

  @ApiProperty({ description: 'Number of failed items' })
  failed: number;

  @ApiPropertyOptional({
    description: 'Errors for failed items',
    type: 'object',
  })
  errors?: Array<{
    id: string;
    error: string;
  }>;

  constructor() {
    this.indexed = 0;
    this.failed = 0;
  }
}
