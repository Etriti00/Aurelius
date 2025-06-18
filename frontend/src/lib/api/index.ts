// Export all API modules
export * from './types'
export * from './client'
export * from './tasks'
export * from './email'
export * from './calendar'
export * from './ai'
export * from './voice'
export * from './dashboard'

// Re-export commonly used hooks and functions
export {
  // Tasks
  useTasks,
  useTask,
  useTaskStats,
  useTaskMutations,
  groupTasksByStatus,
  getPriorityColor,
  getStatusColor,
} from './tasks'

export {
  // Email
  useEmailThreads,
  useEmailThread,
  useEmailStats,
  useRecentThreads,
  useEmailMutations,
  getEmailPreview,
  formatEmailDate,
  isEmailUnread,
} from './email'

export {
  // Calendar
  useCalendarEvents,
  useTodayEvents,
  useUpcomingEvents,
  useCalendarAnalytics,
  formatEventTime,
  isEventSoon,
  getEventTypeColor,
} from './calendar'

export {
  // AI
  useAISuggestions,
  useUsageMetrics,
  useAICommand,
  formatAIResponse,
  getSuggestionIcon,
  getCommandSuggestions,
} from './ai'

export {
  // Dashboard
  useDashboardOverview,
  useDashboardOverviewOptimized,
  useUserProfile,
  useBillingUsage,
  generateDashboardCards,
  getQuickStats,
} from './dashboard'

export {
  // Voice
  useVoiceProcessing,
  useTextToSpeech,
  useAvailableVoices,
  useVoiceHistory,
  useVoiceHealth,
  formatVoiceProcessingResult,
  checkVoiceSupport,
} from './voice'

// Export API clients for direct use
export { apiClient } from './client'
export { tasksApi } from './tasks'
export { emailApi } from './email'
export { calendarApi } from './calendar'
export { aiApi } from './ai'
export { voiceApi } from './voice'
export { dashboardApi } from './dashboard'