import useSWR from 'swr'
import { apiClient } from './client'
import { EmailThread, EmailMessage, EmailStats } from './types'

// API endpoints
const EMAIL_ENDPOINT = '/email'

// API functions
export const emailApi = {
  // Get email threads with optional filters
  getThreads: (filters?: {
    isRead?: boolean
    sender?: string
    dateRange?: { start: string; end: string }
    hasAttachments?: boolean
    search?: string
    provider?: string
  }) => apiClient.get<EmailThread[]>(`${EMAIL_ENDPOINT}/threads`, filters),

  // Get thread by ID with messages
  getThread: (id: string) => apiClient.get<EmailThread>(`${EMAIL_ENDPOINT}/threads/${id}`),

  // Get messages for a specific thread
  getMessages: (threadId: string, filters?: {
    isRead?: boolean
    sender?: string
    dateRange?: { start: string; end: string }
    hasAttachments?: boolean
    search?: string
  }) => apiClient.get<EmailMessage[]>(`${EMAIL_ENDPOINT}/threads/${threadId}/messages`, filters),

  // Get email statistics
  getStats: () => apiClient.get<EmailStats>(`${EMAIL_ENDPOINT}/stats`),

  // Mark message as read
  markAsRead: (messageId: string) => 
    apiClient.patch(`${EMAIL_ENDPOINT}/messages/${messageId}/read`),

  // Mark entire thread as read
  markThreadAsRead: (threadId: string) => 
    apiClient.patch(`${EMAIL_ENDPOINT}/threads/${threadId}/read`),

  // Archive thread
  archiveThread: (threadId: string) => 
    apiClient.patch(`${EMAIL_ENDPOINT}/threads/${threadId}/archive`),

  // Get thread analysis with AI insights
  getThreadAnalysis: (threadId: string) =>
    apiClient.get(`${EMAIL_ENDPOINT}/threads/${threadId}/analysis`),

  // Generate AI response for thread
  generateResponse: (threadId: string, context?: string) =>
    apiClient.post(`${EMAIL_ENDPOINT}/threads/${threadId}/response`, { context }),

  // Search emails
  searchEmails: (query: string, limit = 20) =>
    apiClient.get<EmailMessage[]>(`${EMAIL_ENDPOINT}/search`, { query, limit }),
}

// SWR Hooks
export const useEmailThreads = (filters?: {
  isRead?: boolean
  sender?: string
  dateRange?: { start: string; end: string }
  hasAttachments?: boolean
  search?: string
  provider?: string
}) => {
  const { data, error, isLoading, mutate } = useSWR(
    [`${EMAIL_ENDPOINT}/threads`, filters],
    () => emailApi.getThreads(filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds
    }
  )

  return {
    threads: data || [],
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useEmailThread = (id: string) => {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `${EMAIL_ENDPOINT}/threads/${id}` : null,
    () => emailApi.getThread(id),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    thread: data,
    error,
    isLoading,
    mutate,
  }
}

export const useEmailStats = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${EMAIL_ENDPOINT}/stats`,
    emailApi.getStats,
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  )

  return {
    stats: data,
    error,
    isLoading,
    mutate,
  }
}

export const useRecentThreads = (limit = 10) => {
  const { data, error, isLoading, mutate } = useSWR(
    [`${EMAIL_ENDPOINT}/threads`, { limit }],
    () => emailApi.getThreads(),
    {
      revalidateOnFocus: true,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  )

  return {
    threads: data?.slice(0, limit) || [],
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useThreadAnalysis = (threadId: string) => {
  const { data, error, isLoading, mutate } = useSWR(
    threadId ? `${EMAIL_ENDPOINT}/threads/${threadId}/analysis` : null,
    () => emailApi.getThreadAnalysis(threadId),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    analysis: data,
    error,
    isLoading,
    mutate,
  }
}

// Helper functions for email mutations
export const useEmailMutations = () => {
  const markAsRead = async (messageId: string) => {
    try {
      await emailApi.markAsRead(messageId)
      // SWR will automatically revalidate related queries
    } catch (error) {
      console.error('Failed to mark message as read:', error)
      throw error
    }
  }

  const markThreadAsRead = async (threadId: string) => {
    try {
      await emailApi.markThreadAsRead(threadId)
    } catch (error) {
      console.error('Failed to mark thread as read:', error)
      throw error
    }
  }

  const archiveThread = async (threadId: string) => {
    try {
      await emailApi.archiveThread(threadId)
    } catch (error) {
      console.error('Failed to archive thread:', error)
      throw error
    }
  }

  const generateResponse = async (threadId: string, context?: string) => {
    try {
      const response = await emailApi.generateResponse(threadId, context)
      return response
    } catch (error) {
      console.error('Failed to generate email response:', error)
      throw error
    }
  }

  return {
    markAsRead,
    markThreadAsRead,
    archiveThread,
    generateResponse,
  }
}

// Helper functions
export const getEmailPreview = (body: string, maxLength = 100) => {
  // Strip HTML tags and get plain text preview
  const plainText = body.replace(/<[^>]*>/g, '').trim()
  if (plainText.length <= maxLength) {
    return plainText
  }
  return plainText.substring(0, maxLength) + '...'
}

export const getThreadParticipants = (thread: EmailThread, maxShow = 3) => {
  const participants = thread.participants
  if (participants.length <= maxShow) {
    return participants.join(', ')
  }
  
  const shown = participants.slice(0, maxShow).join(', ')
  const remaining = participants.length - maxShow
  return `${shown} and ${remaining} other${remaining === 1 ? '' : 's'}`
}

export const isEmailUnread = (message: EmailMessage) => {
  return !message.isRead
}

export const isThreadUnread = (thread: EmailThread) => {
  return thread.messages?.some(message => !message.isRead) || false
}

export const getEmailSender = (message: EmailMessage) => {
  const email = message.sender
  // Extract name from email if it contains name
  const match = email.match(/^(.*?)\s*<(.+)>$/)
  if (match) {
    return match[1].trim() || match[2]
  }
  return email
}

export const formatEmailDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    // Today - show time
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }
}

export const getEmailImportance = (message: EmailMessage) => {
  // Simple heuristic to determine email importance
  const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'important']
  const content = (message.subject + ' ' + message.body).toLowerCase()
  
  if (urgentKeywords.some(keyword => content.includes(keyword))) {
    return 'high'
  }
  
  if (message.attachments && message.attachments.length > 0) {
    return 'medium'
  }
  
  return 'normal'
}

export const groupThreadsByDate = (threads: EmailThread[] = []) => {
  const grouped: Record<string, EmailThread[]> = {}
  
  threads.forEach(thread => {
    const date = new Date(thread.lastMessageAt).toISOString().split('T')[0]
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(thread)
  })
  
  // Sort threads within each date by last message time (most recent first)
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    )
  })
  
  return grouped
}