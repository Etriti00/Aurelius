import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessRequestDto {
  @ApiProperty({
    description: 'The main prompt/request for AI processing',
    example: 'Analyze my calendar for next week and suggest optimal meeting times',
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'Additional context to help AI understand the request',
    example: 'User has meetings on Monday and Wednesday, prefers morning slots',
    required: false,
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiProperty({
    description: 'Custom system prompt to override default behavior',
    required: false,
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiProperty({
    description: 'Action type for usage tracking and optimization',
    example: 'calendar-analysis',
  })
  @IsString()
  action: string;

  @ApiProperty({
    description: 'Additional metadata for request processing',
    example: {
      urgency: 'high',
      type: 'scheduling',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    urgency?: 'low' | 'normal' | 'high';
    type?: string;
    [key: string]: any;
  };
}