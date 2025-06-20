import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ description: 'New price ID to switch to' })
  @IsString()
  @IsOptional()
  priceId?: string;

  @ApiPropertyOptional({ description: 'Update quantity for usage-based pricing' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Cancel subscription at period end' })
  @IsBoolean()
  @IsOptional()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional({ description: 'Proration behavior', enum: ['always_invoice', 'create_prorations', 'none'] })
  @IsString()
  @IsOptional()
  prorationBehavior?: 'always_invoice' | 'create_prorations' | 'none';
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Cancel immediately or at period end', default: false })
  @IsBoolean()
  @IsOptional()
  immediately?: boolean = false;

  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsString()
  @IsOptional()
  reason?: string;
}