import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import Stripe from 'stripe';
import { BusinessException } from '../../../common/exceptions';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
  }

  async createCustomer(email: string, name?: string, metadata?: any): Promise<Stripe.Customer> {
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
    } catch (error: any) {
      this.logger.error(`Failed to create customer: ${error.message}`);
      throw new BusinessException(
        'Failed to create customer',
        'STRIPE_CUSTOMER_CREATE_FAILED',
        undefined,
        error,
      );
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    options?: {
      trialDays?: number;
      metadata?: any;
      paymentMethodId?: string;
    },
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
    } catch (error: any) {
      this.logger.error(`Failed to create subscription: ${error.message}`);
      throw new BusinessException(
        'Failed to create subscription',
        'STRIPE_SUBSCRIPTION_CREATE_FAILED',
        undefined,
        error,
      );
    }
  }

  async updateSubscription(
    subscriptionId: string,
    updates: {
      priceId?: string;
      quantity?: number;
      cancelAtPeriodEnd?: boolean;
    },
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
    } catch (error: any) {
      this.logger.error(`Failed to update subscription: ${error.message}`);
      throw new BusinessException(
        'Failed to update subscription',
        'STRIPE_SUBSCRIPTION_UPDATE_FAILED',
        undefined,
        error,
      );
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (error: any) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`);
      throw new BusinessException(
        'Failed to cancel subscription',
        'STRIPE_SUBSCRIPTION_CANCEL_FAILED',
        undefined,
        error,
      );
    }
  }

  async createPaymentMethod(
    customerId: string,
    paymentMethodId: string,
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
    } catch (error: any) {
      this.logger.error(`Failed to create payment method: ${error.message}`);
      throw new BusinessException(
        'Failed to add payment method',
        'STRIPE_PAYMENT_METHOD_FAILED',
        undefined,
        error,
      );
    }
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
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
    } catch (error: any) {
      this.logger.error(`Failed to create checkout session: ${error.message}`);
      throw new BusinessException(
        'Failed to create checkout session',
        'STRIPE_CHECKOUT_FAILED',
        undefined,
        error,
      );
    }
  }

  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      return await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
    } catch (error: any) {
      this.logger.error(`Failed to create billing portal session: ${error.message}`);
      throw new BusinessException(
        'Failed to create billing portal session',
        'STRIPE_PORTAL_FAILED',
        undefined,
        error,
      );
    }
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.stripeWebhookSecret,
      );
    } catch (error: any) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw new BusinessException(
        'Invalid webhook signature',
        'STRIPE_WEBHOOK_INVALID',
        undefined,
        error,
      );
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['customer', 'default_payment_method'],
      });
    } catch (error: any) {
      this.logger.error(`Failed to retrieve subscription: ${error.message}`);
      throw new BusinessException(
        'Failed to retrieve subscription',
        'STRIPE_SUBSCRIPTION_NOT_FOUND',
        undefined,
        error,
      );
    }
  }

  async listInvoices(
    customerId: string,
    limit: number = 10,
  ): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
      });
      return invoices.data;
    } catch (error: any) {
      this.logger.error(`Failed to list invoices: ${error.message}`);
      throw new BusinessException(
        'Failed to retrieve invoices',
        'STRIPE_INVOICES_FAILED',
        undefined,
        error,
      );
    }
  }

  async createUsageRecord(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: number,
  ): Promise<Stripe.UsageRecord> {
    try {
      return await this.stripe.subscriptionItems.createUsageRecord(
        subscriptionItemId,
        {
          quantity,
          timestamp: timestamp || Math.floor(Date.now() / 1000),
          action: 'increment',
        },
      );
    } catch (error: any) {
      this.logger.error(`Failed to create usage record: ${error.message}`);
      throw new BusinessException(
        'Failed to record usage',
        'STRIPE_USAGE_RECORD_FAILED',
        undefined,
        error,
      );
    }
  }
}