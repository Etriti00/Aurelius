import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, MaxLength, IsBoolean } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'File to upload' })
  file: any;

  @ApiPropertyOptional({ description: 'Custom filename' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  filename?: string;

  @ApiPropertyOptional({ description: 'Folder path' })
  @IsString()
  @IsOptional()
  folder?: string;

  @ApiPropertyOptional({ description: 'Make file publicly accessible' })
  @IsBoolean()
  @IsOptional()
  public?: boolean = false;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UploadMultipleFilesDto {
  @ApiProperty({ 
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Files to upload'
  })
  files: any[];

  @ApiPropertyOptional({ description: 'Folder path' })
  @IsString()
  @IsOptional()
  folder?: string;

  @ApiPropertyOptional({ description: 'Make files publicly accessible' })
  @IsBoolean()
  @IsOptional()
  public?: boolean = false;

  constructor() {
    this.files = [];
  }
}