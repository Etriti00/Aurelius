import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { BusinessException } from '../../../common/exceptions';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.stripeSecretKey, {
      apiVersion: '2025-05-28.basil',
    });
  }

  async createCustomer(
    email: string,
    name?: string,
    metadata?: Prisma.JsonObject
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.create({
        email,
        name,
        metadata: {
          ...metadata,
          platform: 'aurelius',
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create customer: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to create customer',
        'STRIPE_CUSTOMER_CREATE_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    options?: {
      trialDays?: number;
      metadata?: Prisma.JsonObject;
      paymentMethodId?: string;
    }
  ): Promise<Stripe.Subscription> {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          ...options?.metadata,
          platform: 'aurelius',
        },
      };

      if (options?.trialDays) {
        subscriptionData.trial_period_days = options.trialDays;
      }

      if (options?.paymentMethodId) {
        subscriptionData.default_payment_method = options.paymentMethodId;
      }

      return await this.stripe.subscriptions.create(subscriptionData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create subscription: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to create subscription',
        'STRIPE_SUBSCRIPTION_CREATE_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  async updateSubscription(
    subscriptionId: string,
    updates: {
      priceId?: string;
      quantity?: number;
      cancelAtPeriodEnd?: boolean;
    }
  ): Promise<Stripe.Subscription> {
    try {
      const updateData: Stripe.SubscriptionUpdateParams = {};

      if (updates.priceId) {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        updateData.items = [
          {
            id: subscription.items.data[0].id,
            price: updates.priceId,
          },
        ];
      }

      if (updates.quantity !== undefined) {
        updateData.items = [
          {
            id: (await this.stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
            quantity: updates.quantity,
          },
        ];
      }

      if (updates.cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = updates.cancelAtPeriodEnd;
      }

      return await this.stripe.subscriptions.update(subscriptionId, updateData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update subscription: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to update subscription',
        'STRIPE_SUBSCRIPTION_UPDATE_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to cancel subscription: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to cancel subscription',
        'STRIPE_SUBSCRIPTION_CANCEL_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  async createPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return paymentMethod;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create payment method: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to add payment method',
        'STRIPE_PAYMENT_METHOD_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create checkout session: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to create checkout session',
        'STRIPE_CHECKOUT_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      return await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create billing portal session: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to create billing portal session',
        'STRIPE_PORTAL_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.stripeWebhookSecret
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook signature verification failed: ${errorMessage}`, error);
      throw new BusinessException(
        'Invalid webhook signature',
        'STRIPE_WEBHOOK_INVALID',
        undefined,
        { message: errorMessage }
      );
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['customer', 'default_payment_method'],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to retrieve subscription: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to retrieve subscription',
        'STRIPE_SUBSCRIPTION_NOT_FOUND',
        undefined,
        { message: errorMessage }
      );
    }
  }

  async listInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
      });
      return invoices.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list invoices: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to retrieve invoices',
        'STRIPE_INVOICES_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  async createUsageRecord(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: number
  ): Promise<Stripe.Response<Stripe.Billing.MeterEvent>> {
    try {
      return await this.stripe.billing.meterEvents.create({
        event_name: 'api_request',
        payload: {
          value: quantity.toString(),
          stripe_customer_id: subscriptionItemId,
        },
        timestamp: timestamp || Math.floor(Date.now() / 1000),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create usage record: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to record usage',
        'STRIPE_USAGE_RECORD_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }
}
