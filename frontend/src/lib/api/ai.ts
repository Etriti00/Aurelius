import { useState } from 'react'
import useSWR from 'swr'
import { apiClient } from './client'
import { AIResponse, AISuggestion, AICommand, UsageMetrics } from './types'

// API endpoints
const AI_ENDPOINT = '/ai-gateway'

// API functions
export const aiApi = {
  // Process AI command
  processCommand: (command: AICommand) =>
    apiClient.post<AIResponse>(`${AI_ENDPOINT}/process`, command),

  // Generate AI response
  generateResponse: (prompt: string, systemPrompt?: string, maxTokens?: number) =>
    apiClient.post<AIResponse>(`${AI_ENDPOINT}/generate`, {
      prompt,
      systemPrompt,
      maxTokens,
    }),

  // Get AI suggestions
  getSuggestions: () => apiClient.get<AISuggestion[]>(`${AI_ENDPOINT}/suggestions`),

  // Get usage statistics
  getUsage: () => apiClient.get<UsageMetrics>(`${AI_ENDPOINT}/usage`),

  // Generate embeddings
  generateEmbedding: (text: string) =>
    apiClient.post<number[]>(`${AI_ENDPOINT}/embeddings`, { text }),

  // Semantic search
  semanticSearch: (query: string, limit = 10) =>
    apiClient.post(`${AI_ENDPOINT}/search`, { query, limit }),
}

// SWR Hooks
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

export const useUsageMetrics = () => {
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

// AI Command Processing Hook
export const useAICommand = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (params: { command: string; context?: Record<string, unknown> }) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await aiApi.processCommand(params)
      setIsLoading(false)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute command'
      setError(errorMessage)
      setIsLoading(false)
      throw error
    }
  }

  const processCommand = async (command: string, context?: Record<string, unknown>) => {
    return execute({ command, context })
  }

  const generateResponse = async (prompt: string, systemPrompt?: string, maxTokens?: number) => {
    try {
      const response = await aiApi.generateResponse(prompt, systemPrompt, maxTokens)
      return response
    } catch (error) {
      console.error('Failed to generate AI response:', error)
      throw error
    }
  }

  return {
    execute,
    processCommand,
    generateResponse,
    isLoading,
    error,
  }
}

// Helper functions
export const formatAIResponse = (response: AIResponse) => {
  return {
    content: response.content,
    tokens: response.tokens,
    cost: response.cost,
    cached: response.cached,
    formattedCost: `$${response.cost.toFixed(4)}`,
    efficiency: response.cached ? 'Cached' : 'Generated',
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

export const getSuggestionColor = (priority: AISuggestion['priority']) => {
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
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'email',
    title: 'Follow up with client',
    description: 'Sarah from TechCorp hasn\'t responded to your proposal from last week.',
    action: 'Send follow-up email',
    priority: 'medium',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    type: 'calendar',
    title: 'Schedule team standup',
    description: 'It\'s been 3 days since the last team meeting. Consider scheduling a check-in.',
    action: 'Create meeting',
    priority: 'low',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    type: 'insight',
    title: 'Productivity trend',
    description: 'Your task completion rate has increased 23% this week. Great momentum!',
    action: 'View details',
    priority: 'low',
    createdAt: new Date().toISOString(),
  },
]