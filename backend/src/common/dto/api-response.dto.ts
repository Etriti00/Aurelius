import { ApiProperty } from '@nestjs/swagger';

// Base interface for response data
interface ResponseData {
  [key: string]: string | number | boolean | null | ResponseData | ResponseData[];
}

// Interface for error details
interface ErrorDetails {
  field?: string;
  code?: string;
  message?: string;
  value?: string | number | boolean;
  [key: string]: string | number | boolean | undefined;
}

export class ApiResponseDto<T extends ResponseData = ResponseData> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response data',
    required: false,
  })
  data?: T;

  @ApiProperty({
    description: 'Error message if request failed',
    required: false,
    example: 'Invalid request parameters',
  })
  message?: string;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2024-12-25T10:00:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path',
    example: '/api/v1/tasks',
  })
  path: string;

  constructor(data: Partial<ApiResponseDto<T>>) {
    this.success = data.success !== undefined ? data.success : true;
    this.data = data.data;
    this.message = data.message;
    this.statusCode = data.statusCode !== undefined ? data.statusCode : 200;
    this.timestamp = data.timestamp !== undefined ? data.timestamp : new Date().toISOString();
    this.path = data.path !== undefined ? data.path : '';
  }
}

export class PaginatedResponseDto<T = ResponseData> {
  @ApiProperty({
    description: 'Array of data items',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Current page number',
        example: 1,
      },
      limit: {
        type: 'number',
        description: 'Number of items per page',
        example: 10,
      },
      total: {
        type: 'number',
        description: 'Total number of items',
        example: 100,
      },
      totalPages: {
        type: 'number',
        description: 'Total number of pages',
        example: 10,
      },
      hasNext: {
        type: 'boolean',
        description: 'Whether there are more pages',
        example: true,
      },
      hasPrev: {
        type: 'boolean',
        description: 'Whether there are previous pages',
        example: false,
      },
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  constructor(data: Partial<PaginatedResponseDto<T>>) {
    this.data = data.data !== undefined ? data.data : [];
    this.pagination =
      data.pagination !== undefined
        ? data.pagination
        : {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          };
  }
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed',
  })
  message: string | string[];

  @ApiProperty({
    description: 'Error code or type',
    example: 'VALIDATION_ERROR',
  })
  error: string;

  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp of the error',
    example: '2024-12-25T10:00:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path that caused the error',
    example: '/api/v1/tasks',
  })
  path: string;

  @ApiProperty({
    description: 'Additional error details',
    required: false,
    type: 'object',
  })
  details?: ErrorDetails;

  constructor(data: Partial<ErrorResponseDto>) {
    this.message = data.message !== undefined ? data.message : '';
    this.error = data.error !== undefined ? data.error : '';
    this.statusCode = data.statusCode !== undefined ? data.statusCode : 400;
    this.timestamp = data.timestamp !== undefined ? data.timestamp : new Date().toISOString();
    this.path = data.path !== undefined ? data.path : '';
    this.details = data.details;
  }
}
