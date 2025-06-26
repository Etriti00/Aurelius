import { useState } from 'react'
import useSWR from 'swr'
import { apiClient } from './client'
import {
  Subscription,
  SubscriptionTier,
  SubscriptionStatus
} from './types'
import type { UsageMetrics, StandardApiResponse, ApiError } from './types'

// Billing-specific types that match backend DTOs
export interface CreateCheckoutDto {
  priceId: string
  successUrl?: string
  cancelUrl?: string
}

export interface CreateSubscriptionDto {
  priceId: string
  paymentMethodId?: string
}

export interface UpdateSubscriptionDto {
  priceId?: string
  cancelAtPeriodEnd?: boolean
}

export interface CancelSubscriptionDto {
  immediately?: boolean
  reason?: string
}

export interface CreateBillingPortalDto {
  returnUrl: string
}

export interface RecordUsageDto {
  action: string
  quantity: number
  timestamp?: Date
  metadata?: Record<string, unknown>
}

export interface AddPaymentMethodDto {
  paymentMethodId: string
  setAsDefault?: boolean
}

export interface ListInvoicesDto {
  limit?: number
  startingAfter?: string
  endingBefore?: string
}

export interface CheckoutResponseDto {
  sessionId: string
  url: string
}

export interface SubscriptionResponseDto {
  id: string
  userId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  stripeSubscriptionId?: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  aiActionsUsed: number
  createdAt: Date
  updatedAt: Date
  items: Array<{
    id: string
    priceId: string
    quantity: number
  }>
}

export interface BillingPortalResponseDto {
  id: string
  url: string
  returnUrl: string
  created: Date
}

export interface UsageResponseDto {
  id: string
  userId: string
  action: string
  quantity: number
  timestamp: Date
  billingPeriod: {
    start: Date
    end: Date
  }
}

export interface UsageSummaryDto {
  userId: string
  period: {
    start: Date
    end: Date
  }
  totalAiRequests: number
  totalEmailsProcessed: number
  totalTasksAutomated: number
  usageByAction: Record<string, number>
  dailyUsage: Array<{ date: Date; count: number }>
  percentageUsed: number
  remaining: number
}

export interface InvoiceDto {
  id: string
  number: string
  status: string
  amount: number
  currency: string
  created: Date
  dueDate?: Date
  paidAt?: Date
  hostedInvoiceUrl?: string
  invoicePdf?: string
}

export interface InvoiceListResponseDto {
  data: InvoiceDto[]
  hasMore: boolean
  totalCount: number
}

export interface PaymentMethodDto {
  id: string
  type: string
  card?: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  isDefault: boolean
  created: Date
}

export interface ListPaymentMethodsResponseDto {
  data: PaymentMethodDto[]
  defaultPaymentMethodId?: string
}

export interface BillingUsageDto {
  subscription: Subscription
  currentPeriod: {
    start: Date
    end: Date
  }
  usage: {
    aiActions: number
    aiActionsLimit: number
    totalCost: number
  }
}

// API endpoints
const BILLING_ENDPOINT = '/billing'

// Enhanced API functions matching backend
export const billingApi = {
  // Checkout and subscription creation
  createCheckoutSession: (data: CreateCheckoutDto) =>
    apiClient.post<CheckoutResponseDto>(`${BILLING_ENDPOINT}/checkout`, data),

  createSubscription: (data: CreateSubscriptionDto) =>
    apiClient.post<SubscriptionResponseDto>(`${BILLING_ENDPOINT}/subscription`, data),

  // Subscription management
  getCurrentSubscription: () =>
    apiClient.get<SubscriptionResponseDto>(`${BILLING_ENDPOINT}/subscription`),

  updateSubscription: (data: UpdateSubscriptionDto) =>
    apiClient.patch<SubscriptionResponseDto>(`${BILLING_ENDPOINT}/subscription`, data),

  cancelSubscription: (data: CancelSubscriptionDto) =>
    apiClient.delete<SubscriptionResponseDto, CancelSubscriptionDto>(`${BILLING_ENDPOINT}/subscription`, data),

  // Billing portal
  createBillingPortalSession: (data: CreateBillingPortalDto) =>
    apiClient.post<BillingPortalResponseDto>(`${BILLING_ENDPOINT}/portal`, data),

  // Usage tracking
  recordUsage: (data: RecordUsageDto) =>
    apiClient.post<UsageResponseDto>(`${BILLING_ENDPOINT}/usage`, data),

  getUsageSummary: () =>
    apiClient.get<UsageSummaryDto>(`${BILLING_ENDPOINT}/usage/summary`),

  getUsage: () =>
    apiClient.get<BillingUsageDto>(`${BILLING_ENDPOINT}/usage`),

  // Invoices
  listInvoices: (query: ListInvoicesDto = {}) =>
    apiClient.get<InvoiceListResponseDto>(`${BILLING_ENDPOINT}/invoices`, { params: query }),

  // Payment methods
  listPaymentMethods: () =>
    apiClient.get<ListPaymentMethodsResponseDto>(`${BILLING_ENDPOINT}/payment-methods`),

  addPaymentMethod: (data: AddPaymentMethodDto) =>
    apiClient.post<PaymentMethodDto>(`${BILLING_ENDPOINT}/payment-methods`, data),

  removePaymentMethod: (paymentMethodId: string) =>
    apiClient.delete<void>(`${BILLING_ENDPOINT}/payment-methods/${paymentMethodId}`),

  setDefaultPaymentMethod: (paymentMethodId: string) =>
    apiClient.patch<PaymentMethodDto>(`${BILLING_ENDPOINT}/payment-methods/${paymentMethodId}/default`, {}),
}

// Enhanced SWR Hooks
export const useCurrentSubscription = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${BILLING_ENDPOINT}/subscription`,
    billingApi.getCurrentSubscription,
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
      errorRetryCount: 3,
    }
  )

  return {
    subscription: data,
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useUsageSummary = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${BILLING_ENDPOINT}/usage/summary`,
    billingApi.getUsageSummary,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
      errorRetryCount: 3,
    }
  )

  return {
    usage: data,
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useBillingUsage = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${BILLING_ENDPOINT}/usage`,
    billingApi.getUsage,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
      errorRetryCount: 3,
    }
  )

  return {
    usage: data,
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useInvoices = (query: ListInvoicesDto = {}) => {
  const { data, error, isLoading, mutate } = useSWR(
    [`${BILLING_ENDPOINT}/invoices`, query],
    () => billingApi.listInvoices(query),
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
      errorRetryCount: 3,
    }
  )

  return {
    invoices: data,
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

// Error handling utilities for billing operations
export const handleBillingError = (error: ApiError): string => {
  return error.message || 'An error occurred with billing operations'
}

export const isUsageMetricsValid = (usage: UsageMetrics): boolean => {
  return usage.aiActionsUsed >= 0 && usage.aiActionsLimit >= 0
}

export const transformBillingResponse = <T>(response: StandardApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(response.message ?? 'Billing operation failed')
  }
  return response.data
}

export const usePaymentMethods = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${BILLING_ENDPOINT}/payment-methods`,
    billingApi.listPaymentMethods,
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
      errorRetryCount: 3,
    }
  )

  return {
    paymentMethods: data,
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

// Enhanced Billing Processing Hooks
export const useBillingOperations = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCheckoutSession = async (data: CreateCheckoutDto) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await billingApi.createCheckoutSession(data)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const createSubscription = async (data: CreateSubscriptionDto) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await billingApi.createSubscription(data)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create subscription'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const updateSubscription = async (data: UpdateSubscriptionDto) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await billingApi.updateSubscription(data)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update subscription'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const cancelSubscription = async (data: CancelSubscriptionDto) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await billingApi.cancelSubscription(data)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const createBillingPortalSession = async (returnUrl: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await billingApi.createBillingPortalSession({ returnUrl })
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create billing portal session'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const addPaymentMethod = async (data: AddPaymentMethodDto) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await billingApi.addPaymentMethod(data)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add payment method'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const removePaymentMethod = async (paymentMethodId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await billingApi.removePaymentMethod(paymentMethodId)
      setIsLoading(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove payment method'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const recordUsage = async (data: RecordUsageDto) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await billingApi.recordUsage(data)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record usage'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  return {
    createCheckoutSession,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    createBillingPortalSession,
    addPaymentMethod,
    removePaymentMethod,
    recordUsage,
    isLoading,
    error,
  }
}

// Helper functions for billing operations
export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export const formatSubscriptionStatus = (status: SubscriptionStatus): { label: string; color: string } => {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return { label: 'Active', color: 'text-green-600 bg-green-50 border-green-200' }
    case SubscriptionStatus.CANCELED:
      return { label: 'Canceled', color: 'text-red-600 bg-red-50 border-red-200' }
    case SubscriptionStatus.PAST_DUE:
      return { label: 'Past Due', color: 'text-orange-600 bg-orange-50 border-orange-200' }
    case SubscriptionStatus.TRIALING:
      return { label: 'Trial', color: 'text-blue-600 bg-blue-50 border-blue-200' }
    case SubscriptionStatus.INCOMPLETE:
      return { label: 'Incomplete', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' }
    default:
      return { label: 'Unknown', color: 'text-gray-600 bg-gray-50 border-gray-200' }
  }
}

export const formatSubscriptionTier = (tier: SubscriptionTier): { label: string; description: string } => {
  switch (tier) {
    case SubscriptionTier.PRO:
      return { label: 'Pro', description: '1,000 AI actions/month' }
    case SubscriptionTier.MAX:
      return { label: 'Max', description: '3,000 AI actions/month' }
    case SubscriptionTier.TEAMS:
      return { label: 'Teams', description: '2,000 AI actions/user/month' }
    default:
      return { label: 'Unknown', description: '' }
  }
}

export const calculateUsagePercentage = (used: number, limit: number): number => {
  if (limit === 0) return 0
  return Math.round((used / limit) * 100)
}

export const getUsageColor = (percentage: number): string => {
  if (percentage >= 90) return 'text-red-600 bg-red-100 border-red-200'
  if (percentage >= 80) return 'text-orange-600 bg-orange-100 border-orange-200'
  if (percentage >= 60) return 'text-yellow-600 bg-yellow-100 border-yellow-200'
  return 'text-green-600 bg-green-100 border-green-200'
}

export const isUsageNearLimit = (used: number, limit: number): boolean => {
  const percentage = calculateUsagePercentage(used, limit)
  return percentage >= 80
}

export const isUsageAtLimit = (used: number, limit: number): boolean => {
  return used >= limit
}

export const getNextBillingDate = (currentPeriodEnd: Date): string => {
  return new Date(currentPeriodEnd).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const getDaysUntilBilling = (currentPeriodEnd: Date): number => {
  const now = new Date()
  const endDate = new Date(currentPeriodEnd)
  const diffTime = endDate.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Pricing configuration matching backend tiers
export const PRICING_PLANS = {
  [SubscriptionTier.PRO]: {
    name: 'Pro',
    price: 50,
    annualPrice: 45,
    actionLimit: 1000,
    integrationLimit: 3,
    features: [
      '1,000 AI actions/month',
      '1 workspace + 3 integrations',
      'Basic automation',
      'Perfect Memory AI',
      'Email & chat support'
    ]
  },
  [SubscriptionTier.MAX]: {
    name: 'Max',
    price: 100,
    annualPrice: 90,
    actionLimit: 3000,
    integrationLimit: -1, // unlimited
    features: [
      '3,000 AI actions/month',
      'Unlimited integrations',
      'Cross-platform workflows',
      'Advanced AI insights',
      'Custom automations',
      'Priority support'
    ]
  },
  [SubscriptionTier.TEAMS]: {
    name: 'Teams',
    price: 70,
    annualPrice: 63,
    actionLimit: 2000,
    integrationLimit: -1, // unlimited
    features: [
      '2,000 AI actions/user',
      'Shared workspace access',
      'Admin controls & analytics',
      'Team performance insights',
      '24/7 priority support',
      'Max security features'
    ]
  }
}