import { IsArray, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BulkOperationType {
  ENABLE = 'enable',
  DISABLE = 'disable',
  DELETE = 'delete',
}

export class BulkOperationDto {
  @ApiProperty({ description: 'List of job IDs to operate on' })
  @IsArray()
  @IsString({ each: true })
  jobIds: string[] = [];

  @ApiProperty({
    enum: BulkOperationType,
    description: 'Operation to perform on selected jobs',
  })
  @IsEnum(BulkOperationType)
  operation: BulkOperationType = BulkOperationType.ENABLE;

  constructor(partial: Partial<BulkOperationDto> = {}) {
    Object.assign(this, partial);
  }
}
