'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Check, ArrowRight, CreditCard, Zap, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentSubscription } from '@/lib/api'

function BillingSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  const { subscription, mutate: refreshSubscription } = useCurrentSubscription()

  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id')
    if (sessionIdParam) {
      setSessionId(sessionIdParam)
      // Refresh subscription data after successful payment
      setTimeout(() => {
        refreshSubscription()
      }, 2000)
    }
  }, [searchParams, refreshSubscription])

  const handleContinue = () => {
    router.push('/dashboard')
  }

  const handleViewBilling = () => {
    router.push('/billing')
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Enhanced Apple-inspired background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50/40" />
        <div className="absolute -left-96 top-0 w-[1000px] h-[1000px] bg-gradient-to-r from-green-300/15 via-emerald-300/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -right-96 top-1/2 w-[800px] h-[800px] bg-gradient-to-l from-emerald-400/15 via-green-400/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '10s' }} />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            {/* Success Animation */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Payment Successful!
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Welcome to Aurelius! Your subscription is now active and ready to transform your productivity.
            </p>
          </div>

          {/* Success Details Card */}
          <Card className="liquid-glass-accent border-0 mb-8">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Subscription Activated</CardTitle>
              <CardDescription>
                Your Aurelius AI assistant is now ready to help you achieve more
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {sessionId && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Payment confirmation</p>
                  <p className="font-mono text-sm text-gray-900">{sessionId}</p>
                </div>
              )}

              {subscription && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-semibold">{subscription.tier} Subscription</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                  {subscription.currentPeriodEnd && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Next billing</span>
                      <span className="font-medium">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* What's Next Section */}
          <Card className="liquid-glass-accent border-0 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                What's Next?
              </CardTitle>
              <CardDescription>
                Get the most out of your Aurelius subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Connect Your Accounts</h3>
                    <p className="text-sm text-gray-600">
                      Link your Gmail, Calendar, and other productivity tools to unlock AI automation.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Start with AI Commands</h3>
                    <p className="text-sm text-gray-600">
                      Try the floating brain button to give your AI assistant tasks and see it work.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Explore Automation</h3>
                    <p className="text-sm text-gray-600">
                      Let Aurelius learn your patterns and start suggesting proactive actions.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Highlights */}
          <Card className="liquid-glass-accent border-0 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Your Plan Includes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">AI-powered task automation</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Email analysis & drafting</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Calendar optimization</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Perfect Memory AI</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Integration ecosystem</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Priority support</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleContinue}
              className="flex-1 h-12"
              size="lg"
            >
              Start Using Aurelius
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              onClick={handleViewBilling}
              variant="outline"
              className="flex-1 h-12"
              size="lg"
            >
              View Billing Details
            </Button>
          </div>

          {/* Support Note */}
          <div className="text-center mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Need help getting started{session?.user?.name ? `, ${session.user.name}` : ''}? Our support team is here to help.{' '}
              <a href="mailto:support@aurelius.ai" className="text-blue-600 hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  )
}