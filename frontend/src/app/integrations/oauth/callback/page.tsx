'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Check, X, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useOAuthFlow, getIntegrationDisplayName, getIntegrationIcon } from '@/lib/api'

function OAuthCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { completeOAuth } = useOAuthFlow()
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [provider, setProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const errorParam = searchParams.get('error')
        const providerParam = searchParams.get('provider')

        if (errorParam) {
          setStatus('error')
          setError(`OAuth error: ${errorParam}`)
          return
        }

        if (!code || !state) {
          setStatus('error')
          setError('Missing authorization code or state parameter')
          return
        }

        if (!providerParam) {
          setStatus('error')
          setError('Missing provider parameter')
          return
        }

        setProvider(providerParam)

        // Complete the OAuth flow
        const result = await completeOAuth(providerParam, code, state)
        
        if (result.status === 'active') {
          setStatus('success')
          // Redirect to integrations page after a delay
          setTimeout(() => {
            router.push('/integrations?connected=' + providerParam)
          }, 2000)
        } else {
          setStatus('error')
          setError(result.message || 'Failed to complete integration')
        }
      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      }
    }

    processOAuthCallback()
  }, [searchParams, completeOAuth, router])

  const handleRetry = () => {
    router.push('/integrations')
  }

  const handleContinue = () => {
    router.push('/integrations')
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">
              Please sign in to complete the integration setup.
            </p>
            <Button onClick={() => router.push('/signin')}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background matching other pages */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/40" />
        <div className="absolute -left-96 top-0 w-[1000px] h-[1000px] bg-gradient-to-r from-slate-300/15 via-gray-300/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -right-96 top-1/2 w-[800px] h-[800px] bg-gradient-to-l from-slate-400/15 via-gray-400/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '10s' }} />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md mx-auto">
          <Card className="liquid-glass-accent border-0">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full">
                {status === 'processing' && (
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                )}
                {status === 'success' && (
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                )}
                {status === 'error' && (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                )}
              </div>

              <CardTitle className="text-xl">
                {status === 'processing' && 'Connecting Integration...'}
                {status === 'success' && 'Integration Connected!'}
                {status === 'error' && 'Connection Failed'}
              </CardTitle>

              <CardDescription>
                {status === 'processing' && 'Please wait while we complete the setup'}
                {status === 'success' && provider && `${getIntegrationDisplayName(provider)} has been successfully connected`}
                {status === 'error' && 'There was a problem connecting your integration'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {provider && (
                <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{getIntegrationIcon(provider)}</span>
                  <span className="font-medium">{getIntegrationDisplayName(provider)}</span>
                </div>
              )}

              {status === 'processing' && (
                <div className="text-center">
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full animate-pulse w-3/4"></div>
                    </div>
                    <p className="text-sm text-gray-600">Securing connection...</p>
                  </div>
                </div>
              )}

              {status === 'success' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Your integration is now active and ready to help automate your workflow.
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        Redirecting to integrations page...
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleContinue} className="w-full">
                    Continue to Integrations
                  </Button>
                </div>
              )}

              {status === 'error' && (
                <div className="space-y-4">
                  {error && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-3">
                    <Button onClick={handleRetry} className="w-full">
                      Try Again
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/integrations')}
                      className="w-full"
                    >
                      Back to Integrations
                    </Button>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      Need help?{' '}
                      <a href="mailto:support@aurelius.ai" className="text-blue-600 hover:underline">
                        Contact Support
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {status === 'processing' && (
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    This may take a few moments. Please don't close this window.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  )
}