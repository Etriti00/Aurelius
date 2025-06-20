import { IsString, IsOptional, IsNumber, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Stripe price ID' })
  @IsString()
  priceId: string;

  @ApiPropertyOptional({ description: 'Payment method ID' })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Trial period in days', minimum: 1, maximum: 90 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(90)
  trialDays?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SubscriptionResponseDto {
  @ApiProperty({ description: 'Subscription ID' })
  id: string;

  @ApiProperty({ description: 'Subscription status' })
  status: string;

  @ApiProperty({ description: 'Current period start' })
  currentPeriodStart: Date;

  @ApiProperty({ description: 'Current period end' })
  currentPeriodEnd: Date;

  @ApiProperty({ description: 'Cancellation date if scheduled' })
  cancelAt?: Date;

  @ApiProperty({ description: 'Trial end date' })
  trialEnd?: Date;

  @ApiProperty({ description: 'Subscription items' })
  items: {
    id: string;
    priceId: string;
    quantity: number;
  }[];

  @ApiProperty({ description: 'Client secret for payment intent' })
  clientSecret?: string;
}