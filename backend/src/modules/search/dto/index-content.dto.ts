import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsEnum, IsArray } from 'class-validator';
import { SearchableType } from '../search.service';

export class IndexContentDto {
  @ApiProperty({ description: 'Unique identifier for the content' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Content to index' })
  @IsString()
  content: string;

  @ApiProperty({ 
    enum: SearchableType,
    description: 'Type of content'
  })
  @IsEnum(SearchableType)
  type: SearchableType;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkIndexDto {
  @ApiProperty({ 
    description: 'Array of content items to index',
    type: [IndexContentDto]
  })
  @IsArray()
  items: IndexContentDto[];
}

export class IndexResponseDto {
  @ApiProperty({ description: 'Index operation success' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}

export class BulkIndexResponseDto {
  @ApiProperty({ description: 'Number of successfully indexed items' })
  indexed: number;

  @ApiProperty({ description: 'Number of failed items' })
  failed: number;

  @ApiPropertyOptional({ 
    description: 'Errors for failed items',
    type: 'object'
  })
  errors?: Array<{
    id: string;
    error: string;
  }>;
}