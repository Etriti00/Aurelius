import { IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

export class ListInvoicesDto {
  @ApiPropertyOptional({ description: 'Number of invoices to retrieve', minimum: 1, maximum: 100 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Starting after invoice ID for pagination' })
  @IsOptional()
  startingAfter?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus, description: 'Filter by status' })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;
}

export class InvoiceDto {
  @ApiPropertyOptional({ description: 'Invoice ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Invoice number' })
  number: string;

  @ApiPropertyOptional({ description: 'Invoice status' })
  status: InvoiceStatus;

  @ApiPropertyOptional({ description: 'Amount due in cents' })
  amountDue: number;

  @ApiPropertyOptional({ description: 'Amount paid in cents' })
  amountPaid: number;

  @ApiPropertyOptional({ description: 'Currency' })
  currency: string;

  @ApiPropertyOptional({ description: 'Invoice date' })
  created: Date;

  @ApiPropertyOptional({ description: 'Due date' })
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'PDF URL' })
  invoicePdf?: string;

  @ApiPropertyOptional({ description: 'Hosted invoice URL' })
  hostedInvoiceUrl?: string;

  @ApiPropertyOptional({ description: 'Line items' })
  lines: Array<{
    id: string;
    description: string;
    amount: number;
    quantity: number;
    period: {
      start: Date;
      end: Date;
    };
  }>;
}

export class InvoiceListResponseDto {
  @ApiPropertyOptional({ description: 'List of invoices' })
  data: InvoiceDto[];

  @ApiPropertyOptional({ description: 'Has more invoices' })
  hasMore: boolean;

  @ApiPropertyOptional({ description: 'Total count' })
  totalCount: number;
}