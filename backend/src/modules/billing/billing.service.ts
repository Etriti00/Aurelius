import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Tier, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Define proper types for billing operations
interface SubscriptionUpdateData {
  tier?: Tier;
  stripePriceId?: string;
  monthlyActionLimit?: number;
  integrationLimit?: number;
  aiModelAccess?: string[];
  monthlyPrice?: number;
  overageRate?: number;
  cancelAtPeriodEnd?: boolean;
  status?: Status;
  canceledAt?: Date | null;
}

// TODO: Implement when payment methods are needed
// interface PaymentMethodData {
//   id: string;
//   type: string;
//   card?: {
//     brand: string;
//     last4: string;
//     expMonth: number;
//     expYear: number;
//   };
//   billingDetails?: {
//     name?: string;
//     email?: string;
//   };
// }

interface UsageData {
  error?: string;
  subscription?: {
    id: string;
    tier: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    monthlyActionLimit: number;
  };
  currentPeriod?: {
    start: Date;
    end: Date;
  };
  usage?: {
    aiActions: number;
    aiActionsLimit: number;
    totalCost: number;
  };
}

interface UsageLogEntry {
  createdAt: Date;
}
import {
  CreateCheckoutDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  CreateBillingPortalDto,
  RecordUsageDto,
  ListInvoicesDto,
  CheckoutResponseDto,
  SubscriptionResponseDto,
  BillingPortalResponseDto,
  UsageResponseDto,
  UsageSummaryDto,
  InvoiceListResponseDto,
  AddPaymentMethodDto,
  PaymentMethodDto,
  ListPaymentMethodsResponseDto,
} from './dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-05-28.basil',
    });
  }

  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutDto
  ): Promise<CheckoutResponseDto> {
    try {
      this.logger.log(`Creating checkout session for user ${userId} with price ${dto.priceId}`);

      // Get or create Stripe customer
      const customer = await this.getOrCreateStripeCustomer(userId);

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: dto.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${this.configService.get(
          'FRONTEND_URL'
        )}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get('FRONTEND_URL')}/billing/cancelled`,
        metadata: {
          userId,
        },
        subscription_data: {
          metadata: {
            userId,
          },
        },
      });

      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      this.logger.error(`Failed to create checkout session for user ${userId}`, error);
      throw new Error(
        `Failed to create checkout session: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async createSubscription(
    userId: string,
    dto: CreateSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Creating subscription for user ${userId}`);

      // Get or create Stripe customer
      const customer = await this.getOrCreateStripeCustomer(userId);

      // Create Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price: dto.priceId,
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
        },
      });

      // Retrieve the full subscription to get all fields
      const fullSubscription = await this.stripe.subscriptions.retrieve(stripeSubscription.id);

      // Map price ID to tier
      const tier = this.getTierFromPriceId(dto.priceId);

      // Create local subscription record
      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          tier,
          status: this.mapStripeStatusToLocal(fullSubscription.status),
          stripeCustomerId: customer.id,
          stripeSubscriptionId: fullSubscription.id,
          stripePriceId: dto.priceId,
          currentPeriodStart: new Date(fullSubscription.created * 1000),
          currentPeriodEnd: new Date((fullSubscription.created + 2592000) * 1000), // 30 days from creation
          monthlyActionLimit: this.getActionLimit(tier),
          integrationLimit: this.getIntegrationLimit(tier),
          aiModelAccess: this.getAIModelAccess(tier),
          monthlyPrice: this.getMonthlyPrice(tier),
          overageRate: this.getOverageRate(tier),
        },
      });

      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        items: stripeSubscription.items.data.map(item => ({
          id: item.id,
          priceId: item.price.id,
          quantity: item.quantity || 1,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to create subscription for user ${userId}`, error);
      throw new Error(
        `Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getCurrentSubscription(userId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('No subscription found');
    }

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      items: [
        {
          id: `si_${Date.now()}`,
          priceId: subscription.stripePriceId,
          quantity: 1,
        },
      ],
    };
  }

  async updateSubscription(
    userId: string,
    dto: UpdateSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    const updateData: SubscriptionUpdateData = {};

    if (dto.priceId) {
      const tier = this.getTierFromPriceId(dto.priceId);
      updateData.tier = tier;
      updateData.stripePriceId = dto.priceId;
      updateData.monthlyActionLimit = this.getActionLimit(tier);
      updateData.integrationLimit = this.getIntegrationLimit(tier);
      updateData.aiModelAccess = this.getAIModelAccess(tier);
      updateData.monthlyPrice = this.getMonthlyPrice(tier);
      updateData.overageRate = this.getOverageRate(tier);
    }

    if (dto.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = dto.cancelAtPeriodEnd;
    }

    const subscription = await this.prisma.subscription.update({
      where: { userId },
      data: updateData,
    });

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      items: [
        {
          id: `si_${Date.now()}`,
          priceId: subscription.stripePriceId,
          quantity: 1,
        },
      ],
    };
  }

  async cancelSubscription(
    userId: string,
    dto: CancelSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: dto.immediately ? false : true,
        canceledAt: dto.immediately ? new Date() : null,
      },
    });

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      items: [
        {
          id: `si_${Date.now()}`,
          priceId: subscription.stripePriceId,
          quantity: 1,
        },
      ],
    };
  }

  async createBillingPortalSession(
    userId: string,
    dto: CreateBillingPortalDto
  ): Promise<BillingPortalResponseDto> {
    this.logger.log(
      `Creating billing portal session for user ${userId} with return URL ${dto.returnUrl}`
    );

    // In a real implementation, this would create a Stripe billing portal session
    const sessionId = `bps_${Date.now()}`;
    return {
      id: sessionId,
      url: `https://billing.stripe.com/p/session_${sessionId}`,
      returnUrl: dto.returnUrl,
      created: new Date(),
    };
  }

  async recordUsage(userId: string, dto: RecordUsageDto): Promise<UsageResponseDto> {
    const timestamp = dto.timestamp || new Date();

    // Get user's current billing period
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user || !user.subscription) {
      throw new Error('User or subscription not found');
    }

    // Create a simplified usage record in ActionLog for now
    // In a real implementation, you might have a separate UsageLog table
    const usage = await this.prisma.actionLog.create({
      data: {
        userId,
        type: dto.action,
        category: 'usage',
        metadata: dto.metadata || {},
        status: 'success',
      },
    });

    return {
      id: usage.id,
      userId,
      action: dto.action,
      quantity: dto.quantity,
      timestamp,
      billingPeriod: {
        start: user.subscription.currentPeriodStart,
        end: user.subscription.currentPeriodEnd,
      },
    };
  }

  async getUsageSummary(userId: string): Promise<UsageSummaryDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error('No subscription found');
    }

    // Get usage data from ActionLog
    const usageLogs = await this.prisma.actionLog.findMany({
      where: {
        userId,
        category: 'usage',
        createdAt: {
          gte: subscription.currentPeriodStart,
          lte: subscription.currentPeriodEnd,
        },
      },
    });

    // Calculate usage by action type
    const usageByAction: Record<string, number> = {};
    let totalAiRequests = 0;
    let totalEmailsProcessed = 0;
    let totalTasksAutomated = 0;

    usageLogs.forEach(log => {
      usageByAction[log.type] = (usageByAction[log.type] || 0) + 1;

      switch (log.type) {
        case 'AI_REQUEST':
          totalAiRequests++;
          break;
        case 'EMAIL_PROCESSED':
          totalEmailsProcessed++;
          break;
        case 'TASK_AUTOMATED':
          totalTasksAutomated++;
          break;
      }
    });

    const totalUsage = usageLogs.length;
    const remaining = Math.max(0, subscription.monthlyActionLimit - totalUsage);
    const percentageUsed = (totalUsage / subscription.monthlyActionLimit) * 100;

    // Generate daily usage trend (simplified)
    const dailyUsage = this.generateDailyUsageTrend(
      usageLogs,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd
    );

    return {
      userId,
      period: {
        start: subscription.currentPeriodStart,
        end: subscription.currentPeriodEnd,
      },
      totalAiRequests,
      totalEmailsProcessed,
      totalTasksAutomated,
      usageByAction,
      dailyUsage,
      percentageUsed,
      remaining,
    };
  }

  async listInvoices(userId: string, query: ListInvoicesDto): Promise<InvoiceListResponseDto> {
    this.logger.log(`Listing invoices for user ${userId} with limit ${query.limit}`);

    // In a real implementation, this would fetch from Stripe
    return {
      data: [],
      hasMore: false,
      totalCount: 0,
    };
  }

  async listPaymentMethods(userId: string): Promise<ListPaymentMethodsResponseDto> {
    this.logger.log(`Listing payment methods for user ${userId}`);

    // In a real implementation, this would fetch from Stripe
    return {
      data: [],
      defaultPaymentMethodId: undefined,
    };
  }

  async addPaymentMethod(userId: string, dto: AddPaymentMethodDto): Promise<PaymentMethodDto> {
    this.logger.log(`Adding payment method ${dto.paymentMethodId} for user ${userId}`);

    // In a real implementation, this would create a payment method in Stripe
    return {
      id: dto.paymentMethodId,
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2025,
      },
      isDefault: dto.setAsDefault || false,
      created: new Date(),
    };
  }

  async removePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    this.logger.log(`Removing payment method ${paymentMethodId} for user ${userId}`);

    // In a real implementation, this would remove the payment method from Stripe
    // For now, we just log the operation
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    this.logger.log(`Processing webhook with signature ${signature.substring(0, 10)}...`);

    // In a real implementation, this would verify the webhook signature
    // and process the event from Stripe
    const bodyString = rawBody.toString();
    this.logger.debug(`Webhook body length: ${bodyString.length} bytes`);

    // Process the webhook event here
    // This is where you would handle subscription updates, payment confirmations, etc.
  }

  async getUsage(userId: string): Promise<UsageData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user?.subscription) {
      return { error: 'No subscription found' };
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await this.prisma.aIUsageLog.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        totalCost: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      subscription: user.subscription,
      currentPeriod: {
        start: user.subscription.currentPeriodStart,
        end: user.subscription.currentPeriodEnd,
      },
      usage: {
        aiActions: usage._count.id || 0,
        aiActionsLimit: user.subscription.monthlyActionLimit,
        totalCost: usage._sum.totalCost?.toNumber() || 0,
      },
    };
  }

  private getActionLimit(tier: string): number {
    switch (tier) {
      case 'PRO':
        return 1000;
      case 'MAX':
        return 3000;
      case 'TEAMS':
        return 2000;
      default:
        return 1000;
    }
  }

  private getIntegrationLimit(tier: string): number {
    switch (tier) {
      case 'PRO':
        return 3;
      case 'MAX':
        return -1; // unlimited
      case 'TEAMS':
        return -1; // unlimited
      default:
        return 3;
    }
  }

  private getAIModelAccess(tier: string): string[] {
    switch (tier) {
      case 'PRO':
        return ['claude-3-haiku'];
      case 'MAX':
        return ['claude-3-haiku', 'claude-3-5-sonnet'];
      case 'TEAMS':
        return ['claude-3-haiku', 'claude-3-5-sonnet', 'claude-3-opus'];
      default:
        return ['claude-3-haiku'];
    }
  }

  private getMonthlyPrice(tier: string): number {
    switch (tier) {
      case 'PRO':
        return 50;
      case 'MAX':
        return 100;
      case 'TEAMS':
        return 70;
      default:
        return 50;
    }
  }

  private getOverageRate(tier: string): number {
    switch (tier) {
      case 'PRO':
        return 0.06;
      case 'MAX':
        return 0.066;
      case 'TEAMS':
        return 0.1;
      default:
        return 0.06;
    }
  }

  private getTierFromPriceId(priceId: string): Tier {
    // In a real implementation, this would be a lookup table or database query
    // For now, we'll use a simple mapping based on common Stripe price ID patterns
    if (priceId.includes('pro') || priceId.includes('basic')) {
      return Tier.PRO;
    } else if (priceId.includes('max') || priceId.includes('premium')) {
      return Tier.MAX;
    } else if (priceId.includes('team') || priceId.includes('enterprise')) {
      return Tier.TEAMS;
    }

    // Default to PRO tier
    return Tier.PRO;
  }

  private generateDailyUsageTrend(
    usageLogs: UsageLogEntry[],
    periodStart: Date,
    periodEnd: Date
  ): Array<{ date: Date; count: number }> {
    const dailyUsage: Array<{ date: Date; count: number }> = [];
    const usageByDate: Record<string, number> = {};

    // Count usage by date
    usageLogs.forEach(log => {
      const dateKey = log.createdAt.toISOString().split('T')[0];
      usageByDate[dateKey] = (usageByDate[dateKey] || 0) + 1;
    });

    // Generate daily entries for the entire period
    const currentDate = new Date(periodStart);
    while (currentDate <= periodEnd) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyUsage.push({
        date: new Date(currentDate),
        count: usageByDate[dateKey] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyUsage;
  }

  private async getOrCreateStripeCustomer(userId: string): Promise<Stripe.Customer> {
    try {
      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if customer already exists in our database
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId },
        select: { stripeCustomerId: true },
      });

      if (existingSubscription?.stripeCustomerId) {
        // Verify customer exists in Stripe
        try {
          const customer = await this.stripe.customers.retrieve(
            existingSubscription.stripeCustomerId
          );
          if (!customer.deleted) {
            return customer as Stripe.Customer;
          }
        } catch (error) {
          this.logger.warn(
            `Stripe customer ${existingSubscription.stripeCustomerId} not found, creating new one`
          );
        }
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId,
        },
      });

      this.logger.log(`Created Stripe customer ${customer.id} for user ${userId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to get or create Stripe customer for user ${userId}`, error);
      throw new Error(
        `Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private mapStripeStatusToLocal(
    stripeStatus: string
  ): 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'PAUSED' {
    switch (stripeStatus) {
      case 'active':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'canceled':
      case 'cancelled':
        return 'CANCELED';
      case 'unpaid':
        return 'PAST_DUE';
      case 'incomplete':
      case 'incomplete_expired':
        return 'PAUSED';
      case 'trialing':
        return 'TRIALING';
      case 'paused':
        return 'PAUSED';
      default:
        return 'PAUSED';
    }
  }
}
