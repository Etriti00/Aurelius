import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty({ description: 'File ID' })
  id: string;

  @ApiProperty({ description: 'Filename' })
  filename: string;

  @ApiProperty({ description: 'Original filename' })
  originalName: string;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'Direct URL' })
  url: string;

  @ApiPropertyOptional({ description: 'CDN URL' })
  cdnUrl?: string;

  @ApiProperty({ description: 'S3 bucket name' })
  bucket: string;

  @ApiProperty({ description: 'S3 object key' })
  key: string;

  @ApiPropertyOptional({ description: 'File metadata' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt: Date;

  @ApiPropertyOptional({ description: 'Last modified timestamp' })
  lastModified?: Date;

  @ApiPropertyOptional({ description: 'Image variants (for images only)' })
  variants?: Record<string, string>;
}

export class FileListResponseDto {
  @ApiProperty({ type: [FileResponseDto], description: 'List of files' })
  files: FileResponseDto[];

  @ApiProperty({ type: [String], description: 'List of folders' })
  folders: string[];

  @ApiPropertyOptional({ description: 'Continuation token for pagination' })
  continuationToken?: string;

  @ApiProperty({ description: 'Whether there are more results' })
  isTruncated: boolean;

  @ApiProperty({ description: 'Total count of files' })
  totalCount: number;
}