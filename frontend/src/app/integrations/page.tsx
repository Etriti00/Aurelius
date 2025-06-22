'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { 
  Settings, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  ExternalLink,
  Zap,
  Shield,
  Clock,
  Activity,
  Link,
  Unlink
} from 'lucide-react'
import { 
  useUserIntegrations,
  useAvailableIntegrations,
  useIntegrationOperations,
  useOAuthFlow,
  formatIntegrationStatus,
  getIntegrationIcon,
  getIntegrationDisplayName,
  getCategoryDisplayName,
  formatLastSync,
  isIntegrationHealthy,
  getIntegrationHealthStatus,
  AVAILABLE_INTEGRATIONS
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function IntegrationsPage() {
  const { data: session, status } = useSession()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showConnectionStatus, setShowConnectionStatus] = useState(false)
  const [connectionErrors, setConnectionErrors] = useState<Record<string, string>>({})

  // API hooks - called before any early returns
  const { integrations, isLoading: integrationsLoading, error: integrationsError, mutate: refreshIntegrations } = useUserIntegrations()
  const { availableIntegrations, isLoading: availableLoading } = useAvailableIntegrations()
  const { 
    connectIntegration, 
    disconnectIntegration, 
    syncIntegration, 
    testConnection,
    isLoading: operationLoading 
  } = useIntegrationOperations()
  const { initiateOAuth, isInProgress: oauthInProgress } = useOAuthFlow()

  // Redirect if not authenticated
  if (status === 'loading') {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
    </div>
  }

  if (status === 'unauthenticated') {
    redirect('/signin')
  }

  // Handle integration actions
  const handleConnect = async (provider: string) => {
    if (session?.user?.id && connectIntegration) {
      try {
        if (provider === 'google' || provider === 'microsoft') {
          await initiateOAuth(provider)
        } else {
          await connectIntegration(provider, { provider })
        }
      } catch (error) {
        setConnectionErrors({ ...connectionErrors, [provider]: String(error) })
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to initiate OAuth:', error)
        }
        // Show user-friendly error message in production
        setTimeout(() => {
          setConnectionErrors(prev => {
            const updated = { ...prev }
            delete updated[provider]
            return updated
          })
        }, 5000)
      }
    }
  }

  const handleDisconnect = async (provider: string) => {
    try {
      await disconnectIntegration(provider)
      await refreshIntegrations()
    } catch (error) {
      console.error('Failed to disconnect integration:', error)
    }
  }

  const handleSync = async (provider: string) => {
    try {
      await syncIntegration(provider)
      await refreshIntegrations()
    } catch (error) {
      console.error('Failed to sync integration:', error)
    }
  }

  const handleTest = async (provider: string) => {
    try {
      await testConnection(provider)
      // TODO: Show toast notification for successful test
      // You could show a toast notification here
    } catch (error) {
      // TODO: Show error toast notification for failed test
      // Handle connection test failure appropriately
    }
  }

  // Filter available integrations by category - use API data if available, fallback to static
  const integrationsToShow = availableIntegrations || AVAILABLE_INTEGRATIONS
  const filteredIntegrations = integrationsToShow.filter(integration => 
    selectedCategory === 'all' || integration.category === selectedCategory
  )

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(AVAILABLE_INTEGRATIONS.map(i => i.category)))]

  // Loading state
  if (integrationsLoading || availableLoading) {
    return (
      <div className="min-h-screen bg-white relative overflow-hidden">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/40" />
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="liquid-glass-accent rounded-3xl p-8 animate-pulse">
              <div className="h-8 bg-gray-200/60 rounded mb-4 w-1/3"></div>
              <div className="h-4 bg-gray-200/60 rounded w-2/3"></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
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
  if (integrationsError) {
    return (
      <div className="min-h-screen bg-white relative overflow-hidden">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/40" />
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load integrations. Please try again or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const connectedIntegrations = integrations.filter(i => i.enabled)
  const healthyIntegrations = integrations.filter(isIntegrationHealthy)

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Enhanced Apple-inspired background */}
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
                  Integrations
                </h1>
                <p className="text-base sm:text-lg text-gray-600 mt-2 leading-relaxed max-w-2xl">
                  Connect your favorite tools and unlock the full power of AI automation.
                </p>
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/25 ml-4">
                <Link className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Integration Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="liquid-glass-accent border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link className="w-5 h-5 text-blue-600" />
                  Connected
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConnectionStatus(!showConnectionStatus)}
                    className="ml-auto h-6 w-6 p-0"
                    aria-label="Toggle connection status details"
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {connectedIntegrations.length}
                </div>
                <p className="text-sm text-gray-600">Active integrations</p>
                {showConnectionStatus && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-gray-500">
                      Connection errors: {Object.keys(connectionErrors).length}
                    </p>
                    {Object.entries(connectionErrors).map(([provider, error]) => (
                      <div key={provider} className="text-xs text-red-600 mt-1">
                        {provider}: {error}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="liquid-glass-accent border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  Healthy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {healthyIntegrations.length}
                </div>
                <p className="text-sm text-gray-600">Syncing properly</p>
              </CardContent>
            </Card>

            <Card className="liquid-glass-accent border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5 text-purple-600" />
                  Available
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {AVAILABLE_INTEGRATIONS.filter(i => i.isAvailable).length}
                </div>
                <p className="text-sm text-gray-600">Ready to connect</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="connected" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="connected">Connected</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="connected" className="space-y-6">
              {connectedIntegrations.length > 0 ? (
                <div className="space-y-4">
                  {connectedIntegrations.map((integration) => {
                    const status = formatIntegrationStatus(integration.enabled ? 'active' : 'inactive')
                    const health = getIntegrationHealthStatus(integration)
                    
                    return (
                      <Card key={integration.id} className="liquid-glass-accent border-0">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                                {getIntegrationIcon(integration.provider)}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {getIntegrationDisplayName(integration.provider)}
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <Badge className={status.color}>
                                    {status.label}
                                  </Badge>
                                  <span className="text-sm text-gray-600 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatLastSync(integration.lastSync)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTest(integration.provider)}
                                disabled={operationLoading}
                                className="h-8"
                              >
                                <Activity className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSync(integration.provider)}
                                disabled={operationLoading}
                                className="h-8"
                              >
                                <RefreshCw className={`w-4 h-4 ${operationLoading ? 'animate-spin' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDisconnect(integration.provider)}
                                disabled={operationLoading}
                                className="h-8 text-red-600 hover:text-red-700"
                              >
                                <Unlink className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {health.status !== 'healthy' && (
                            <Alert className="mt-4">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                {health.message}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card className="liquid-glass-accent border-0">
                  <CardContent className="text-center py-12">
                    <Link className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Integrations Connected
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Connect your first integration to start automating your workflow.
                    </p>
                    <Button onClick={() => (document.querySelector('[value="available"]') as HTMLElement)?.click()}>
                      Browse Available Integrations
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="available" className="space-y-6">
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="h-8"
                  >
                    {category === 'all' ? 'All' : getCategoryDisplayName(category)}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredIntegrations.map((integration) => {
                  const isConnected = integrations.some(i => 
                    i.provider === integration.provider && i.enabled
                  )
                  
                  return (
                    <Card key={integration.provider} className="liquid-glass-accent border-0 h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                              {integration.icon}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{integration.name}</CardTitle>
                              <Badge variant="outline" className="text-xs">
                                {getCategoryDisplayName(integration.category)}
                              </Badge>
                            </div>
                          </div>
                          {isConnected && (
                            <Badge className="text-green-600 bg-green-50 border-green-200">
                              <Check className="w-3 h-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                          {integration.comingSoon && (
                            <Badge variant="outline">
                              Coming Soon
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-gray-600">
                          {integration.description}
                        </p>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2">Features:</h4>
                          <ul className="space-y-1 text-xs text-gray-600">
                            {integration.features.slice(0, 3).map((feature, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-green-600" />
                                {feature}
                              </li>
                            ))}
                            {integration.features.length > 3 && (
                              <li className="text-gray-500">
                                +{integration.features.length - 3} more features
                              </li>
                            )}
                          </ul>
                        </div>
                        
                        <div className="pt-2">
                          {isConnected ? (
                            <Button 
                              variant="outline" 
                              className="w-full"
                              disabled
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Connected
                            </Button>
                          ) : integration.isAvailable ? (
                            <Button 
                              className="w-full"
                              onClick={() => handleConnect(integration.provider)}
                              disabled={operationLoading || oauthInProgress}
                            >
                              {operationLoading || oauthInProgress ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                              ) : (
                                <Plus className="w-4 h-4 mr-2" />
                              )}
                              Connect
                            </Button>
                          ) : (
                            <Button variant="outline" className="w-full" disabled>
                              Coming Soon
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card className="liquid-glass-accent border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Integration Settings
                  </CardTitle>
                  <CardDescription>
                    Manage global integration preferences and security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Security Settings
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span>Token encryption</span>
                          <Badge className="text-green-600 bg-green-50 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Enabled
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Auto token refresh</span>
                          <Badge className="text-green-600 bg-green-50 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Enabled
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Connection monitoring</span>
                          <Badge className="text-green-600 bg-green-50 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Sync Preferences
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span>Default sync frequency</span>
                          <Badge variant="outline">Hourly</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Retry failed syncs</span>
                          <Badge className="text-green-600 bg-green-50 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Enabled
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Sync notifications</span>
                          <Badge variant="outline">Errors only</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Need Help?</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Having trouble with integrations? Our support team can help you get connected.
                    </p>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}