import useSWR from 'swr'
import { apiClient } from './client'
import { CalendarEvent, CalendarAnalytics } from './types'

// API endpoints
const CALENDAR_ENDPOINT = '/calendar'

// API functions
export const calendarApi = {
  // Get all events with optional filters
  getEvents: (filters?: {
    dateRange?: { start: string; end: string }
    attendee?: string
    location?: string
    provider?: string
    isAllDay?: boolean
    search?: string
  }) => apiClient.get<CalendarEvent[]>(CALENDAR_ENDPOINT, filters),

  // Get event by ID
  getEvent: (id: string) => apiClient.get<CalendarEvent>(`${CALENDAR_ENDPOINT}/${id}`),

  // Get today's events
  getTodayEvents: () => apiClient.get<CalendarEvent[]>(`${CALENDAR_ENDPOINT}/today`),

  // Get upcoming events (next 24 hours by default)
  getUpcomingEvents: (hours = 24) => 
    apiClient.get<CalendarEvent[]>(`${CALENDAR_ENDPOINT}/upcoming`, { hours }),

  // Get calendar analytics
  getAnalytics: () => apiClient.get<CalendarAnalytics>(`${CALENDAR_ENDPOINT}/analytics`),

  // Get meeting preparation for an event
  getMeetingPreparation: (eventId: string) =>
    apiClient.get(`${CALENDAR_ENDPOINT}/${eventId}/preparation`),

  // Check for conflicts
  checkConflicts: (startTime: string, endTime: string, excludeEventId?: string) =>
    apiClient.get<CalendarEvent[]>(`${CALENDAR_ENDPOINT}/conflicts`, {
      startTime,
      endTime,
      excludeEventId,
    }),
}

// SWR Hooks
export const useCalendarEvents = (filters?: {
  dateRange?: { start: string; end: string }
  attendee?: string
  location?: string
  provider?: string
  isAllDay?: boolean
  search?: string
}) => {
  const { data, error, isLoading, mutate } = useSWR(
    [CALENDAR_ENDPOINT, filters],
    () => calendarApi.getEvents(filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds
    }
  )

  return {
    events: data,
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useCalendarEvent = (id: string) => {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `${CALENDAR_ENDPOINT}/${id}` : null,
    () => calendarApi.getEvent(id),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    event: data,
    error,
    isLoading,
    mutate,
  }
}

export const useTodayEvents = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${CALENDAR_ENDPOINT}/today`,
    calendarApi.getTodayEvents,
    {
      revalidateOnFocus: true,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  )

  return {
    events: data || [],
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useUpcomingEvents = (hours = 24) => {
  const { data, error, isLoading, mutate } = useSWR(
    [`${CALENDAR_ENDPOINT}/upcoming`, hours],
    () => calendarApi.getUpcomingEvents(hours),
    {
      revalidateOnFocus: true,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  )

  return {
    events: data || [],
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useCalendarAnalytics = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${CALENDAR_ENDPOINT}/analytics`,
    calendarApi.getAnalytics,
    {
      revalidateOnFocus: false,
      refreshInterval: 3600000, // Refresh every hour
    }
  )

  return {
    analytics: data,
    error,
    isLoading,
    mutate,
  }
}

export const useMeetingPreparation = (eventId: string) => {
  const { data, error, isLoading, mutate } = useSWR(
    eventId ? `${CALENDAR_ENDPOINT}/${eventId}/preparation` : null,
    () => calendarApi.getMeetingPreparation(eventId),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    preparation: data,
    error,
    isLoading,
    mutate,
  }
}

// Helper functions
export const getEventTypeColor = (event: CalendarEvent) => {
  if (event.isAllDay) {
    return 'bg-purple-100 text-purple-800 border-purple-200'
  }
  
  if (event.attendees.length > 5) {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }
  
  if (event.location) {
    return 'bg-green-100 text-green-800 border-green-200'
  }
  
  return 'bg-gray-100 text-gray-800 border-gray-200'
}

export const formatEventTime = (startTime: string, endTime: string, isAllDay: boolean) => {
  if (isAllDay) {
    return 'All Day'
  }
  
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }
  
  return `${formatTime(start)} - ${formatTime(end)}`
}

export const getEventDuration = (startTime: string, endTime: string) => {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const durationMs = end.getTime() - start.getTime()
  const durationHours = durationMs / (1000 * 60 * 60)
  
  if (durationHours < 1) {
    const minutes = Math.round(durationMs / (1000 * 60))
    return `${minutes}m`
  }
  
  return `${durationHours.toFixed(1)}h`
}

export const isEventSoon = (startTime: string, minutesThreshold = 15) => {
  const start = new Date(startTime)
  const now = new Date()
  const diffMs = start.getTime() - now.getTime()
  const diffMinutes = diffMs / (1000 * 60)
  
  return diffMinutes > 0 && diffMinutes <= minutesThreshold
}

export const isEventNow = (startTime: string, endTime: string) => {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const now = new Date()
  
  return now >= start && now <= end
}

export const groupEventsByDate = (events: CalendarEvent[] = []) => {
  const grouped: Record<string, CalendarEvent[]> = {}
  
  events.forEach(event => {
    const date = new Date(event.startTime).toISOString().split('T')[0]
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(event)
  })
  
  // Sort events within each date by start time
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  })
  
  return grouped
}