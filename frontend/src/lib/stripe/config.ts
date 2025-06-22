import { loadStripe, Stripe } from '@stripe/stripe-js'

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!STRIPE_PUBLISHABLE_KEY) {
  console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined. Stripe functionality will be limited.')
}

// Singleton Stripe instance
let stripePromise: Promise<Stripe | null> | null = null

export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise && STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise || Promise.resolve(null)
}

// Stripe configuration options
export const stripeOptions = {
  locale: 'en' as const,
  fonts: [
    {
      cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
    },
  ],
}

// Common Stripe styles for elements
export const stripeElementStyles = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      fontFamily: 'Inter, sans-serif',
      fontSmoothing: 'antialiased',
    },
    invalid: {
      color: '#9e2146',
    },
  },
}

// Stripe Payment Intent options
export const createPaymentIntentOptions = (amount: number, currency = 'usd') => ({
  amount: toStripeAmount(amount),
  currency,
  automatic_payment_methods: {
    enabled: true,
  },
})

// Stripe Setup Intent options for saving payment methods
export const createSetupIntentOptions = (customerId?: string) => ({
  customer: customerId,
  payment_method_types: ['card'],
  usage: 'off_session' as const,
})

// Price formatting utilities
export const formatPrice = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100)
}

export const formatSubscriptionPrice = (
  amount: number,
  interval: 'month' | 'year',
  currency = 'USD'
): string => {
  const formattedAmount = formatPrice(amount, currency)
  return `${formattedAmount}/${interval}`
}

// Subscription interval utilities
export const getIntervalLabel = (interval: string): string => {
  switch (interval) {
    case 'month':
      return 'Monthly'
    case 'year':
      return 'Yearly'
    case 'week':
      return 'Weekly'
    case 'day':
      return 'Daily'
    default:
      return interval
  }
}

// Payment method utilities
export const getCardBrand = (brand: string): string => {
  switch (brand.toLowerCase()) {
    case 'visa':
      return 'Visa'
    case 'mastercard':
      return 'Mastercard'
    case 'amex':
      return 'American Express'
    case 'discover':
      return 'Discover'
    case 'diners':
      return 'Diners Club'
    case 'jcb':
      return 'JCB'
    case 'unionpay':
      return 'UnionPay'
    default:
      return brand.charAt(0).toUpperCase() + brand.slice(1)
  }
}

export const maskCardNumber = (last4: string): string => {
  return `**** **** **** ${last4}`
}

// Error handling utilities
interface StripeError {
  message?: string
  code?: string
}

export const getStripeErrorMessage = (error: StripeError): string => {
  if (error?.message) {
    return error.message
  }
  
  switch (error?.code) {
    case 'card_declined':
      return 'Your card was declined. Please try a different payment method.'
    case 'insufficient_funds':
      return 'Your card has insufficient funds. Please try a different payment method.'
    case 'incorrect_cvc':
      return 'Your card\'s security code is incorrect.'
    case 'expired_card':
      return 'Your card has expired. Please try a different payment method.'
    case 'processing_error':
      return 'An error occurred while processing your payment. Please try again.'
    case 'incomplete_number':
      return 'Your card number is incomplete.'
    case 'incomplete_cvc':
      return 'Your card\'s security code is incomplete.'
    case 'incomplete_expiry':
      return 'Your card\'s expiration date is incomplete.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

// Amount conversion utilities
export const toStripeAmount = (dollarAmount: number): number => {
  return Math.round(dollarAmount * 100)
}

// Validate card information (basic client-side validation)
export const validateCardInfo = (cardElement: unknown): Promise<{ error?: { message: string } }> => {
  // This would typically use Stripe's card validation
  // cardElement would be a Stripe card element instance
  const element = cardElement as { complete?: boolean; error?: { message: string } }
  
  if (!element || !element.complete) {
    return Promise.resolve({ error: { message: 'Please complete your card information' } })
  }
  
  return Promise.resolve({})
}