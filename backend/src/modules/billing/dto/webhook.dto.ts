import { IsString, IsObject, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StripeWebhookDto {
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

export enum StripeWebhookEvent {
  CHECKOUT_SESSION_COMPLETED = 'checkout.session.completed',
  CUSTOMER_SUBSCRIPTION_CREATED = 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED = 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED = 'customer.subscription.deleted',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_PAYMENT_FAILED = 'invoice.payment_failed',
  PAYMENT_METHOD_ATTACHED = 'payment_method.attached',
  PAYMENT_METHOD_DETACHED = 'payment_method.detached',
}
