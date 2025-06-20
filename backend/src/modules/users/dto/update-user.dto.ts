import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    description: 'ElevenLabs voice ID for text-to-speech',
    example: 'rachel',
    required: false,
  })
  @IsOptional()
  @IsString()
  voiceId?: string;

  @ApiProperty({
    description: 'Voice playback speed multiplier',
    example: 1.0,
    minimum: 0.5,
    maximum: 2.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  voiceSpeed?: number;
}