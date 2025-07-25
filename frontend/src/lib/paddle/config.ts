import { initializePaddle, Paddle } from '@paddle/paddle-js';

// Paddle configuration
const PADDLE_ENVIRONMENT = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production';
const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

if (!PADDLE_CLIENT_TOKEN) {
  console.warn('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not defined. Paddle functionality will be limited.');
}

if (!PADDLE_ENVIRONMENT) {
  console.warn('NEXT_PUBLIC_PADDLE_ENVIRONMENT is not defined. Defaulting to sandbox.');
}

// Singleton Paddle instance
let paddlePromise: Promise<Paddle | undefined> | null = null;

export const getPaddle = (): Promise<Paddle | undefined> => {
  if (!paddlePromise && PADDLE_CLIENT_TOKEN) {
    paddlePromise = initializePaddle({
      environment: PADDLE_ENVIRONMENT || 'sandbox',
      token: PADDLE_CLIENT_TOKEN,
    });
  }
  return paddlePromise || Promise.resolve(undefined);
};

// Paddle configuration for pricing
export const paddleConfig = {
  environment: PADDLE_ENVIRONMENT || 'sandbox',
  token: PADDLE_CLIENT_TOKEN,
  priceIds: {
    PRO_MONTHLY: process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID!,
    PRO_ANNUAL: process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID!,
    MAX_MONTHLY: process.env.NEXT_PUBLIC_PADDLE_MAX_MONTHLY_PRICE_ID!,
    MAX_ANNUAL: process.env.NEXT_PUBLIC_PADDLE_MAX_ANNUAL_PRICE_ID!,
    TEAMS_MONTHLY: process.env.NEXT_PUBLIC_PADDLE_TEAMS_MONTHLY_PRICE_ID!,
    TEAMS_ANNUAL: process.env.NEXT_PUBLIC_PADDLE_TEAMS_ANNUAL_PRICE_ID!,
  },
  tiers: {
    PRO: {
      name: 'Pro',
      monthlyPrice: 50,
      annualPrice: 45,
      actionLimit: 1000,
      integrationLimit: 3,
      features: [
        '1,000 AI actions/month',
        '1 workspace + 3 integrations',
        'Basic automation',
        'Perfect Memory AI',
        'Email & chat support',
      ],
    },
    MAX: {
      name: 'Max',
      monthlyPrice: 100,
      annualPrice: 90,
      actionLimit: 3000,
      integrationLimit: -1, // Unlimited
      features: [
        '3,000 AI actions/month',
        'Unlimited integrations',
        'Cross-platform workflows',
        'Advanced AI insights',
        'Custom automations',
        'Priority support',
      ],
    },
    TEAMS: {
      name: 'Teams',
      monthlyPrice: 70,
      annualPrice: 63,
      actionLimit: 2000,
      integrationLimit: -1, // Unlimited
      features: [
        '2,000 AI actions/user',
        'Shared workspace access',
        'Admin controls & analytics',
        'Team performance insights',
        '24/7 priority support',
        'Enterprise security',
      ],
    },
  },
};

// Checkout configuration
export interface PaddleCheckoutOptions {
  items: Array<{
    priceId: string;
    quantity: number;
  }>;
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  customData?: Record<string, any>;
  successUrl?: string;
  discountCodes?: string[];
}

export const openPaddleCheckout = async (options: PaddleCheckoutOptions): Promise<void> => {
  const paddle = await getPaddle();
  
  if (!paddle) {
    throw new Error('Paddle is not initialized');
  }

  // Build customer object with required fields
  const customer = options.customer?.email ? {
    email: options.customer.email,
    ...(options.customer.firstName && { firstName: options.customer.firstName }),
    ...(options.customer.lastName && { lastName: options.customer.lastName }),
  } : undefined;

  try {
    await paddle.Checkout.open({
      items: options.items,
      customer,
      customData: options.customData,
    });
    
    console.log('Checkout opened successfully');
    if (options.successUrl) {
      // Note: Paddle handles success/failure through webhooks
      // We may redirect after checkout completion via webhook processing
      console.log('Success URL configured:', options.successUrl);
    }
  } catch (error) {
    console.error('Checkout error:', error);
    throw new Error(`Checkout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Price formatting utilities (compatible with existing Stripe utilities)
export const formatPrice = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatSubscriptionPrice = (
  amount: number,
  interval: 'month' | 'year',
  currency = 'USD'
): string => {
  const formattedAmount = formatPrice(amount, currency);
  return `${formattedAmount}/${interval}`;
};

// Subscription interval utilities
export const getIntervalLabel = (interval: string): string => {
  switch (interval) {
    case 'month':
      return 'Monthly';
    case 'year':
      return 'Yearly';
    case 'week':
      return 'Weekly';
    case 'day':
      return 'Daily';
    default:
      return interval;
  }
};

// Payment method utilities (adapted for Paddle)
export const getCardBrand = (brand: string): string => {
  switch (brand.toLowerCase()) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
      return 'American Express';
    case 'discover':
      return 'Discover';
    case 'diners':
      return 'Diners Club';
    case 'jcb':
      return 'JCB';
    case 'unionpay':
      return 'UnionPay';
    default:
      return brand.charAt(0).toUpperCase() + brand.slice(1);
  }
};

export const maskCardNumber = (last4: string): string => {
  return `**** **** **** ${last4}`;
};

// Error handling utilities for Paddle
interface PaddleError {
  message?: string;
  code?: string;
  detail?: string;
}

export const getPaddleErrorMessage = (error: PaddleError): string => {
  if (error?.message) {
    return error.message;
  }

  if (error?.detail) {
    return error.detail;
  }

  switch (error?.code) {
    case 'payment_declined':
      return 'Your payment was declined. Please try a different payment method.';
    case 'insufficient_funds':
      return 'Your payment method has insufficient funds. Please try a different payment method.';
    case 'card_expired':
      return 'Your card has expired. Please try a different payment method.';
    case 'processing_error':
      return 'An error occurred while processing your payment. Please try again.';
    case 'invalid_card':
      return 'Your card information is invalid. Please check and try again.';
    case 'authentication_failed':
      return 'Payment authentication failed. Please try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

// Paddle-specific utilities
export const getPriceIdForTier = (tier: 'PRO' | 'MAX' | 'TEAMS', interval: 'monthly' | 'annual'): string => {
  const tierKey = tier.toUpperCase() as keyof typeof paddleConfig.priceIds;
  const intervalKey = `${tierKey}_${interval.toUpperCase()}` as keyof typeof paddleConfig.priceIds;
  return paddleConfig.priceIds[intervalKey];
};

export const getTierInfo = (tier: 'PRO' | 'MAX' | 'TEAMS') => {
  return paddleConfig.tiers[tier];
};

export const calculateAnnualSavings = (tier: 'PRO' | 'MAX' | 'TEAMS'): number => {
  const tierInfo = getTierInfo(tier);
  const monthlyTotal = tierInfo.monthlyPrice * 12;
  const annualTotal = tierInfo.annualPrice * 12;
  return monthlyTotal - annualTotal;
};

export const getAnnualSavingsPercentage = (tier: 'PRO' | 'MAX' | 'TEAMS'): number => {
  const tierInfo = getTierInfo(tier);
  const monthlyTotal = tierInfo.monthlyPrice * 12;
  const annualTotal = tierInfo.annualPrice * 12;
  return Math.round(((monthlyTotal - annualTotal) / monthlyTotal) * 100);
};