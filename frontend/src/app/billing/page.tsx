'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { 
  CreditCard, 
  Download, 
  ExternalLink, 
  AlertCircle, 
  Check, 
  Settings,
  Zap,
  TrendingUp,
  Shield,
  Plus
} from 'lucide-react'
import { 
  useCurrentSubscription,
  useUsageSummary,
  useInvoices,
  usePaymentMethods,
  useBillingOperations,
  formatCurrency,
  formatSubscriptionStatus,
  formatSubscriptionTier,
  calculateUsagePercentage,
  getUsageColor,
  isUsageNearLimit,
  PRICING_PLANS
} from '@/lib/api'
import { SubscriptionTier } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function BillingPage() {
  const { data: session, status } = useSession()
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  // API hooks - called before any early returns
  const { subscription, isLoading: subscriptionLoading, error: subscriptionError } = useCurrentSubscription()
  const { usage, isLoading: usageLoading, error: usageError } = useUsageSummary()
  const { invoices, isLoading: invoicesLoading } = useInvoices({ limit: 10 })
  const { paymentMethods, isLoading: paymentMethodsLoading } = usePaymentMethods()
  const { createBillingPortalSession, isLoading: portalLoading } = useBillingOperations()

  // Redirect if not authenticated
  if (status === 'loading') {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
    </div>
  }

  if (status === 'unauthenticated') {
    redirect('/signin')
  }

  // Handle billing portal
  const handleBillingPortal = async () => {
    try {
      const response = await createBillingPortalSession(window.location.href)
      window.location.href = response.url
    } catch (error) {
      console.error('Failed to open billing portal:', error)
    }
  }

  // Handle plan upgrade/downgrade
  const handlePlanChange = (tier: SubscriptionTier) => {
    if (session?.user?.id) {
      setSelectedTier(tier)
      // Navigate to pricing with pre-selected tier and billing cycle
      const params = new URLSearchParams({
        tier,
        cycle: billingCycle,
        userId: session.user.id
      })
      window.location.href = `/pricing?${params.toString()}`
    }
  }

  // Handle billing cycle change
  const handleCycleChange = (cycle: 'monthly' | 'annual') => {
    setBillingCycle(cycle)
  }

  // Handle payment method management
  const handlePaymentMethods = () => {
    if (paymentMethods && paymentMethods.data && paymentMethods.data.length > 0) {
      handleBillingPortal()
    } else {
      // Navigate to add payment method flow
      window.location.href = '/billing/payment-methods'
    }
  }

  // Loading state
  if (subscriptionLoading || usageLoading) {
    return (
      <div className="min-h-screen bg-white relative overflow-hidden">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/40" />
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Loading skeleton */}
            <div className="liquid-glass-accent rounded-3xl p-8 animate-pulse">
              <div className="h-8 bg-gray-200/60 rounded mb-4 w-1/3"></div>
              <div className="h-4 bg-gray-200/60 rounded w-2/3"></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="liquid-glass-accent rounded-3xl p-6 animate-pulse">
                  <div className="h-6 bg-gray-200/60 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200/60 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200/60 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (subscriptionError || usageError) {
    return (
      <div className="min-h-screen bg-white relative overflow-hidden">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/40" />
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load billing information. Please try again or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const currentUsage = usage ? calculateUsagePercentage(usage.totalAiRequests, 1000) : 0
  const usageColor = getUsageColor(currentUsage)
  const isNearLimit = usage ? isUsageNearLimit(usage.totalAiRequests, 1000) : false

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Enhanced Apple-inspired background matching dashboard */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white via-gray-50/30 to-slate-50/40" />
        <div className="absolute -left-96 top-0 w-[1000px] h-[1000px] bg-gradient-to-r from-slate-300/15 via-gray-300/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -right-96 top-1/2 w-[800px] h-[800px] bg-gradient-to-l from-slate-400/15 via-gray-400/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '10s' }} />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="liquid-glass-accent rounded-2xl sm:rounded-3xl p-6 sm:p-8">
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                  Billing & Usage
                </h1>
                <p className="text-base sm:text-lg text-gray-600 mt-2 leading-relaxed max-w-2xl">
                  Manage your subscription, view usage analytics, and update payment methods.
                </p>
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/25 ml-4">
                <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Usage Alert */}
          {isNearLimit && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                You're approaching your monthly usage limit. Consider upgrading your plan to avoid service interruption.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Current Subscription */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 liquid-glass-accent border-0">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          Current Subscription
                        </CardTitle>
                        <CardDescription>
                          Your active plan and billing information
                        </CardDescription>
                      </div>
                      {subscription && (
                        <Badge className={formatSubscriptionStatus(subscription.status).color}>
                          {formatSubscriptionStatus(subscription.status).label}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {subscription ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {formatSubscriptionTier(subscription.tier).label} Plan
                            </h3>
                            <p className="text-sm text-gray-600">
                              {formatSubscriptionTier(subscription.tier).description}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">
                              {formatCurrency(PRICING_PLANS[subscription.tier].price)}
                            </p>
                            <p className="text-sm text-gray-600">per month</p>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Current period starts</p>
                            <p className="font-medium">
                              {subscription.currentPeriodStart 
                                ? new Date(subscription.currentPeriodStart).toLocaleDateString()
                                : 'N/A'
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Next billing date</p>
                            <p className="font-medium">
                              {subscription.currentPeriodEnd 
                                ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                                : 'N/A'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={handleBillingPortal}
                          disabled={portalLoading}
                          className="w-full mt-4"
                          variant="outline"
                        >
                          {portalLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                          ) : (
                            <Settings className="w-4 h-4 mr-2" />
                          )}
                          Manage Subscription
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h3>
                        <p className="text-gray-600 mb-4">Choose a plan to get started with Aurelius</p>
                        <Button 
                          onClick={() => window.location.href = '/pricing'}
                          className="w-full"
                        >
                          View Plans
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Usage Summary */}
                <Card className="liquid-glass-accent border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Usage This Month
                    </CardTitle>
                    <CardDescription>
                      AI actions and consumption metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {usage ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>AI Actions</span>
                            <span className="font-medium">
                              {usage.totalAiRequests} / 1,000
                            </span>
                          </div>
                          <Progress 
                            value={currentUsage} 
                            className="h-2"
                          />
                          <p className={`text-xs ${usageColor.split(' ')[0]}`}>
                            {100 - currentUsage}% remaining this period
                          </p>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Emails processed</span>
                            <span className="font-medium">{usage.totalEmailsProcessed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tasks automated</span>
                            <span className="font-medium">{usage.totalTasksAutomated}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Period ends</span>
                            <span className="font-medium">
                              {new Date(usage.period.end).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <Zap className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No usage data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Plan Comparison */}
              <Card className="liquid-glass-accent border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Available Plans</CardTitle>
                      <CardDescription>
                        Upgrade or downgrade your subscription at any time
                        {selectedTier && ` • Selected: ${selectedTier}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => handleCycleChange('monthly')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          billingCycle === 'monthly' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => handleCycleChange('annual')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          billingCycle === 'annual' 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Annual
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(PRICING_PLANS).map(([tier, plan]) => {
                      const isCurrentPlan = subscription?.tier === tier as SubscriptionTier
                      
                      return (
                        <div key={tier} className={`
                          relative p-6 rounded-xl border-2 transition-all
                          ${isCurrentPlan 
                            ? 'border-black bg-gray-50' 
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}>
                          {isCurrentPlan && (
                            <Badge className="absolute -top-2 left-4 bg-black text-white">
                              Current Plan
                            </Badge>
                          )}
                          
                          <div className="text-center">
                            <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                            <div className="mb-4">
                              <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                              <span className="text-gray-600">/month</span>
                            </div>
                            
                            <ul className="space-y-2 mb-6 text-sm">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                            
                            {!isCurrentPlan && (
                              <Button 
                                className="w-full"
                                variant={tier === 'MAX' ? 'default' : 'outline'}
                                onClick={() => handlePlanChange(tier as SubscriptionTier)}
                              >
                                {subscription ? 'Switch Plan' : 'Get Started'}
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usage" className="space-y-6">
              {/* Usage details will be implemented in the next iteration */}
              <Card className="liquid-glass-accent border-0">
                <CardHeader>
                  <CardTitle>Detailed Usage Analytics</CardTitle>
                  <CardDescription>
                    Track your AI usage patterns and optimize your workflow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Detailed Analytics Coming Soon
                    </h3>
                    <p className="text-gray-600">
                      We're building comprehensive usage analytics to help you understand your AI consumption patterns.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-6">
              <Card className="liquid-glass-accent border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Billing History
                  </CardTitle>
                  <CardDescription>
                    Download invoices and view payment history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </div>
                      ))}
                    </div>
                  ) : invoices?.data && invoices.data.length > 0 ? (
                    <div className="space-y-4">
                      {invoices.data.map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="font-medium">Invoice #{invoice.number}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(invoice.created).toLocaleDateString()}
                              {invoice.dueDate && ` • Due ${new Date(invoice.dueDate).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                              <Badge variant={invoice.status === 'paid' ? 'secondary' : 'destructive'}>
                                {invoice.status}
                              </Badge>
                            </div>
                            {invoice.hostedInvoiceUrl && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Download className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoices Yet</h3>
                      <p className="text-gray-600">
                        Your billing history will appear here once you have an active subscription.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="space-y-6">
              <Card className="liquid-glass-accent border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription>
                    Manage your payment methods and billing information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {paymentMethodsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded"></div>
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-24"></div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </div>
                      ))}
                    </div>
                  ) : paymentMethods && paymentMethods.data && paymentMethods.data.length > 0 ? (
                    <div className="space-y-4">
                      {paymentMethods.data.map((method) => (
                        <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <CreditCard className="w-8 h-8 text-gray-600" />
                            <div>
                              <p className="font-medium">**** **** **** {method.card?.last4}</p>
                              <p className="text-sm text-gray-600">{method.card?.brand} • Expires {method.card?.expMonth}/{method.card?.expYear}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {method.isDefault && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                            <Button variant="ghost" size="sm" onClick={handlePaymentMethods}>
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        onClick={handlePaymentMethods}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Payment Method
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Payment Methods
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Add a payment method to manage your subscription billing.
                      </p>
                      <Button onClick={handlePaymentMethods}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Payment Method
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}