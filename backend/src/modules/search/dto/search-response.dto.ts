import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SearchMetadata } from '../interfaces/search.interface';

export class SearchResultDto {
  @ApiProperty({ description: 'Result ID' })
  id: string;

  @ApiProperty({ description: 'Similarity score', minimum: 0, maximum: 1 })
  score: number;

  @ApiPropertyOptional({ description: 'Distance from query vector' })
  distance?: number;

  @ApiProperty({ description: 'Result data' })
  data: {
    content: string;
    type?: string;
    metadata?: SearchMetadata;
    createdAt?: Date;
    updatedAt?: Date;
  };

  @ApiPropertyOptional({
    description: 'Highlighted snippets',
    type: [String],
  })
  highlights?: string[];

  constructor() {
    this.id = '';
    this.score = 0;
    this.data = {
      content: '',
    };
  }
}

export class SearchResponseDto {
  @ApiProperty({
    description: 'Search results',
    type: [SearchResultDto],
  })
  results: SearchResultDto[];

  @ApiProperty({ description: 'Total number of matching results' })
  total: number;

  @ApiProperty({ description: 'Search execution time in milliseconds' })
  took: number;

  @ApiPropertyOptional({
    description: 'Search facets/aggregations',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        field: { type: 'string' },
        values: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  facets?: Record<
    string,
    {
      field: string;
      values: Array<{
        value: string | number | boolean;
        count: number;
      }>;
    }
  >;

  @ApiPropertyOptional({
    description: 'Query suggestions',
    type: [String],
  })
  suggestions?: string[];

  constructor() {
    this.results = [];
    this.total = 0;
    this.took = 0;
  }
}

export class SuggestionsResponseDto {
  @ApiProperty({
    description: 'Search suggestions',
    type: [String],
  })
  suggestions: string[];

  constructor() {
    this.suggestions = [];
  }
}
