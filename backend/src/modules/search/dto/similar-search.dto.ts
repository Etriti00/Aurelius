import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class FindSimilarDto {
  @ApiProperty({ description: 'ID of the item to find similar items for' })
  @IsString()
  itemId: string;

  @ApiPropertyOptional({
    description: 'Number of similar items to return',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  constructor() {
    this.itemId = '';
  }
}

export class SimilarItemDto {
  @ApiProperty({ description: 'Item ID' })
  id: string;

  @ApiProperty({ description: 'Similarity score', minimum: 0, maximum: 1 })
  similarity: number;

  @ApiProperty({ description: 'Item type' })
  type: string;

  @ApiProperty({ description: 'Item title or summary' })
  title: string;

  @ApiPropertyOptional({ description: 'Item metadata' })
  metadata?: Record<string, any>;

  constructor() {
    this.id = '';
    this.similarity = 0;
    this.type = '';
    this.title = '';
  }
}

export class SimilarItemsResponseDto {
  @ApiProperty({
    description: 'Similar items',
    type: [SimilarItemDto],
  })
  items: SimilarItemDto[];

  @ApiProperty({ description: 'Total similar items found' })
  total: number;

  constructor() {
    this.items = [];
    this.total = 0;
  }
}
