import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { SearchableType } from '../search.service';

export class SearchDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ 
    description: 'Number of results to return',
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ 
    description: 'Offset for pagination',
    minimum: 0
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ 
    description: 'Minimum similarity threshold',
    minimum: 0,
    maximum: 1,
    default: 0.7
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  @Max(1)
  threshold?: number = 0.7;

  @ApiPropertyOptional({ description: 'Include metadata in results' })
  @IsBoolean()
  @IsOptional()
  includeMetadata?: boolean = false;

  @ApiPropertyOptional({ description: 'Include distance scores' })
  @IsBoolean()
  @IsOptional()
  includeDistance?: boolean = false;

  constructor() {
    this.query = '';
  }
}

export class SearchByTypeDto extends SearchDto {
  @ApiProperty({ 
    enum: SearchableType,
    description: 'Content type to search'
  })
  @IsEnum(SearchableType)
  type: SearchableType;

  constructor() {
    super();
    this.type = SearchableType.TASK;
  }
}

export class SearchSuggestionsDto {
  @ApiProperty({ description: 'Partial query for suggestions' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ 
    description: 'Number of suggestions',
    minimum: 1,
    maximum: 10,
    default: 5
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(10)
  limit?: number = 5;

  constructor() {
    this.query = '';
  }
}