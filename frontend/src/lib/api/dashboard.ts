import useSWR from 'swr'
import { apiClient } from './client'
import { DashboardOverview, UsageMetrics, TaskStats, EmailStats, CalendarAnalytics } from './types'
import { useTaskStats } from './tasks'
import { useEmailStats } from './email'
import { useCalendarAnalytics } from './calendar'
import { useUsageMetrics } from './ai'

// API endpoints
const DASHBOARD_ENDPOINT = '/dashboard'
const BILLING_ENDPOINT = '/billing'

// API functions
export const dashboardApi = {
  // Get complete dashboard overview
  getOverview: () => apiClient.get<DashboardOverview>(`${DASHBOARD_ENDPOINT}/overview`),

  // Get user profile
  getProfile: () => apiClient.get('/users/profile'),

  // Get billing usage
  getUsage: () => apiClient.get<UsageMetrics>(`${BILLING_ENDPOINT}/usage`),
}

// Combined dashboard data hook
export const useDashboardOverview = () => {
  const { stats: taskStats, isLoading: tasksLoading, error: tasksError } = useTaskStats()
  const { stats: emailStats, isLoading: emailLoading, error: emailError } = useEmailStats()
  const { analytics: calendarStats, isLoading: calendarLoading, error: calendarError } = useCalendarAnalytics()
  const { usage: usageMetrics, isLoading: usageLoading, error: usageError } = useUsageMetrics()

  const isLoading = tasksLoading || emailLoading || calendarLoading || usageLoading
  const error = tasksError || emailError || calendarError || usageError

  return {
    overview: {
      tasksStats: taskStats,
      emailStats,
      calendarStats,
      usageMetrics,
    },
    isLoading,
    error,
    refresh: () => {
      // All individual hooks will refresh their data
    },
  }
}

// Optimized dashboard overview with single API call
export const useDashboardOverviewOptimized = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${DASHBOARD_ENDPOINT}/overview`,
    dashboardApi.getOverview,
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
      dedupingInterval: 30000, // 30 seconds
    }
  )

  return {
    overview: data,
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useUserProfile = () => {
  const { data, error, isLoading, mutate } = useSWR(
    '/users/profile',
    dashboardApi.getProfile,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    profile: data,
    error,
    isLoading,
    mutate,
  }
}

export const useBillingUsage = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${BILLING_ENDPOINT}/usage`,
    dashboardApi.getUsage,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
    }
  )

  return {
    usage: data,
    error,
    isLoading,
    mutate,
  }
}

// Helper functions for dashboard cards
export interface DashboardCard {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: string
  color: string
}

export const generateDashboardCards = (
  taskStats?: TaskStats,
  emailStats?: EmailStats,
  calendarStats?: CalendarAnalytics,
  usageMetrics?: UsageMetrics
): DashboardCard[] => {
  const cards: DashboardCard[] = []

  // Tasks card
  if (taskStats) {
    cards.push({
      title: "Today's Tasks",
      value: taskStats.dueToday || 0,
      change: taskStats.total > 0 ? `${taskStats.total} total` : undefined,
      trend: 'neutral',
      icon: '✅',
      color: 'text-blue-600 bg-blue-50',
    })
  }

  // Email card
  if (emailStats) {
    cards.push({
      title: 'Unread Emails',
      value: emailStats.unreadCount || 0,
      change: emailStats.todayCount > 0 ? `${emailStats.todayCount} today` : undefined,
      trend: emailStats.unreadCount > 5 ? 'up' : 'neutral',
      icon: '📧',
      color: 'text-green-600 bg-green-50',
    })
  }

  // Calendar card
  if (calendarStats) {
    cards.push({
      title: 'Meetings Today',
      value: calendarStats.todayEvents || 0,
      change: calendarStats.upcomingEvents > 0 ? `${calendarStats.upcomingEvents} upcoming` : undefined,
      trend: 'neutral',
      icon: '📅',
      color: 'text-purple-600 bg-purple-50',
    })
  }

  // AI Usage card
  if (usageMetrics) {
    const percentage = Math.round((usageMetrics.aiActionsUsed / usageMetrics.aiActionsLimit) * 100)
    cards.push({
      title: 'AI Actions',
      value: usageMetrics.aiActionsUsed || 0,
      change: `${percentage}% used`,
      trend: percentage > 80 ? 'up' : percentage > 60 ? 'neutral' : 'down',
      icon: '🤖',
      color: 'text-orange-600 bg-orange-50',
    })
  }

  return cards
}

export const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
  switch (trend) {
    case 'up':
      return '↗️'
    case 'down':
      return '↘️'
    case 'neutral':
    default:
      return '→'
  }
}

export const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
  switch (trend) {
    case 'up':
      return 'text-red-600'
    case 'down':
      return 'text-green-600'
    case 'neutral':
    default:
      return 'text-gray-600'
  }
}

// Quick stats for dashboard widgets
export const getQuickStats = (
  taskStats?: TaskStats,
  emailStats?: EmailStats,
  calendarStats?: CalendarAnalytics
) => {
  return {
    productivity: {
      tasksCompleted: taskStats?.byStatus?.COMPLETED || 0,
      meetingHours: calendarStats?.meetingHours?.today || 0,
      emailsProcessed: emailStats?.todayCount || 0,
    },
    upcoming: {
      tasksDue: taskStats?.dueToday || 0,
      meetings: calendarStats?.todayEvents || 0,
      unreadEmails: emailStats?.unreadCount || 0,
    },
    trends: {
      taskCompletion: 'stable', // This would be calculated from historical data
      emailVolume: (emailStats?.todayCount ?? 0) > 10 ? 'high' : 'normal',
      meetingLoad: (calendarStats?.meetingHours?.today ?? 0) > 4 ? 'heavy' : 'light',
    },
  }
}