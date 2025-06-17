import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { RedisService } from '../../common/services/redis.service'
import { WebsocketService } from '../websocket/websocket.service'
import { Subscription, SubscriptionStatus, SubscriptionTier, User } from '@prisma/client'
import Stripe from 'stripe'

export interface CreateSubscriptionDto {
  tier: SubscriptionTier,
  interval: 'monthly' | 'yearly'
  paymentMethodId?: string
}

export interface UpdateSubscriptionDto {
  tier?: SubscriptionTier
  interval?: 'monthly' | 'yearly'
}

export interface BillingInfo {
  subscription: Subscription
  upcomingInvoice?: Stripe.UpcomingInvoice
  paymentMethods: Stripe.PaymentMethod[],
  billingHistory: Stripe.Invoice[],
  usage: {,
    aiActions: number,
    aiActionsLimit: number,
    integrations: number,
    integrationsLimit: number
  }
}

export interface UsageMetrics {
  aiActionsUsed: number,
  aiActionsLimit: number,
  integrationsUsed: number,
  integrationsLimit: number,
  periodStart: Date,
  periodEnd: Date,
  isAtLimit: boolean,
  warningThreshold: number
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name)
  private readonly stripe: Stripe

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private redis: RedisService,
    private websocket: WebsocketService,
  ) {
    const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is required')
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })
  }

  async createSubscription(userId: string, dto: CreateSubscriptionDto): Promise<Subscription> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        throw new NotFoundException('User not found')
      }

      // Create Stripe customer if not exists
      let stripeCustomerId = user.stripeCustomerId
      if (!stripeCustomerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          metadata: { userId },
        })
        stripeCustomerId = customer.id

        await this.prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId },
        })
      }

      // Get price ID based on tier and interval
      const priceId = this.getPriceId(dto.tier, dto.interval)

      // Create Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { userId },
      })

      // Create subscription in database
      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          tier: dto.tier,
          status: SubscriptionStatus.PENDING,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: priceId,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        },
      })

      this.logger.log(`Created subscription ${subscription.id} for user ${userId}`)

      return subscription
    } catch (error) {
      this.logger.error('Error creating subscription:', error)
      throw new BadRequestException('Failed to create subscription')
    }
  }

  async updateSubscription(userId: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { userId, status: SubscriptionStatus.ACTIVE },
      })

      if (!subscription) {
        throw new NotFoundException('Active subscription not found')
      }

      if (dto.tier && dto.tier !== subscription.tier) {
        // Update subscription tier in Stripe
        const newPriceId = this.getPriceId(dto.tier, dto.interval || 'monthly')

        await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: [
            {
              id: (await this.stripe.subscriptions.retrieve(subscription.stripeSubscriptionId))
                .items.data[0].id,
              price: newPriceId,
            },
          ],
          proration_behavior: 'create_prorations',
        })

        // Update in database
        const updatedSubscription = await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {,
            tier: dto.tier,
            stripePriceId: newPriceId,
          },
        })

        this.logger.log(`Updated subscription ${subscription.id} to tier ${dto.tier}`)

        return updatedSubscription
      }

      return subscription
    } catch (error) {
      this.logger.error('Error updating subscription:', error)
      throw new BadRequestException('Failed to update subscription')
    }
  }

  async cancelSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { userId, status: SubscriptionStatus.ACTIVE },
      })

      if (!subscription) {
        throw new NotFoundException('Active subscription not found')
      }

      // Cancel in Stripe
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })

      // Update in database
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.CANCELLED },
      })

      this.logger.log(`Cancelled subscription ${subscription.id} for user ${userId}`)

      return true
    } catch (error) {
      this.logger.error('Error cancelling subscription:', error)
      return false
    }
  }

  async getBillingInfo(userId: string): Promise<BillingInfo> {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      if (!subscription) {
        throw new NotFoundException('Subscription not found')
      }

      const user = await this.prisma.user.findUnique({ where: { id: userId } })
      if (!user?.stripeCustomerId) {
        throw new NotFoundException('Stripe customer not found')
      }

      // Get payment methods
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      })

      // Get billing history
      const invoices = await this.stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 10,
      })

      // Get upcoming invoice if active subscription
      let upcomingInvoice: Stripe.UpcomingInvoice | undefined
      if (subscription.status === SubscriptionStatus.ACTIVE) {
        try {
          upcomingInvoice = await this.stripe.invoices.retrieveUpcoming({
            customer: user.stripeCustomerId,
          })
        } catch {
          // No upcoming invoice
        }
      }

      // Get usage metrics
      const usage = await this.getUsageMetrics(userId)

      return {
        subscription,
        upcomingInvoice,
        paymentMethods: paymentMethods.data,
        billingHistory: invoices.data,
        usage: {,
          aiActions: usage.aiActionsUsed,
          aiActionsLimit: usage.aiActionsLimit,
          integrations: usage.integrationsUsed,
          integrationsLimit: usage.integrationsLimit,
        },
      }
    } catch (error) {
      this.logger.error('Error getting billing info:', error)
      throw new BadRequestException('Failed to get billing info')
    }
  }

  async getUsageMetrics(userId: string): Promise<UsageMetrics> {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { userId, status: SubscriptionStatus.ACTIVE },
      })

      if (!subscription) {
        return {
          aiActionsUsed: 0,
          aiActionsLimit: 0,
          integrationsUsed: 0,
          integrationsLimit: 0,
          periodStart: new Date(),
          periodEnd: new Date(),
          isAtLimit: true,
          warningThreshold: 0.8,
        }
      }

      const limits = this.getTierLimits(subscription.tier)

      // Get current usage from cache or database
      const cacheKey = `usage:${userId}:${this.getCurrentPeriodKey()}`
      const cachedUsage = await this.redis.getData(cacheKey)

      let aiActionsUsed = 0
      let integrationsUsed = 0

      if (cachedUsage) {
        aiActionsUsed = (cachedUsage as any).aiActions || 0
        integrationsUsed = (cachedUsage as any).integrations || 0
      }

      const isAtLimit = aiActionsUsed >= limits.aiActions || integrationsUsed >= limits.integrations

      return {
        aiActionsUsed,
        aiActionsLimit: limits.aiActions,
        integrationsUsed,
        integrationsLimit: limits.integrations,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        isAtLimit,
        warningThreshold: 0.8,
      }
    } catch (error) {
      this.logger.error('Error getting usage metrics:', error)
      throw new BadRequestException('Failed to get usage metrics')
    }
  }

  async trackUsage(userId: string, action: 'ai_action' | 'integration_use'): Promise<boolean> {
    try {
      const metrics = await this.getUsageMetrics(userId)

      if (action === 'ai_action' && metrics.aiActionsUsed >= metrics.aiActionsLimit) {
        return false
      }

      if (action === 'integration_use' && metrics.integrationsUsed >= metrics.integrationsLimit) {
        return false
      }

      // Increment usage
      const cacheKey = `usage:${userId}:${this.getCurrentPeriodKey()}`
      const currentUsage = (await this.redis.getData(cacheKey)) || { aiActions: 0, integrations: 0 }

      if (action === 'ai_action') {
        ;(currentUsage as any).aiActions = ((currentUsage as any).aiActions || 0) + 1
      } else {
        ;(currentUsage as any).integrations = ((currentUsage as any).integrations || 0) + 1
      }

      await this.redis.setData(cacheKey, currentUsage, 86400 * 31) // Cache for 31 days

      return true
    } catch (error) {
      this.logger.error('Error tracking usage:', error)
      return false
    }
  }

  private getPriceId(tier: SubscriptionTier, interval: 'monthly' | 'yearly'): string {
    const priceMap = {
      [SubscriptionTier.PRO]: {
        monthly: this.config.get('STRIPE_PRO_MONTHLY_PRICE_ID'),
        yearly: this.config.get('STRIPE_PRO_YEARLY_PRICE_ID'),
      },
      [SubscriptionTier.MAX]: {
        monthly: this.config.get('STRIPE_MAX_MONTHLY_PRICE_ID'),
        yearly: this.config.get('STRIPE_MAX_YEARLY_PRICE_ID'),
      },
      [SubscriptionTier.TEAMS]: {
        monthly: this.config.get('STRIPE_TEAMS_MONTHLY_PRICE_ID'),
        yearly: this.config.get('STRIPE_TEAMS_YEARLY_PRICE_ID'),
      },
    }

    const priceId = priceMap[tier]?.[interval]
    if (!priceId) {
      throw new BadRequestException(`Price ID not found for ${tier} ${interval}`)
    }

    return priceId
  }

  private getTierLimits(tier: SubscriptionTier) {
    const limits = {
      [SubscriptionTier.PRO]: { aiActions: 1000, integrations: 3 },
      [SubscriptionTier.MAX]: { aiActions: 3000, integrations: -1 }, // -1 = unlimited
      [SubscriptionTier.TEAMS]: { aiActions: 2000, integrations: -1 },
    }

    return limits[tier] || { aiActions: 0, integrations: 0 }
  }

  private getCurrentPeriodKey(): string {
    const now = new Date()
    return `${now.getFullYear()}-${now.getMonth() + 1}`
  }
}
