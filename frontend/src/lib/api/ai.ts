import { useState } from 'react'
import useSWR from 'swr'
import { apiClient } from './client'
import { 
  AIResponse, 
  AISuggestion, 
  AICommand, 
  ProcessRequestDto,
  GenerateSuggestionsDto,
  AnalyzeEmailDto,
  DraftEmailDto,
  AIUsageStats,
  AIHealthCheck,
  EmailAnalysisResult,
  DraftedEmail
} from './types'

// API endpoints
const AI_ENDPOINT = '/ai-gateway'

// Enhanced API functions matching new backend
export const aiApi = {
  // Process AI request with smart model selection
  processRequest: (data: ProcessRequestDto) =>
    apiClient.post<AIResponse>(`${AI_ENDPOINT}/process`, data),

  // Generate proactive suggestions
  generateSuggestions: (data: GenerateSuggestionsDto) =>
    apiClient.post<{ suggestions: string[] }>(`${AI_ENDPOINT}/suggestions`, data),

  // Analyze email thread for insights
  analyzeEmail: (data: AnalyzeEmailDto) =>
    apiClient.post<EmailAnalysisResult>(`${AI_ENDPOINT}/analyze-email`, data),

  // Draft email based on context
  draftEmail: (data: DraftEmailDto) =>
    apiClient.post<DraftedEmail>(`${AI_ENDPOINT}/draft-email`, data),

  // Get AI usage statistics
  getUsage: () => apiClient.get<AIUsageStats>(`${AI_ENDPOINT}/usage`),

  // Check AI gateway health
  healthCheck: () => apiClient.get<AIHealthCheck>(`${AI_ENDPOINT}/health`),

  // Legacy API methods for backwards compatibility
  processCommand: (command: AICommand) =>
    apiClient.post<AIResponse>(`${AI_ENDPOINT}/process`, {
      prompt: command.command,
      context: command.context,
      action: 'command_processing',
    }),

  generateResponse: (prompt: string, systemPrompt?: string, maxTokens?: number) =>
    aiApi.processRequest({
      prompt,
      systemPrompt,
      metadata: { maxTokens },
      action: 'generate_response',
    }),

  getSuggestions: () => 
    aiApi.generateSuggestions({}).then(response => response.suggestions.map((suggestion, index) => ({
      id: `suggestion-${index}`,
      type: 'insight' as const,
      title: suggestion,
      description: '',
      action: 'view',
      priority: 'medium' as const,
      confidence: 0.8,
      createdAt: new Date().toISOString(),
    }))),
}

// Enhanced SWR Hooks
export const useAISuggestions = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${AI_ENDPOINT}/suggestions`,
    aiApi.getSuggestions,
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
      dedupingInterval: 30000, // 30 seconds
    }
  )

  return {
    suggestions: data || [],
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

export const useAIUsageStats = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${AI_ENDPOINT}/usage`,
    aiApi.getUsage,
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
    refresh: () => mutate(),
  }
}

export const useAIHealthCheck = () => {
  const { data, error, isLoading, mutate } = useSWR(
    `${AI_ENDPOINT}/health`,
    aiApi.healthCheck,
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  )

  return {
    health: data,
    error,
    isLoading,
    mutate,
    refresh: () => mutate(),
  }
}

// Legacy hook for backwards compatibility
export const useUsageMetrics = useAIUsageStats

// Enhanced AI Processing Hooks
export const useAIProcessing = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processRequest = async (data: ProcessRequestDto) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await aiApi.processRequest(data)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process request'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const analyzeEmail = async (emailContent: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await aiApi.analyzeEmail({ emailContent })
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze email'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const draftEmail = async (data: DraftEmailDto) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await aiApi.draftEmail(data)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to draft email'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const generateSuggestions = async (context?: Record<string, unknown>) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await aiApi.generateSuggestions({ context })
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate suggestions'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  return {
    processRequest,
    analyzeEmail,
    draftEmail,
    generateSuggestions,
    isLoading,
    error,
  }
}

// Legacy AI Command Processing Hook for backwards compatibility
export const useAICommand = () => {
  const { processRequest, isLoading, error } = useAIProcessing()

  const execute = async (params: { command: string; context?: Record<string, unknown> }) => {
    return processRequest({
      prompt: params.command,
      context: params.context,
      action: 'command_processing',
    })
  }

  const processCommand = async (command: string, context?: Record<string, unknown>) => {
    return execute({ command, context })
  }

  const generateResponse = async (prompt: string, systemPrompt?: string, maxTokens?: number) => {
    return processRequest({
      prompt,
      systemPrompt,
      metadata: { maxTokens },
      action: 'generate_response',
    })
  }

  return {
    execute,
    processCommand,
    generateResponse,
    isLoading,
    error,
  }
}

// Enhanced Helper functions
export const formatAIResponse = (response: AIResponse) => {
  return {
    content: response.content,
    tokens: response.tokens,
    cost: response.cost,
    cached: response.cached,
    model: response.model,
    processingTime: response.processingTime,
    timestamp: response.timestamp,
    formattedCost: `$${response.cost.toFixed(4)}`,
    efficiency: response.cached ? 'Cached' : 'Generated',
    formattedProcessingTime: `${response.processingTime}ms`,
  }
}

export const formatEmailAnalysis = (analysis: EmailAnalysisResult) => {
  return {
    ...analysis,
    formattedActionItems: analysis.actionItems.map(item => ({
      ...item,
      priorityColor: getSuggestionColor(item.priority),
      formattedDueDate: item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date',
    })),
    sentimentColor: {
      positive: 'text-green-600 bg-green-50',
      neutral: 'text-gray-600 bg-gray-50',
      negative: 'text-red-600 bg-red-50',
    }[analysis.sentiment],
    urgencyColor: getSuggestionColor(analysis.urgency),
  }
}

export const formatDraftedEmail = (draft: DraftedEmail) => {
  return {
    ...draft,
    confidencePercentage: Math.round(draft.confidence * 100),
    confidenceColor: draft.confidence >= 0.8 ? 'text-green-600' : 
                    draft.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600',
    wordCount: draft.body.split(' ').length,
  }
}

export const formatUsageStats = (stats: AIUsageStats) => {
  const percentage = (stats.actionsUsed / stats.actionsLimit) * 100
  return {
    ...stats,
    usagePercentage: Math.round(percentage),
    isNearLimit: percentage >= 80,
    isAtLimit: stats.actionsUsed >= stats.actionsLimit,
    formattedCost: `$${stats.costThisPeriod.toFixed(4)}`,
    formattedPeriod: `${new Date(stats.periodStart).toLocaleDateString()} - ${new Date(stats.periodEnd).toLocaleDateString()}`,
    usageColor: getUsageColor(percentage),
  }
}

export const getSuggestionIcon = (type: AISuggestion['type']) => {
  switch (type) {
    case 'task':
      return '✅'
    case 'email':
      return '📧'
    case 'calendar':
      return '📅'
    case 'insight':
      return '💡'
    default:
      return '🤖'
  }
}

export const getSuggestionColor = (priority: 'high' | 'medium' | 'low') => {
  switch (priority) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export const formatUsagePercentage = (used: number, limit: number) => {
  if (limit === 0) return 0
  return Math.round((used / limit) * 100)
}

export const getUsageColor = (percentage: number) => {
  if (percentage >= 90) return 'text-red-600 bg-red-100'
  if (percentage >= 80) return 'text-yellow-600 bg-yellow-100'
  if (percentage >= 60) return 'text-blue-600 bg-blue-100'
  return 'text-green-600 bg-green-100'
}

export const isUsageAtLimit = (used: number, limit: number) => {
  return used >= limit
}

export const getUsageWarningLevel = (used: number, limit: number) => {
  const percentage = (used / limit) * 100
  if (percentage >= 100) return 'critical'
  if (percentage >= 90) return 'warning'
  if (percentage >= 80) return 'caution'
  return 'normal'
}

// AI Command suggestions for the command modal
export const getCommandSuggestions = async (input: string): Promise<string[]> => {
  // For now, return contextual suggestions based on input
  // In the future, this can be replaced with actual AI-generated suggestions
  const suggestions = [
    {
      command: 'Create a task to review quarterly reports',
      description: 'Creates a new task with AI-generated details',
      category: 'Tasks',
    },
    {
      command: 'Schedule a meeting with the team for next week',
      description: 'Suggests meeting times and creates calendar event',
      category: 'Calendar',
    },
    {
      command: 'Summarize my unread emails',
      description: 'Provides AI summary of important unread messages',
      category: 'Email',
    },
    {
      command: 'What should I prioritize today?',
      description: 'AI analysis of your schedule and tasks',
      category: 'Insights',
    },
    {
      command: 'Draft a response to the latest client email',
      description: 'Generates a professional email response',
      category: 'Email',
    },
    {
      command: 'Create project milestones for Q1',
      description: 'Generates task breakdown for project planning',
      category: 'Tasks',
    },
  ]

  // Filter suggestions based on input
  const filtered = suggestions
    .filter(s => s.command.toLowerCase().includes(input.toLowerCase()) || 
                 s.category.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 3)
    .map(s => s.command)

  // If no matches, return enhanced versions of the input
  if (filtered.length === 0) {
    return [
      `${input} with AI assistance`,
      `${input} for tomorrow`,
      `${input} and send notification`,
    ]
  }

  return filtered
}

// Mock AI suggestions generator (can be replaced with real API data)
export const generateMockSuggestions = (): AISuggestion[] => [
  {
    id: '1',
    type: 'task',
    title: 'Review quarterly budget',
    description: 'You have a budget meeting tomorrow. Consider reviewing the Q4 numbers beforehand.',
    action: 'Create review task',
    priority: 'high',
    confidence: 0.9,
    reasoning: 'Based on your calendar analysis, you have a budget meeting scheduled.',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'email',
    title: 'Follow up with client',
    description: 'Sarah from TechCorp hasn\'t responded to your proposal from last week.',
    action: 'Send follow-up email',
    priority: 'medium',
    confidence: 0.8,
    reasoning: 'Email thread analysis shows no response after 7 days.',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    type: 'calendar',
    title: 'Schedule team standup',
    description: 'It\'s been 3 days since the last team meeting. Consider scheduling a check-in.',
    action: 'Create meeting',
    priority: 'low',
    confidence: 0.7,
    reasoning: 'Pattern analysis shows regular meeting intervals.',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    type: 'insight',
    title: 'Productivity trend',
    description: 'Your task completion rate has increased 23% this week. Great momentum!',
    action: 'View details',
    priority: 'low',
    confidence: 0.95,
    reasoning: 'Statistical analysis of completed tasks over time.',
    createdAt: new Date().toISOString(),
  },
]