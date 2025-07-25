import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Paddle,
  Environment,
  Customer,
  Subscription,
  Transaction,
  CustomerPortalSession,
  CreateCustomerRequestBody,
  UpdateSubscriptionRequestBody,
} from '@paddle/paddle-node-sdk';
import { Prisma } from '@prisma/client';
import { BusinessException } from '../../../common/exceptions/business.exception';

@Injectable()
export class PaddleService {
  private readonly logger = new Logger(PaddleService.name);
  private readonly paddle: Paddle;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('PADDLE_API_KEY');
    const environment = this.configService.get<string>('PADDLE_ENVIRONMENT', 'sandbox');

    if (!apiKey) {
      throw new Error('PADDLE_API_KEY is required');
    }

    this.paddle = new Paddle(apiKey, {
      environment: environment === 'production' ? Environment.production : Environment.sandbox,
    });
  }

  /**
   * Create a new customer in Paddle
   */
  async createCustomer(
    email: string,
    name?: string,
    metadata?: Prisma.JsonObject
  ): Promise<Customer> {
    try {
      const customerData: CreateCustomerRequestBody = {
        email,
        name,
        customData: {
          ...metadata,
          platform: 'aurelius',
          createdAt: new Date().toISOString(),
        },
      };

      const customer = await this.paddle.customers.create(customerData);
      this.logger.log(`Created Paddle customer: ${customer.id}`);
      return customer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create customer: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to create customer',
        'PADDLE_CUSTOMER_CREATE_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(
    customerId: string,
    updates: { email?: string; name?: string; customData?: Record<string, unknown> }
  ): Promise<Customer> {
    try {
      const customer = await this.paddle.customers.update(customerId, updates);
      this.logger.log(`Updated Paddle customer: ${customerId}`);
      return customer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update customer: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to update customer',
        'PADDLE_CUSTOMER_UPDATE_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * Create a subscription transaction (Paddle's approach to subscription creation)
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    options?: {
      trialDays?: number;
      metadata?: Prisma.JsonObject;
      discountId?: string;
    }
  ): Promise<Transaction> {
    try {
      const transactionData = {
        customerId,
        items: [
          {
            priceId,
            quantity: 1,
          },
        ],
        customData: {
          ...options?.metadata,
          platform: 'aurelius',
          createdAt: new Date().toISOString(),
        },
        discountId: options?.discountId,
      };

      const transaction = await this.paddle.transactions.create(transactionData);
      this.logger.log(`Created Paddle transaction for subscription: ${transaction.id}`);
      return transaction;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create subscription transaction: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to create subscription',
        'PADDLE_SUBSCRIPTION_CREATE_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    subscriptionId: string,
    updates: {
      priceId?: string;
      quantity?: number;
      cancelAtPeriodEnd?: boolean;
      pauseAt?: string;
      resumeAt?: string;
    }
  ): Promise<Subscription> {
    try {
      const updateData: UpdateSubscriptionRequestBody = {};

      // Update price and/or quantity
      if (updates.priceId || updates.quantity !== undefined) {
        updateData.items = [
          {
            priceId: updates.priceId || '',
            quantity: updates.quantity ?? 1,
          },
        ];
      }

      // Handle cancellation
      if (updates.cancelAtPeriodEnd !== undefined) {
        if (updates.cancelAtPeriodEnd) {
          updateData.scheduledChange = {
            action: 'cancel',
            effectiveAt: 'next_billing_period',
          };
        } else {
          // Remove scheduled cancellation
          updateData.scheduledChange = null;
        }
      }

      // Handle pause/resume
      if (updates.pauseAt) {
        updateData.scheduledChange = {
          action: 'pause',
          effectiveAt: updates.pauseAt,
        };
      }

      if (updates.resumeAt) {
        updateData.scheduledChange = {
          action: 'resume',
          effectiveAt: updates.resumeAt,
        };
      }

      const subscription = await this.paddle.subscriptions.update(subscriptionId, updateData);
      this.logger.log(`Updated Paddle subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update subscription: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to update subscription',
        'PADDLE_SUBSCRIPTION_UPDATE_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * Cancel a subscription at the end of the billing period
   */
  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await this.paddle.subscriptions.update(subscriptionId, {
        scheduledChange: {
          action: 'cancel',
          effectiveAt: 'next_billing_period',
        },
      });

      this.logger.log(`Cancelled Paddle subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to cancel subscription: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to cancel subscription',
        'PADDLE_SUBSCRIPTION_CANCEL_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await this.paddle.subscriptions.get(subscriptionId, {
        include: ['next_transaction', 'recurring_transaction_details'],
      });
      return subscription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to retrieve subscription: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to retrieve subscription',
        'PADDLE_SUBSCRIPTION_NOT_FOUND',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * Create a customer portal session for self-service billing
   */
  async createBillingPortalSession(
    customerId: string,
    subscriptionIds: string[]
  ): Promise<CustomerPortalSession> {
    try {
      const session = await this.paddle.customerPortalSessions.create(customerId, subscriptionIds);
      this.logger.log(`Created Paddle portal session for customer: ${customerId}`);
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create billing portal session: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to create billing portal session',
        'PADDLE_PORTAL_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * List transactions for billing history
   */
  async listTransactions(customerId: string, limit: number = 10): Promise<Transaction[]> {
    try {
      const transactions = [];
      const transactionCollection = this.paddle.transactions.list({
        customerId: [customerId],
        perPage: limit,
      });

      for await (const transaction of transactionCollection) {
        transactions.push(transaction);
        if (transactions.length >= limit) break;
      }

      return transactions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list transactions: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to retrieve transactions',
        'PADDLE_TRANSACTIONS_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * Create a transaction with usage-based items
   * This handles usage-based billing by including usage data in transactions
   */
  async createUsageTransaction(
    customerId: string,
    subscriptionId: string,
    usage: { quantity: number; unitPrice: string; description: string }
  ): Promise<Transaction> {
    try {
      const transaction = await this.paddle.transactions.create({
        customerId,
        items: [
          {
            quantity: usage.quantity,
            price: {
              description: usage.description,
              name: 'Usage Charge',
              product: {
                name: usage.description,
                taxCategory: 'standard',
              },
              unitPrice: {
                amount: usage.unitPrice,
                currencyCode: 'USD',
              },
            },
          },
        ],
        customData: {
          subscriptionId,
          usageRecord: true,
          description: usage.description,
          timestamp: new Date().toISOString(),
        },
      });

      this.logger.log(`Created usage transaction: ${transaction.id}`);
      return transaction;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create usage transaction: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to record usage',
        'PADDLE_USAGE_RECORD_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * Handle Paddle webhook verification and event processing
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleWebhook(payload: string, signature: string): Promise<any> {
    try {
      const webhookSecret = this.configService.get<string>('PADDLE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        throw new Error('PADDLE_WEBHOOK_SECRET is required');
      }

      // Verify and unmarshal the webhook event
      const eventData = await this.paddle.webhooks.unmarshal(payload, webhookSecret, signature);

      this.logger.log(`Received Paddle webhook: ${eventData.eventType}`);
      return eventData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook signature verification failed: ${errorMessage}`, error);
      throw new BusinessException(
        'Invalid webhook signature',
        'PADDLE_WEBHOOK_INVALID',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * Get customer details
   */
  async getCustomer(customerId: string): Promise<Customer> {
    try {
      const customer = await this.paddle.customers.get(customerId);
      return customer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to retrieve customer: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to retrieve customer',
        'PADDLE_CUSTOMER_NOT_FOUND',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * List subscriptions for a customer
   */
  async listSubscriptions(customerId: string): Promise<Subscription[]> {
    try {
      const subscriptions = [];
      const subscriptionCollection = this.paddle.subscriptions.list({
        customerId: [customerId],
      });

      for await (const subscription of subscriptionCollection) {
        subscriptions.push(subscription);
      }

      return subscriptions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list subscriptions: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to retrieve subscriptions',
        'PADDLE_SUBSCRIPTIONS_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }

  /**
   * Unmarshal and verify Paddle webhook
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async unmarshalWebhook(rawBody: Buffer, signature: string): Promise<any> {
    try {
      // Use Paddle's webhook verification
      const event = await this.paddle.webhooks.unmarshal(
        rawBody.toString(),
        process.env.PADDLE_WEBHOOK_SECRET || '',
        signature
      );

      this.logger.log(`Verified Paddle webhook: ${event.eventType}`);
      return event;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to verify webhook: ${errorMessage}`, error);
      throw new BusinessException(
        'Webhook verification failed',
        'PADDLE_WEBHOOK_VERIFICATION_FAILED',
        undefined,
        { message: errorMessage }
      );
    }
  }
}
