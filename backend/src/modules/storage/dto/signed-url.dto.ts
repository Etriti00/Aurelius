import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetSignedUrlDto {
  @ApiPropertyOptional({ 
    description: 'URL expiration time in seconds',
    minimum: 60,
    maximum: 604800,
    default: 3600
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(60)
  @Max(604800) // 7 days
  expiresIn?: number = 3600;

  @ApiPropertyOptional({ description: 'Response content type override' })
  @IsString()
  @IsOptional()
  responseContentType?: string;

  @ApiPropertyOptional({ description: 'Response content disposition' })
  @IsString()
  @IsOptional()
  responseContentDisposition?: string;
}

export class SignedUrlResponseDto {
  @ApiProperty({ description: 'Signed URL' })
  url: string;

  @ApiProperty({ description: 'URL expiration timestamp' })
  expiresAt: Date;

  constructor(
    url: string = '',
    expiresAt: Date = new Date()
  ) {
    this.url = url;
    this.expiresAt = expiresAt;
  }
}