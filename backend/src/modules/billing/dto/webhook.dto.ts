import { IsString, IsObject, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaddleWebhookDto {
  @ApiProperty({ description: 'Webhook event ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Webhook event type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'API version' })
  @IsString()
  api_version: string;

  @ApiProperty({ description: 'Event creation timestamp' })
  @IsNumber()
  created: number;

  @ApiProperty({ description: 'Event data' })
  @IsObject()
  data: {
    object: Record<string, string | number | boolean | null>;
    previous_attributes?: Record<string, string | number | boolean | null>;
  };

  @ApiProperty({ description: 'Livemode flag' })
  livemode: boolean;

  @ApiProperty({ description: 'Pending webhooks count' })
  pending_webhooks: number;

  @ApiProperty({ description: 'Request details' })
  request: {
    id: string | null;
    idempotency_key: string | null;
  };

  constructor() {
    this.id = '';
    this.type = '';
    this.api_version = '';
    this.created = 0;
    this.data = { object: {} };
    this.livemode = false;
    this.pending_webhooks = 0;
    this.request = { id: null, idempotency_key: null };
  }
}

export enum PaddleWebhookEvent {
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  TRANSACTION_COMPLETED = 'transaction.completed',
  TRANSACTION_UPDATED = 'transaction.updated',
  INVOICE_PAID = 'invoice.paid',
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
}
