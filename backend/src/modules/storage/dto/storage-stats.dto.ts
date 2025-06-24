import { ApiProperty } from '@nestjs/swagger';

export class FileTypeStatsDto {
  @ApiProperty({ description: 'Number of files' })
  count: number;

  @ApiProperty({ description: 'Total size in bytes' })
  size: number;

  @ApiProperty({ description: 'Percentage of total storage' })
  percentage: number;

  constructor() {
    this.count = 0;
    this.size = 0;
    this.percentage = 0;
  }
}

export class StorageStatsDto {
  @ApiProperty({ description: 'Total number of files' })
  totalFiles: number;

  @ApiProperty({ description: 'Total storage size in bytes' })
  totalSize: number;

  @ApiProperty({ description: 'Total storage size (human readable)' })
  totalSizeFormatted: string;

  @ApiProperty({ description: 'Storage limit in bytes' })
  storageLimit: number;

  @ApiProperty({ description: 'Storage limit (human readable)' })
  storageLimitFormatted: string;

  @ApiProperty({ description: 'Percentage of storage used' })
  usagePercentage: number;

  @ApiProperty({
    description: 'Statistics by file type',
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/FileTypeStatsDto' },
  })
  byType: Record<string, FileTypeStatsDto>;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;

  constructor() {
    this.totalFiles = 0;
    this.totalSize = 0;
    this.totalSizeFormatted = '';
    this.storageLimit = 0;
    this.storageLimitFormatted = '';
    this.usagePercentage = 0;
    this.byType = {};
    this.lastUpdated = new Date();
  }
}

export class QuotaDto {
  @ApiProperty({ description: 'Storage quota in bytes' })
  quota: number;

  @ApiProperty({ description: 'Storage used in bytes' })
  used: number;

  @ApiProperty({ description: 'Storage remaining in bytes' })
  remaining: number;

  @ApiProperty({ description: 'Percentage used' })
  percentageUsed: number;

  @ApiProperty({ description: 'Can upload more files' })
  canUpload: boolean;

  constructor() {
    this.quota = 0;
    this.used = 0;
    this.remaining = 0;
    this.percentageUsed = 0;
    this.canUpload = true;
  }
}
