'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, ArrowLeft, CreditCard, HelpCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function BillingCancelledPage() {
  const router = useRouter()

  const handleReturnToPricing = () => {
    router.push('/pricing')
  }

  const handleReturnToDashboard = () => {
    router.push('/dashboard')
  }

  const handleContactSupport = () => {
    // This could open a support modal or redirect to support page
    window.open('mailto:support@aurelius.ai?subject=Payment Assistance Needed', '_blank')
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Enhanced Apple-inspired background with warmer tones */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-orange-50/40" />
        <div className="absolute -left-96 top-0 w-[1000px] h-[1000px] bg-gradient-to-r from-amber-300/15 via-orange-300/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -right-96 top-1/2 w-[800px] h-[800px] bg-gradient-to-l from-orange-400/15 via-amber-400/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '10s' }} />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            {/* Cancelled Icon */}
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-orange-600" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Payment Cancelled
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              No charges were made to your account. You can try again anytime or explore our free features.
            </p>
          </div>

          {/* Main Card */}
          <Card className="liquid-glass-accent border-0 mb-8">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl">Payment Process Interrupted</CardTitle>
              <CardDescription>
                Don't worry - no payment was processed and your account remains unchanged
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-orange-900 mb-1">What happened?</h3>
                    <p className="text-sm text-orange-800">
                      The payment process was cancelled before completion. This could be due to:
                    </p>
                    <ul className="text-sm text-orange-800 mt-2 space-y-1 list-disc list-inside">
                      <li>You clicked the back button or closed the payment window</li>
                      <li>There was an issue with your payment method</li>
                      <li>You decided to review the plan details first</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">What would you like to do next?</h3>
                
                <div className="grid gap-3">
                  <Button 
                    onClick={handleReturnToPricing}
                    className="w-full justify-start h-auto p-4"
                    variant="outline"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Try Payment Again</div>
                        <div className="text-sm text-gray-600">Return to pricing and complete your subscription</div>
                      </div>
                    </div>
                  </Button>
                  
                  <Button 
                    onClick={handleReturnToDashboard}
                    className="w-full justify-start h-auto p-4"
                    variant="outline"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Continue with Free Features</div>
                        <div className="text-sm text-gray-600">Explore Aurelius with limited functionality</div>
                      </div>
                    </div>
                  </Button>
                  
                  <Button 
                    onClick={handleContactSupport}
                    className="w-full justify-start h-auto p-4"
                    variant="outline"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Get Help</div>
                        <div className="text-sm text-gray-600">Contact support for payment assistance</div>
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Why Choose Aurelius */}
          <Card className="liquid-glass-accent border-0 mb-8">
            <CardHeader>
              <CardTitle>Why Choose Aurelius?</CardTitle>
              <CardDescription>
                Join thousands of professionals who've transformed their productivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-lg">🤖</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">AI That Actually Helps</h3>
                    <p className="text-sm text-gray-600">
                      Unlike generic AI tools, Aurelius learns your workflow and proactively helps you get things done.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-lg">⚡</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Save 5+ Hours Weekly</h3>
                    <p className="text-sm text-gray-600">
                      Users report saving significant time on email management, scheduling, and task organization.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-600 text-lg">🔒</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Enterprise-Grade Security</h3>
                    <p className="text-sm text-gray-600">
                      Your data is encrypted and secure. We never share your information with third parties.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleReturnToPricing}
              className="flex-1 h-12"
              size="lg"
            >
              Try Again
            </Button>
            <Button 
              onClick={handleReturnToDashboard}
              variant="outline"
              className="flex-1 h-12"
              size="lg"
            >
              Continue Free
            </Button>
          </div>

          {/* Support Note */}
          <div className="text-center mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Having trouble with payment? We're here to help.{' '}
              <button 
                onClick={handleContactSupport}
                className="text-blue-600 hover:underline font-medium"
              >
                Contact our support team
              </button>
              {' '}for personalized assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}