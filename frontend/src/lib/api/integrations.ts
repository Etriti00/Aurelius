import { useState } from 'react'
import useSWR from 'swr'
import { apiClient } from './client'
import { Integration } from './types'
import type { StandardApiResponse } from './types'

// Integration-specific types that match backend
export interface IntegrationStatus {
  id: string
  provider: string
  status: 'active' | 'inactive' | 'error' | 'syncing'
  lastSyncAt?: Date
  syncError?: string
  errorCount?: number
}

export interface ConnectIntegrationDto {
  provider: string
  authCode?: string
  redirectUri?: string
  scope?: string[]
}

export interface IntegrationConnectionResult {
  id: string
  provider: string
  status: string
  message: string
}

export interface IntegrationSyncStatus {
  provider: string
  isActive: boolean
  lastSync?: Date
  nextSync?: Date
  itemsProcessed?: number
  error?: string
}

export interface IntegrationCredentials {
  accessToken: string
  refreshToken?: string
  tokenExpiry?: Date
  tokenType?: string
  providerAccountId?: string
}

export interface IntegrationSettings {
  provider: string
  enabled: boolean
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual'
  features: {
    emailSync?: boolean
    calendarSync?: boolean
    contactsSync?: boolean
    tasksSync?: boolean
  }
  filters?: {
    labels?: string[]
    folders?: string[]
    dateRange?: {
      start?: Date
      end?: Date
    }
  }
}

export interface AvailableIntegration {
  provider: string
  name: string
  description: string
  icon: string
  category: 'productivity' | 'communication' | 'storage' | 'crm' | 'project-management'
  features: string[]
  requiredScopes: string[]
  isAvailable: boolean
  comingSoon?: boolean
}

// API endpoints
const INTEGRATIONS_ENDPOINT = '/integrations'

// Enhanced API functions matching backend
export const integrationsApi = {
  // Get user integrations
  getUserIntegrations: () =>
    apiClient.get<Integration[]>(`${INTEGRATIONS_ENDPOINT}`),

  // Get specific integration status
  getIntegrationStatus: (provider: string) =>
    apiClient.get<IntegrationStatus>(`${INTEGRATIONS_ENDPOINT}/${provider}/status`),

  // Connect new integration (OAuth flow)
  connectIntegration: (provider: string, data: ConnectIntegrationDto) =>
    apiClient.post<IntegrationConnectionResult>(`${INTEGRATIONS_ENDPOINT}/${provider}/connect`, data),

  // Disconnect integration
  disconnectIntegration: (provider: string) =>
    apiClient.delete<{ message: string }>(`${INTEGRATIONS_ENDPOINT}/${provider}`),

  // Trigger manual sync
  syncIntegration: (provider: string) =>
    apiClient.post<IntegrationSyncStatus>(`${INTEGRATIONS_ENDPOINT}/${provider}/sync`, {}),

  // Update integration settings
  updateIntegrationSettings: (provider: string, settings: Partial<IntegrationSettings>) =>
    apiClient.patch<IntegrationSettings>(`${INTEGRATIONS_ENDPOINT}/${provider}/settings`, settings),

  // Get available integrations
  getAvailableIntegrations: () =>
    apiClient.get<AvailableIntegration[]>(`${INTEGRATIONS_ENDPOINT}/available`),

  // Get OAuth authorization URL
  getAuthUrl: (provider: string, redirectUri?: string) =>
    apiClient.get<{ authUrl: string; state: string }>(`${INTEGRATIONS_ENDPOINT}/${provider}/auth-url`, {
      params: { redirectUri }
    }),

  // Exchange OAuth code for tokens
  exchangeOAuthCode: (provider: string, code: string, state: string) =>
    apiClient.post<IntegrationConnectionResult>(`${INTEGRATIONS_ENDPOINT}/${provider}/oauth/callback`, {
      code,
      state
    }),

  // Refresh integration tokens
  refreshTokens: (provider: string) =>
    apiClient.post<{ success: boolean; message: string }>(`${INTEGRATIONS_ENDPOINT}/${provider}/refresh`),

  // Test integration connection
  testConnection: (provider: string) =>
    apiClient.post<{ status: 'success' | 'failed'; message: string; details?: Record<string, unknown> }>(`${INTEGRATIONS_ENDPOINT}/${provider}/test`),
}

// Enhanced SWR Hooks
// Utility function to handle integration API responses
export const processIntegrationResponse = <T>(response: StandardApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(response.message || 'Integration operation failed')
  }
  return response.data
}

export const useUserIntegrations = () => {
  const { data, error, isLoading, mutate } = useSWR(
    INTEGRATIONS_ENDPOINT,
    integrationsApi.getUserIntegrations,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
      errorRetryCount: 3,
    }
  )

  return {
    integrations: data || [],
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useIntegrationStatus = (provider: string) => {
  const { data, error, isLoading, mutate } = useSWR(
    provider ? `${INTEGRATIONS_ENDPOINT}/${provider}/status` : null,
    () => integrationsApi.getIntegrationStatus(provider),
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
      errorRetryCount: 3,
    }
  )

  return {
    status: data,
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useAvailableIntegrations = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${INTEGRATIONS_ENDPOINT}/available`,
    integrationsApi.getAvailableIntegrations,
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
      errorRetryCount: 3,
    }
  )

  return {
    availableIntegrations: data || [],
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

// Integration management hooks
export const useIntegrationOperations = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectIntegration = async (provider: string, data: ConnectIntegrationDto) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await integrationsApi.connectIntegration(provider, data)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect integration'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const disconnectIntegration = async (provider: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await integrationsApi.disconnectIntegration(provider)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect integration'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const syncIntegration = async (provider: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await integrationsApi.syncIntegration(provider)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync integration'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const updateSettings = async (provider: string, settings: Partial<IntegrationSettings>) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await integrationsApi.updateIntegrationSettings(provider, settings)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update integration settings'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const testConnection = async (provider: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await integrationsApi.testConnection(provider)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test connection'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const getAuthUrl = async (provider: string, redirectUri?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await integrationsApi.getAuthUrl(provider, redirectUri)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get authorization URL'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const exchangeOAuthCode = async (provider: string, code: string, state: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await integrationsApi.exchangeOAuthCode(provider, code, state)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete OAuth flow'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const refreshTokens = async (provider: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await integrationsApi.refreshTokens(provider)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh tokens'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  return {
    connectIntegration,
    disconnectIntegration,
    syncIntegration,
    updateSettings,
    testConnection,
    getAuthUrl,
    exchangeOAuthCode,
    refreshTokens,
    isLoading,
    error,
  }
}

// OAuth flow helper hook
export const useOAuthFlow = () => {
  const { getAuthUrl, exchangeOAuthCode } = useIntegrationOperations()
  const [isInProgress, setIsInProgress] = useState(false)

  const initiateOAuth = async (provider: string) => {
    setIsInProgress(true)
    try {
      const redirectUri = `${window.location.origin}/integrations/oauth/callback`
      const response = await getAuthUrl(provider, redirectUri)
      
      // Store state in sessionStorage for verification
      sessionStorage.setItem(`oauth_state_${provider}`, response.state)
      
      // Redirect to OAuth provider
      window.location.href = response.authUrl
    } catch (error) {
      setIsInProgress(false)
      throw error
    }
  }

  const completeOAuth = async (provider: string, code: string, state: string) => {
    try {
      // Verify state matches
      const storedState = sessionStorage.getItem(`oauth_state_${provider}`)
      if (storedState !== state) {
        throw new Error('OAuth state mismatch. Please try again.')
      }

      const response = await exchangeOAuthCode(provider, code, state)
      
      // Clean up stored state
      sessionStorage.removeItem(`oauth_state_${provider}`)
      setIsInProgress(false)
      
      return response
    } catch (error) {
      setIsInProgress(false)
      throw error
    }
  }

  return {
    initiateOAuth,
    completeOAuth,
    isInProgress,
  }
}

// Helper functions
export const formatIntegrationStatus = (status: string): { label: string; color: string } => {
  switch (status) {
    case 'active':
      return { label: 'Connected', color: 'text-green-600 bg-green-50 border-green-200' }
    case 'inactive':
      return { label: 'Disconnected', color: 'text-gray-600 bg-gray-50 border-gray-200' }
    case 'error':
      return { label: 'Error', color: 'text-red-600 bg-red-50 border-red-200' }
    case 'syncing':
      return { label: 'Syncing', color: 'text-blue-600 bg-blue-50 border-blue-200' }
    default:
      return { label: 'Unknown', color: 'text-gray-600 bg-gray-50 border-gray-200' }
  }
}

export const getIntegrationIcon = (provider: string): string => {
  const icons: Record<string, string> = {
    google: '🔍',
    gmail: '📧',
    'google-calendar': '📅',
    'google-drive': '📁',
    microsoft: 'Ⓜ️',
    outlook: '📮',
    'microsoft-calendar': '📅',
    onedrive: '☁️',
    slack: '💬',
    teams: '👥',
    notion: '📝',
    trello: '📋',
    asana: '✅',
    salesforce: '☁️',
    hubspot: '🎯',
    zoom: '📹',
    dropbox: '📦',
    github: '🐙',
    linkedin: '💼',
  }
  return icons[provider.toLowerCase()] || '🔗'
}

export const getIntegrationDisplayName = (provider: string): string => {
  const names: Record<string, string> = {
    google: 'Google',
    gmail: 'Gmail',
    'google-calendar': 'Google Calendar',
    'google-drive': 'Google Drive',
    microsoft: 'Microsoft',
    outlook: 'Outlook',
    'microsoft-calendar': 'Microsoft Calendar',
    onedrive: 'OneDrive',
    slack: 'Slack',
    teams: 'Microsoft Teams',
    notion: 'Notion',
    trello: 'Trello',
    asana: 'Asana',
    salesforce: 'Salesforce',
    hubspot: 'HubSpot',
    zoom: 'Zoom',
    dropbox: 'Dropbox',
    github: 'GitHub',
    linkedin: 'LinkedIn',
  }
  return names[provider.toLowerCase()] || provider
}

export const getCategoryDisplayName = (category: string): string => {
  const categories: Record<string, string> = {
    productivity: 'Productivity',
    communication: 'Communication',
    storage: 'Cloud Storage',
    crm: 'Customer Relations',
    'project-management': 'Project Management',
  }
  return categories[category] || category
}

export const formatLastSync = (lastSync?: string | Date): string => {
  if (!lastSync) return 'Never'
  
  const now = new Date()
  const syncDate = new Date(lastSync)
  const diffMs = now.getTime() - syncDate.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  
  return syncDate.toLocaleDateString()
}

export const isIntegrationHealthy = (integration: Integration): boolean => {
  if (!integration.lastSync) return false
  
  const lastSync = new Date(integration.lastSync)
  const now = new Date()
  const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
  
  // Consider healthy if synced within last 24 hours and enabled
  return integration.enabled && hoursSinceSync < 24
}

export const getIntegrationHealthStatus = (integration: Integration): {
  status: 'healthy' | 'warning' | 'error'
  message: string
} => {
  if (!integration.enabled) {
    return { status: 'warning', message: 'Integration disabled' }
  }
  
  if (!integration.lastSync) {
    return { status: 'error', message: 'Never synced' }
  }
  
  const lastSync = new Date(integration.lastSync)
  const now = new Date()
  const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
  
  if (hoursSinceSync < 1) {
    return { status: 'healthy', message: 'Recently synced' }
  } else if (hoursSinceSync < 24) {
    return { status: 'healthy', message: 'Synced today' }
  } else if (hoursSinceSync < 72) {
    return { status: 'warning', message: 'Sync may be delayed' }
  } else {
    return { status: 'error', message: 'Sync failed or stopped' }
  }
}

// Available integrations data (this would typically come from the backend)
export const AVAILABLE_INTEGRATIONS: AvailableIntegration[] = [
  {
    provider: 'google',
    name: 'Google Workspace',
    description: 'Connect Gmail, Calendar, and Drive for comprehensive productivity automation',
    icon: '🔍',
    category: 'productivity',
    features: ['Email management', 'Calendar scheduling', 'File organization', 'Task automation'],
    requiredScopes: ['email', 'calendar', 'drive.readonly'],
    isAvailable: true,
  },
  {
    provider: 'microsoft',
    name: 'Microsoft 365',
    description: 'Integrate Outlook, Calendar, and OneDrive for seamless workflow management',
    icon: 'Ⓜ️',
    category: 'productivity',
    features: ['Email processing', 'Meeting coordination', 'Document management', 'Team collaboration'],
    requiredScopes: ['mail.read', 'calendars.readwrite', 'files.read'],
    isAvailable: true,
  },
  {
    provider: 'slack',
    name: 'Slack',
    description: 'Automate team communication and project updates',
    icon: '💬',
    category: 'communication',
    features: ['Message automation', 'Channel management', 'Status updates', 'Notification routing'],
    requiredScopes: ['channels:read', 'chat:write', 'users:read'],
    isAvailable: false,
    comingSoon: true,
  },
  {
    provider: 'notion',
    name: 'Notion',
    description: 'Sync tasks, notes, and project data with your Notion workspace',
    icon: '📝',
    category: 'productivity',
    features: ['Task synchronization', 'Note organization', 'Database updates', 'Page automation'],
    requiredScopes: ['read', 'write'],
    isAvailable: false,
    comingSoon: true,
  },
  {
    provider: 'salesforce',
    name: 'Salesforce',
    description: 'Automate CRM updates and lead management workflows',
    icon: '☁️',
    category: 'crm',
    features: ['Lead automation', 'Contact updates', 'Opportunity tracking', 'Report generation'],
    requiredScopes: ['api', 'refresh_token'],
    isAvailable: false,
    comingSoon: true,
  },
]